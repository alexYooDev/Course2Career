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
    program: str = "Master"         # "Bachelor" | "Master"
    year_of_study: int = Field(default=1, ge=1, le=3)  # MIT=2yrs, Bachelor=3yrs
    major: str = ""                 # e.g. "Computer Science", "Data Science"
    top_k: int = Field(default=3, ge=1, le=10)


class RecommendationResultModel(BaseModel):
    unit_code: str
    title: str
    score: float                    # cosine similarity 0–1
    matching_reason: str
    gap_skills: list[str] = []


class StudyResource(BaseModel):
    type: str          # "course" | "youtube" | "podcast" | "community" | "event"
    title: str
    provider: str      # platform or creator name
    description: str   # why it helps fill the gap
    url: str = ""      # direct link (best-effort from LLM)


class RecommendationResponse(BaseModel):
    job_title: str
    recommendations: list[RecommendationResultModel]
    gap_analysis: str
    next_semester_plan: str = ""
    study_resources: list[StudyResource] = []
    total_units_analyzed: int
