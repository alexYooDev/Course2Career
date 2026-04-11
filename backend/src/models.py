"""
backend/src/models.py

Pydantic v2 models that define the API contract.
TypeScript interfaces in frontend/src/types/index.ts must stay in sync.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------

class UnitModel(BaseModel):
    unit_code: str
    title: str
    learning_outcomes: list[str] = []
    content: str = ""
    credit_points: str = ""
    pre_requisite: str = ""
    study_period: str = ""
    year: str = ""


# ---------------------------------------------------------------------------
# Jobs (Adzuna)
# ---------------------------------------------------------------------------

class JobModel(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    description: str
    redirect_url: str
    salary_min: float | None = None
    salary_max: float | None = None
    category: str = ""
    contract_type: str = ""
    contract_time: str = ""


class JobSearchParams(BaseModel):
    query: str
    country: str = "au"
    where: str = ""
    limit: int = Field(default=5, ge=1, le=20)


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

class RecommendationRequest(BaseModel):
    job_description: str
    completed_units: list[str] = []
    program: str = "Bachelor"       # "Bachelor" | "Master"
    year_of_study: int = Field(default=1, ge=1, le=5)
    top_k: int = Field(default=3, ge=1, le=10)


class RecommendationResultModel(BaseModel):
    unit_code: str
    title: str
    score: float                    # cosine similarity 0–1
    matching_reason: str
    gap_skills: list[str] = []
    is_completed: bool = False


class RecommendationResponse(BaseModel):
    job_title: str
    recommendations: list[RecommendationResultModel]
    gap_analysis: str
    total_units_analyzed: int
