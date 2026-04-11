"""
backend/src/matcher.py

Recommendation logic: wraps ChromaDB similarity search with keyword-based
matching reasons and a Claude-generated gap analysis.

Two-stage pipeline
------------------
1. **Vector stage** — query ChromaDB for the top ``top_k * 2`` candidate units
   using sentence-embedding cosine similarity (fast, ~1 ms for N < 10 000).
2. **LLM stage** — send the top-K results + job description to Claude 3.5 Sonnet
   for a concise gap analysis.  Called only once per recommendation request.
"""

from __future__ import annotations

import logging
import os
from collections import Counter

from openai import OpenAI

from backend.src.ingestor import UnitIngestor
from backend.src.models import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationResultModel,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Stop words for keyword extraction (matching reasons + gap skills)
# ---------------------------------------------------------------------------
_STOP = frozenset({
    "a", "an", "the", "and", "or", "in", "on", "to", "for", "of", "with",
    "by", "is", "are", "was", "be", "have", "has", "do", "will", "can",
    "that", "this", "it", "its", "we", "you", "they", "all", "not",
    "work", "working", "team", "role", "experience", "ability", "strong",
    "good", "required", "must", "using", "use", "based", "new", "high",
})


def _keywords(text: str, top_n: int = 12) -> list[str]:
    import re
    import string
    tokens = re.sub(r"[" + string.punctuation + r"]", " ", text.lower()).split()
    counts = Counter(t for t in tokens if len(t) >= 3 and t not in _STOP)
    return [w for w, _ in counts.most_common(top_n)]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_recommendations(
    request: RecommendationRequest,
    ingestor: UnitIngestor,
) -> RecommendationResponse:
    """
    Build a ranked list of unit recommendations for a job description.

    Parameters
    ----------
    request:
        Validated ``RecommendationRequest`` from the API layer.
    ingestor:
        Shared ``UnitIngestor`` with ChromaDB access.

    Returns
    -------
    RecommendationResponse
    """
    # --- 1. Vector search ---
    candidates = ingestor.query_similar(
        request.job_description,
        n_results=request.top_k * 2,
    )
    if not candidates:
        return RecommendationResponse(
            job_title="",
            recommendations=[],
            gap_analysis="No units are available in the catalogue yet.",
            total_units_analyzed=ingestor.count,
        )

    # --- 2. Build result objects with keyword-based matching reasons ---
    jd_kw = set(_keywords(request.job_description))
    results: list[RecommendationResultModel] = []

    for unit in candidates[: request.top_k]:
        unit_text = " ".join(unit["learning_outcomes"]) + " " + unit["content"]
        unit_kw = set(_keywords(unit_text))
        shared = sorted(jd_kw & unit_kw)[:5]

        if shared:
            reason = f"Aligned on: {', '.join(shared)}."
        else:
            first_sentence = (unit["content"] or "").split(".")[0].strip()
            reason = (
                f"Unit covers: {first_sentence[:100]}."
                if first_sentence
                else "Semantic match to job requirements."
            )

        # Gap skills = JD keywords not covered by any top unit
        gap_skills = sorted(jd_kw - unit_kw)[:5]

        results.append(
            RecommendationResultModel(
                unit_code=unit["unit_code"],
                title=unit["title"],
                score=unit["score"],
                matching_reason=reason,
                gap_skills=gap_skills,
                is_completed=unit["unit_code"] in request.completed_units,
            )
        )

    # --- 3. OpenAI gap analysis ---
    gap_analysis = _openai_gap_analysis(
        job_description=request.job_description,
        recommendations=results,
        completed_units=request.completed_units,
    )

    return RecommendationResponse(
        job_title="",          # caller can fill from job search result
        recommendations=results,
        gap_analysis=gap_analysis,
        total_units_analyzed=ingestor.count,
    )


# ---------------------------------------------------------------------------
# OpenAI integration
# ---------------------------------------------------------------------------

def _openai_gap_analysis(
    job_description: str,
    recommendations: list[RecommendationResultModel],
    completed_units: list[str],
) -> str:
    """
    Use GPT-4o-mini to produce a 2-3 sentence gap analysis.

    Falls back to a plain-text summary if the API key is absent or the call
    fails — so the endpoint always returns a usable response.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — skipping LLM gap analysis.")
        return _fallback_gap(recommendations, completed_units)

    units_summary = "\n".join(
        f"  • [{r.unit_code}] {r.title} — {r.score * 100:.0f}% match"
        for r in recommendations
    )
    completed_str = ", ".join(completed_units) if completed_units else "none"

    prompt = f"""You are an academic advisor for QUT IT students.

Job Description (excerpt):
{job_description[:800]}

Top Recommended Units:
{units_summary}

Units Already Completed: {completed_str}

Write a concise gap analysis (2-3 sentences) that:
1. Identifies which skills the recommended units address.
2. Highlights any skill gaps NOT covered by available units.
3. Gives one actionable next step.

Be encouraging, specific, and avoid generic statements."""

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error("OpenAI API call failed: %s", exc)
        return _fallback_gap(recommendations, completed_units)


def _fallback_gap(
    recommendations: list[RecommendationResultModel],
    completed_units: list[str],
) -> str:
    if not recommendations:
        return "No matching units found for this job description."
    top = recommendations[0]
    remaining = [r for r in recommendations if not r.is_completed]
    count_str = f"{len(remaining)} unit(s)" if remaining else "all recommended units"
    return (
        f"The closest match is {top.unit_code} ({top.title}, "
        f"{top.score * 100:.0f}% similarity). "
        f"Consider enrolling in {count_str} to build the required skill set. "
        f"Review each unit's learning outcomes against the job requirements for "
        f"a detailed fit assessment."
    )
