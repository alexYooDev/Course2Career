"""GET /api/units  and  POST /api/units/ingest"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends

from backend.src.dependencies import get_ingestor
from backend.src.ingestor import UnitIngestor
from backend.src.models import UnitModel

router = APIRouter(tags=["units"])

_UTILS_DIR = Path(__file__).parents[4] / "utils"


@router.get("/units", response_model=list[UnitModel])
def list_units(ingestor: UnitIngestor = Depends(get_ingestor)):
    """Return all units stored in ChromaDB."""
    return ingestor.get_all_units()


@router.post("/units/ingest", summary="Re-ingest unit JSON files")
def trigger_ingest(ingestor: UnitIngestor = Depends(get_ingestor)):
    """
    Re-scan ``utils/`` for ``*.json`` unit files and upsert them into ChromaDB.
    Safe to call multiple times — existing entries are updated in-place.
    """
    count = ingestor.ingest_json_files(_UTILS_DIR)
    return {"ingested": count, "total_in_db": ingestor.count}
