"""
backend/src/main.py

FastAPI application entry point for Course2Career.

Run from the project root (BridgeTech/) so that sibling packages
(scraper/, matcher/, adzuna/) are on the Python path:

    uvicorn backend.src.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap — must run before any sibling-package imports.
# Adds BridgeTech/ to sys.path so that adzuna/, scraper/, matcher/ are
# importable regardless of the working directory uvicorn is launched from.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = str(Path(__file__).parents[2].resolve())
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.ingestor import UnitIngestor
from backend.src.routes import jobs, recommendations, units

# Load .env from project root
load_dotenv(Path(__file__).parents[2] / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

_UTILS_DIR = Path(__file__).parents[2] / "utils"
_DATA_DIR  = Path(__file__).parents[2] / "data"
# Allow Railway volume override via env var (set CHROMA_PATH=/data/chroma in Railway)
_CHROMA_DIR = os.getenv("CHROMA_PATH", str(_DATA_DIR / "chroma"))
_MIT_PDF = _DATA_DIR / "qut_IN20_45010_dom_cms_unit.pdf"


# ---------------------------------------------------------------------------
# Lifespan: initialise / tear down shared resources
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    ingestor = UnitIngestor(chroma_path=_CHROMA_DIR)
    app.state.ingestor = ingestor

    if ingestor.count == 0:
        # Try JSON files first (fast, local dev)
        n = ingestor.ingest_json_files(_UTILS_DIR)
        if n:
            logger.info("Auto-ingested %d unit(s) from JSON.", n)

        # Auto-ingest MIT PDF on cold start (covers Railway fresh deploys)
        if _MIT_PDF.exists():
            logger.info("Auto-ingesting MIT course PDF on cold start …")
            n_pdf = ingestor.ingest_pdf(_MIT_PDF)
            logger.info("Ingested %d unit(s) from MIT PDF.", n_pdf)
        else:
            logger.warning("MIT PDF not found at %s — skipping PDF ingest.", _MIT_PDF)
    else:
        logger.info("ChromaDB already has %d unit(s) — skipping auto-ingest.", ingestor.count)

    yield

    logger.info("Shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Course2Career API",
    description="QUT IT unit recommendation engine powered by ChromaDB + OpenAI.",
    version="0.1.0",
    lifespan=lifespan,
)

# FRONTEND_URL is set in Railway to the Vercel deployment URL
# e.g. https://course2career.vercel.app
_frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
_cors_origins = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:4173",   # Vite preview
]
if _frontend_url:
    _cors_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(units.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "units_in_db": app.state.ingestor.count}
