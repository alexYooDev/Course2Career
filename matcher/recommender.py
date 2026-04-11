"""Cosine-similarity recommendation engine over pre-embedded unit vectors."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

import numpy as np

from .embedder import embed, embed_batch
from .preprocessor import clean_for_embedding, extract_keywords

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLD: float = 0.25
_KW_COUNT = 8
_KW_MIN   = 2


@dataclass
class UnitRecord:
    unit_code: str
    title: str
    learning_outcomes: list[str] = field(default_factory=list)
    content: str = ""

    @classmethod
    def from_dict(cls, d: dict) -> "UnitRecord":
        raw_lo = d.get("learning outcomes", d.get("learning_outcomes", []))
        lo = [str(v).strip() for v in raw_lo] if isinstance(raw_lo, list) else ([raw_lo.strip()] if raw_lo else [])
        title = (d.get("unit_name") or d.get("title") or d.get("full_title", "")).strip()
        code = (d.get("unit_code") or "").strip().upper()
        if title.upper().startswith(code):
            title = title[len(code):].strip()
        return cls(unit_code=code, title=title, learning_outcomes=lo,
                   content=(d.get("content") or "").strip())

    def to_embedding_text(self) -> str:
        parts = filter(None, [". ".join(self.learning_outcomes), self.content])
        return clean_for_embedding(" ".join(parts))


@dataclass
class RecommendationResult:
    unit_code: str
    title: str
    score: float
    matching_reason: str


class Recommender:
    def __init__(self, units: list[UnitRecord], similarity_threshold: float = DEFAULT_THRESHOLD) -> None:
        if not units:
            raise ValueError("Need at least one UnitRecord.")
        self._units = units
        self._threshold = similarity_threshold
        self._matrix: np.ndarray = embed_batch([u.to_embedding_text() for u in units])

    def recommend(self, job_text: str, top_k: int = 3) -> list[RecommendationResult]:
        clean = clean_for_embedding(job_text)
        if not clean:
            return []
        job_vec = embed(clean)
        scores  = self._matrix @ job_vec

        qualified = np.where(scores >= self._threshold)[0]
        if qualified.size == 0:
            qualified = np.argsort(scores)[::-1][:top_k]
        ranked = qualified[np.argsort(scores[qualified])[::-1]][:top_k]

        jd_kw = set(extract_keywords(job_text, _KW_COUNT))
        results = []
        for idx in ranked:
            unit  = self._units[idx]
            score = float(scores[idx])
            ut    = " ".join(unit.learning_outcomes) + " " + unit.content
            shared = sorted(jd_kw & set(extract_keywords(ut, _KW_COUNT)))[:5]
            reason = (f"Aligned on: {', '.join(shared)}." if len(shared) >= _KW_MIN
                      else f"Unit covers: {(unit.content or '').split('.')[0][:100]}.")
            results.append(RecommendationResult(unit_code=unit.unit_code, title=unit.title,
                                                score=round(score, 4), matching_reason=reason))
        return results
