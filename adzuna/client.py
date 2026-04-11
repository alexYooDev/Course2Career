"""Adzuna Jobs API v1 client."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.adzuna.com/v1/api/jobs"
_DEFAULT_TIMEOUT = 15


class AdzunaError(Exception):
    """Non-2xx response or network failure."""


@dataclass
class AdzunaJob:
    job_id: str
    title: str
    company: str
    location: str
    description: str
    redirect_url: str
    category: str = ""
    contract_type: str = ""
    contract_time: str = ""
    salary_min: float | None = None
    salary_max: float | None = None
    created: str = ""


class AdzunaClient:
    def __init__(self, app_id: str, app_key: str, country: str = "au") -> None:
        if not app_id or not app_key:
            raise AdzunaError("Adzuna credentials empty. Set APP_ID and APP_KEY in .env.")
        self._app_id = app_id
        self._app_key = app_key
        self._country = country.lower()
        self._session = requests.Session()
        self._session.headers.update({"Accept": "application/json"})

    @classmethod
    def from_env(cls, country: str = "au") -> "AdzunaClient":
        return cls(
            app_id=os.environ.get("APP_ID", ""),
            app_key=os.environ.get("APP_KEY", ""),
            country=country,
        )

    def search(
        self,
        what: str,
        *,
        where: str = "",
        page: int = 1,
        results_per_page: int = 10,
    ) -> list[AdzunaJob]:
        url = f"{_BASE_URL}/{self._country}/search/{page}"
        params: dict = {
            "app_id": self._app_id,
            "app_key": self._app_key,
            "what": what,
            "results_per_page": min(results_per_page, 50),
            "content-type": "application/json",
        }
        if where:
            params["where"] = where

        try:
            response = self._session.get(url, params=params, timeout=_DEFAULT_TIMEOUT)
        except requests.Timeout as exc:
            raise AdzunaError(f"Adzuna API timed out after {_DEFAULT_TIMEOUT}s.") from exc
        except requests.RequestException as exc:
            raise AdzunaError(f"Network error: {exc}") from exc

        if response.status_code == 401:
            raise AdzunaError("Invalid Adzuna credentials (401). Check APP_ID/APP_KEY in .env.")
        if not response.ok:
            raise AdzunaError(f"Adzuna API HTTP {response.status_code}: {response.text[:200]}")

        data = response.json()
        logger.info("Adzuna: %d result(s) for '%s'.", len(data.get("results", [])), what)
        return [self._parse(r) for r in data.get("results", [])]

    @staticmethod
    def _parse(raw: dict) -> AdzunaJob:
        return AdzunaJob(
            job_id=str(raw.get("id", "")),
            title=raw.get("title", ""),
            company=raw.get("company", {}).get("display_name", ""),
            location=raw.get("location", {}).get("display_name", ""),
            description=raw.get("description", ""),
            redirect_url=raw.get("redirect_url", ""),
            category=raw.get("category", {}).get("label", ""),
            contract_type=raw.get("contract_type", ""),
            contract_time=raw.get("contract_time", ""),
            salary_min=raw.get("salary_min"),
            salary_max=raw.get("salary_max"),
            created=raw.get("created", ""),
        )
