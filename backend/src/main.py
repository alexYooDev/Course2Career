"""
backend/src/main.py

FastAPI application entry point for Course2Career.

Run from the project root (BridgeTech/) so that sibling packages
(scraper/, matcher/, adzuna/) are on the Python path:

    uvicorn backend.src.main:app --reload --port 8000
"""

from __future__ import annotations

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
_CHROMA_DIR = str(Path(__file__).parents[2] / "data" / "chroma")


# ---------------------------------------------------------------------------
# Lifespan: initialise / tear down shared resources
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    ingestor = UnitIngestor(chroma_path=_CHROMA_DIR)
    app.state.ingestor = ingestor

    if ingestor.count == 0:
        logger.info("ChromaDB is empty — auto-ingesting from %s …", _UTILS_DIR)
        n = ingestor.ingest_json_files(_UTILS_DIR)
        logger.info("Auto-ingested %d unit(s).", n)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
    ],
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
