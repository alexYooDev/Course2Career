"""
backend/src/ingestor.py

Ingests QUT unit data into ChromaDB and provides query methods.

Storage layout
--------------
Collection : ``qut_units``
Documents  : learning outcomes + content joined as one string (embedded)
Metadata   : all scalar unit fields; learning_outcomes serialised as JSON
             (ChromaDB metadata values must be str/int/float/bool)
IDs        : unit_code  (upsert-safe — re-ingesting is idempotent)

Distance metric
---------------
ChromaDB's cosine space returns  distance = 1 − cosine_similarity,
so  similarity = 1 − distance  (range [0, 1]).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

logger = logging.getLogger(__name__)

COLLECTION_NAME = "qut_units"
EMBED_MODEL = "all-mpnet-base-v2"
# ChromaDB metadata strings are capped; keep content preview short.
_CONTENT_META_LIMIT = 900
_LO_META_LIMIT = 1_500


class UnitIngestor:
    """
    Manages the ``qut_units`` ChromaDB collection.

    Parameters
    ----------
    chroma_path:
        Directory where ChromaDB persists its data files.
    """

    def __init__(self, chroma_path: str = "./data/chroma") -> None:
        self._client = chromadb.PersistentClient(path=chroma_path)
        self._ef = SentenceTransformerEmbeddingFunction(
            model_name=EMBED_MODEL,
            normalize_embeddings=True,
        )
        self._col = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB ready — collection '%s' has %d document(s).",
            COLLECTION_NAME, self._col.count(),
        )

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------

    def ingest_pdf(self, pdf_path: Path) -> int:
        """
        Parse a QUT MIT course structure PDF and upsert all units found.

        The PDF has two zones:
        - Pages 1-6: course structure tables (code + title only, used to
          associate units with majors).
        - Pages 7+: unit detail blocks (code, title, prerequisites,
          credit points, description content).

        Returns the number of units upserted.
        """
        try:
            from pypdf import PdfReader  # lazy import — not required at startup
        except ImportError as exc:
            raise RuntimeError("pypdf is required for PDF ingestion. Install it with: pip install pypdf") from exc

        reader = PdfReader(str(pdf_path))
        full_text = "\n".join(page.extract_text() or "" for page in reader.pages)

        units = _parse_pdf_units(full_text)
        count = 0
        for unit_data in units:
            try:
                self.upsert_unit(unit_data)
                count += 1
                logger.debug("Ingested PDF unit %s", unit_data["unit_code"])
            except Exception as exc:
                logger.warning("Skipping PDF unit %s: %s", unit_data.get("unit_code", "?"), exc)

        logger.info("Ingested %d unit(s) from PDF %s.", count, pdf_path.name)
        return count

    def ingest_json_files(self, directory: Path) -> int:
        """
        Load every ``*.json`` file in *directory* as a unit record.

        Skips files that lack a ``unit_code`` field.  Already-existing
        entries are updated in-place (upsert).

        Returns the number of successfully ingested files.
        """
        count = 0
        for path in sorted(directory.glob("*.json")):
            try:
                with open(path, encoding="utf-8") as fh:
                    data = json.load(fh)
                self.upsert_unit(data)
                count += 1
                logger.debug("Ingested %s", path.name)
            except Exception as exc:
                logger.warning("Skipping %s: %s", path.name, exc)
        logger.info("Ingested %d unit(s) from %s.", count, directory)
        return count

    def upsert_unit(self, data: dict) -> None:
        """Upsert a single unit dict into ChromaDB."""
        unit_code = (data.get("unit_code") or "").strip().upper()
        if not unit_code:
            return

        # --- Normalise learning outcomes ---
        raw_lo = data.get("learning outcomes", data.get("learning_outcomes", []))
        learning_outcomes: list[str] = _coerce_list(raw_lo)

        # --- Normalise title ---
        title = (
            data.get("unit_name")
            or data.get("title")
            or data.get("full_title", "")
        ).strip()
        if title.upper().startswith(unit_code):
            title = title[len(unit_code):].strip()

        # --- Build embedding document ---
        outcomes_text = ". ".join(learning_outcomes)
        content = (data.get("content") or "").strip()
        document = " ".join(filter(None, [outcomes_text, content])) or unit_code

        self._col.upsert(
            ids=[unit_code],
            documents=[document],
            metadatas=[{
                "unit_code": unit_code,
                "title": title,
                "credit_points": str(data.get("credit_points", "")),
                "pre_requisite": str(data.get("pre_requisite", "")),
                "study_period": str(data.get("requested_study_period_code", "")),
                "year": str(data.get("requested_year", "")),
                # Serialise lists as JSON strings (ChromaDB limitation)
                "learning_outcomes": json.dumps(learning_outcomes)[:_LO_META_LIMIT],
                "content": content[:_CONTENT_META_LIMIT],
            }],
        )

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def get_all_units(self) -> list[dict]:
        """Return every unit as a plain dict (no embeddings)."""
        result = self._col.get(include=["metadatas"])
        return [_meta_to_dict(m) for m in (result.get("metadatas") or [])]

    def query_similar(self, text: str, n_results: int = 10) -> list[dict]:
        """
        Return up to *n_results* units most similar to *text*, each with a
        ``score`` field (cosine similarity, 0–1).
        """
        total = self._col.count()
        if total == 0:
            return []
        n = min(n_results, total)
        results = self._col.query(
            query_texts=[text],
            n_results=n,
            include=["metadatas", "distances"],
        )
        units = []
        for meta, dist in zip(
            (results.get("metadatas") or [[]])[0],
            (results.get("distances") or [[]])[0],
        ):
            unit = _meta_to_dict(meta)
            # distance = 1 − cosine_similarity  →  similarity = 1 − distance
            unit["score"] = round(max(0.0, 1.0 - dist), 4)
            units.append(unit)
        return units

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    @property
    def count(self) -> int:
        return self._col.count()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _coerce_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if v]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


# Labels that separate metadata fields in the detail block
_META_LABELS = re.compile(
    r'^(Pre-requisites|Anti-requisites|Equivalents|Credit Points)\s*',
    re.IGNORECASE,
)

_PAGE_NOISE = re.compile(
    r'^(Master of Information Technology|View unit details online)',
    re.IGNORECASE,
)


def _parse_pdf_units(text: str) -> list[dict]:
    """
    Extract unit detail records from QUT MIT course structure PDF text.

    Strategy
    --------
    Unit detail blocks live on pages 7+ and always end with
    "View unit timetable".  We split the full text on that sentinel,
    then parse each chunk backwards to find the unit code header.
    This avoids picking up the course-structure table entries
    on pages 1-6 (which never have the sentinel).
    """
    # Each real unit detail block ends with this exact line
    raw_blocks = re.split(r'View unit timetable', text)

    units: dict[str, dict] = {}

    for block_num, raw in enumerate(raw_blocks):
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        if not lines:
            continue

        # Locate the unit code header line.
        # blocks[1..N]: header is at the top — scan forwards.
        # blocks[0]: contains all course-structure table pages before the
        #            first unit detail block; the real header is near the
        #            bottom — scan backwards.
        header_idx = None
        if block_num == 0:
            # Backward scan: find the LAST unit-code line followed by a meta
            # label within 8 lines (distinguishes detail header from table ref)
            for i in range(len(lines) - 1, -1, -1):
                if not re.match(r'^([A-Z]{2,3}[0-9]{3})\s+\S', lines[i]):
                    continue
                lookahead = lines[i + 1: i + 9]
                if any(_META_LABELS.match(ln) for ln in lookahead):
                    header_idx = i
                    break
        else:
            # Forward scan: the first unit-code line is the header
            for i, line in enumerate(lines):
                if re.match(r'^([A-Z]{2,3}[0-9]{3})\s+\S', line):
                    header_idx = i
                    break

        if header_idx is None:
            continue

        # --- Parse title (may wrap to next line) ---
        m = re.match(r'^([A-Z]{2,3}[0-9]{3})\s+(.*)', lines[header_idx])
        if not m:
            continue
        unit_code = m.group(1)
        title_parts = [m.group(2).strip()]
        idx = header_idx + 1
        while idx < len(lines):
            nxt = lines[idx]
            if _META_LABELS.match(nxt) or _PAGE_NOISE.match(nxt) or re.match(r'^[A-Z]{2,3}[0-9]{3}', nxt):
                break
            title_parts.append(nxt)
            idx += 1
        title = " ".join(filter(None, title_parts)).strip()

        # --- Parse metadata + content after title ---
        pre_req = ""
        credit_points = ""
        content_parts: list[str] = []

        while idx < len(lines):
            line = lines[idx]
            idx += 1
            if _PAGE_NOISE.match(line):
                continue
            lm = _META_LABELS.match(line)
            if lm:
                label = lm.group(1).lower().replace("-", "_").replace(" ", "_")
                inline_val = line[lm.end():].strip()

                if "credit" in label:
                    # Credit Points always has a short inline numeric value.
                    # Everything after this line is content — stop meta parsing.
                    credit_points = inline_val
                    # Remaining lines are content
                    while idx < len(lines):
                        ln = lines[idx]
                        idx += 1
                        if _PAGE_NOISE.match(ln):
                            continue
                        content_parts.append(ln)
                    break
                else:
                    # Multi-line value (Pre-requisites, Equivalents, Anti-requisites).
                    # Do NOT break on unit codes — pre-req text is full of them
                    # (e.g. "IFN584 or ((CAB201 or ITD121)...").
                    value_parts = [inline_val]
                    while idx < len(lines):
                        nxt = lines[idx]
                        if _META_LABELS.match(nxt):
                            break
                        value_parts.append(nxt)
                        idx += 1
                    value = " ".join(value_parts).strip()
                    if "pre_req" in label:
                        pre_req = value
            else:
                content_parts.append(line)

        content = " ".join(content_parts).strip()

        # Only keep records that have real content (skip degenerate blocks)
        if not content:
            continue

        # Keep whichever parse has more content for the same code
        if unit_code not in units or len(content) > len(units[unit_code].get("content", "")):
            units[unit_code] = {
                "unit_code": unit_code,
                "title": title,
                "pre_requisite": pre_req,
                "credit_points": credit_points,
                "content": content,
                "learning_outcomes": [],
            }

    return list(units.values())


def _meta_to_dict(meta: dict) -> dict:
    lo_raw = meta.get("learning_outcomes", "[]")
    try:
        learning_outcomes = json.loads(lo_raw)
    except (json.JSONDecodeError, TypeError):
        learning_outcomes = []
    return {
        "unit_code": meta.get("unit_code", ""),
        "title": meta.get("title", ""),
        "learning_outcomes": learning_outcomes,
        "content": meta.get("content", ""),
        "credit_points": meta.get("credit_points", ""),
        "pre_requisite": meta.get("pre_requisite", ""),
        "study_period": meta.get("study_period", ""),
        "year": meta.get("year", ""),
    }
