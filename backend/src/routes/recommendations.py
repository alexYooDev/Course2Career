"""POST /api/recommendations"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.src.dependencies import get_ingestor
from backend.src.ingestor import UnitIngestor
from backend.src.matcher import generate_recommendations
from backend.src.models import RecommendationRequest, RecommendationResponse

router = APIRouter(tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def recommend(
    body: RecommendationRequest,
    ingestor: UnitIngestor = Depends(get_ingestor),
):
    """
    Rank QUT units by semantic similarity to a job description and return a
    Claude-generated gap analysis.

    ``completed_units`` is a list of unit codes the student has already passed;
    those units are flagged ``is_completed: true`` in the response rather than
    excluded, so the frontend can render them differently.
    """
    return generate_recommendations(body, ingestor)
