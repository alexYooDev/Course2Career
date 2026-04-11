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
