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

import json as _json
import logging
import os
from collections import Counter
from urllib.parse import quote_plus

from openai import OpenAI

from backend.src.ingestor import UnitIngestor
from backend.src.models import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationResultModel,
    StudyResource,
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

    # --- 3. OpenAI analysis (gap + next-semester plan + resources) ---
    llm_result = _openai_analysis(
        job_description=request.job_description,
        recommendations=results,
        completed_units=request.completed_units,
        program=request.program,
        major=request.major,
        year_of_study=request.year_of_study,
    )

    return RecommendationResponse(
        job_title="",
        recommendations=results,
        gap_analysis=llm_result["gap_analysis"],
        next_semester_plan=llm_result["next_semester_plan"],
        study_resources=llm_result["study_resources"],
        total_units_analyzed=ingestor.count,
    )


# ---------------------------------------------------------------------------
# OpenAI integration
# ---------------------------------------------------------------------------

_LLM_PROMPT = """\
You are an academic advisor for QUT {program} of IT students.

Student Profile: {program} — Year {year_of_study}{major_str}

Job Description (excerpt):
{job_description}

Top Recommended Units:
{units_summary}

Units Already Completed: {completed_str}

Respond with a JSON object (no markdown fences) with exactly these keys:

"gap_analysis"        — 2-3 sentences: which skills the recommended units cover, \
and which skill gaps remain uncovered by the curriculum. \
Bold key skills and technologies using **keyword** markdown.

"next_semester_plan"  — 2-3 sentences: one concrete, actionable enrolment plan for the \
next semester. Name specific unit codes and explain the sequencing rationale. \
Bold unit codes (e.g. **IFN635**) and key action terms using **keyword** markdown.

"study_resources"     — array of 4-5 resources for critical gaps that the curriculum \
cannot fully fill. Each item must have:
  type        : one of "course", "youtube", "podcast", "community", "event"
  title       : name of the specific resource or channel
  provider    : platform or creator (e.g. "Coursera", "YouTube", "Spotify")
  description : one sentence on how it fills the identified gap
  url         : the direct URL to the resource (e.g. YouTube channel URL, \
Coursera course page, subreddit, podcast page). Use the real known URL. \
If unsure of the exact page, use the platform homepage (e.g. "https://www.coursera.org").

Use only real, well-known resources. Be specific and encouraging.\
"""


def _build_resource(r: dict) -> StudyResource:
    """Normalise a raw LLM resource dict into a StudyResource.

    YouTube URLs are always constructed as YouTube search queries so they
    never rely on potentially hallucinated channel slugs.
    """
    rtype = r.get("type", "course")
    title = r.get("title", "")
    url = r.get("url", "")

    if rtype == "youtube":
        url = f"https://www.youtube.com/results?search_query={quote_plus(title)}"
    elif rtype == "podcast":
        # Use Spotify podcast search — always valid, avoids hallucinated episode URLs
        url = f"https://open.spotify.com/search/{quote_plus(title)}/podcasts"

    return StudyResource(
        type=rtype,
        title=title,
        provider=r.get("provider", ""),
        description=r.get("description", ""),
        url=url,
    )


def _openai_analysis(
    job_description: str,
    recommendations: list[RecommendationResultModel],
    completed_units: list[str],
    program: str = "Master",
    major: str = "",
    year_of_study: int = 1,
) -> dict:
    """
    Return a dict with gap_analysis, next_semester_plan, and study_resources.
    Falls back gracefully if the API key is absent or the call fails.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — skipping LLM analysis.")
        return _fallback_analysis(recommendations, completed_units)

    units_summary = "\n".join(
        f"  • [{r.unit_code}] {r.title} — {r.score * 100:.0f}% match"
        for r in recommendations
    )
    completed_str = ", ".join(completed_units) if completed_units else "none"
    major_str = f", {major} major" if major else ""
    prompt = _LLM_PROMPT.format(
        program=program,
        year_of_study=year_of_study,
        major_str=major_str,
        job_description=job_description[:800],
        units_summary=units_summary,
        completed_str=completed_str,
    )

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=800,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.choices[0].message.content.strip()
        data = _json.loads(raw)
        # Normalise study_resources into StudyResource objects
        resources = [
            _build_resource(r)
            for r in data.get("study_resources", [])
        ]
        return {
            "gap_analysis": data.get("gap_analysis", ""),
            "next_semester_plan": data.get("next_semester_plan", ""),
            "study_resources": resources,
        }
    except Exception as exc:
        logger.error("OpenAI API call failed: %s", exc)
        return _fallback_analysis(recommendations, completed_units)


def _fallback_analysis(
    recommendations: list[RecommendationResultModel],
    completed_units: list[str],  # noqa: ARG001
) -> dict:
    if not recommendations:
        gap = "No matching units found for this job description."
        plan = "Ingest unit data into ChromaDB and try again."
    else:
        top = recommendations[0]
        remaining = [r for r in recommendations if not r.is_completed]
        count_str = f"{len(remaining)} unit(s)" if remaining else "the recommended units"
        gap = (
            f"The closest match is {top.unit_code} ({top.title}, "
            f"{top.score * 100:.0f}% similarity). "
            f"Consider enrolling in {count_str} to build the required skill set."
        )
        plan = (
            f"Start with {top.unit_code} next semester to address the highest-priority skill gap. "
            f"Review each unit's learning outcomes against the job requirements for a detailed fit assessment."
        )
    return {
        "gap_analysis": gap,
        "next_semester_plan": plan,
        "study_resources": [],
    }
