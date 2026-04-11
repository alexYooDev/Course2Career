"""Orchestration: scrape a job URL or QUT unit page."""

from __future__ import annotations

import asyncio
import logging

from .scraper import JobScraper, ScraperError, AuthenticationRequiredError, CaptchaDetectedError, PageNotFoundError
from .parser import AdzunaJobParser, QUTUnitParser

logger = logging.getLogger(__name__)

_QUT_URL = ("https://qutvirtual4.qut.edu.au/web/qut/unit"
            "?unitCode={unit_code}&year={year}&studyPeriodCode={study_period}")


async def scrape_job(redirect_url: str, parser=None) -> dict | None:
    parser = parser or AdzunaJobParser()
    try:
        async with JobScraper() as s:
            html = await s.fetch_html(redirect_url)
        return parser.parse(html)
    except (PageNotFoundError, AuthenticationRequiredError, CaptchaDetectedError, ScraperError) as exc:
        logger.error("scrape_job failed: %s", exc)
        return None


async def scrape_qut_unit(unit_code: str, year: int | str, study_period: str = "SEM-1") -> dict | None:
    url = _QUT_URL.format(unit_code=unit_code.upper(), year=year, study_period=study_period.upper())
    parser = QUTUnitParser()
    try:
        async with JobScraper() as s:
            html = await s.fetch_html(url)
        result = parser.parse(html)
        result["unit_code"] = unit_code.upper()
        return result
    except (PageNotFoundError, AuthenticationRequiredError, CaptchaDetectedError, ScraperError) as exc:
        logger.error("scrape_qut_unit failed: %s", exc)
        return None
