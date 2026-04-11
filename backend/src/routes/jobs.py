"""GET /api/jobs/search"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from adzuna.client import AdzunaClient, AdzunaError
from backend.src.models import JobModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["jobs"])


@router.get("/jobs/search", response_model=list[JobModel])
def search_jobs(
    query: str = Query(..., description="Job title or keywords"),
    country: str = Query(default="au", description="Adzuna country code"),
    where: str = Query(default="", description="Location filter"),
    limit: int = Query(default=5, ge=1, le=20),
):
    """
    Search Adzuna for live job listings.

    Requires ``APP_ID`` and ``APP_KEY`` in the environment (loaded from ``.env``).
    """
    try:
        client = AdzunaClient.from_env(country=country)
        jobs = client.search(what=query, where=where, results_per_page=limit)
    except AdzunaError as exc:
        logger.error("Adzuna error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    return [
        JobModel(
            job_id=j.job_id,
            title=j.title,
            company=j.company,
            location=j.location,
            description=j.description,
            redirect_url=j.redirect_url,
            salary_min=j.salary_min,
            salary_max=j.salary_max,
            category=j.category,
            contract_type=j.contract_type,
            contract_time=j.contract_time,
        )
        for j in jobs
    ]
