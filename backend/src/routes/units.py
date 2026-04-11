"""GET /api/units, POST /api/units/ingest, POST /api/units/ingest-pdf"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from backend.src.dependencies import get_ingestor
from backend.src.ingestor import UnitIngestor
from backend.src.models import UnitModel

router = APIRouter(tags=["units"])

_UTILS_DIR = Path(__file__).parents[3] / "utils"
_DATA_DIR  = Path(__file__).parents[3] / "data"


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


@router.post("/units/ingest-pdf", summary="Ingest units from QUT MIT course PDF")
def ingest_pdf(
    filename: str = "qut_IN20_45010_dom_cms_unit.pdf",
    ingestor: UnitIngestor = Depends(get_ingestor),
):
    """
    Parse the QUT MIT course structure PDF and upsert all units into ChromaDB.

    The PDF must exist under the project ``data/`` directory.
    Defaults to ``qut_IN20_45010_dom_cms_unit.pdf``.
    """
    pdf_path = _DATA_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {filename}")
    count = ingestor.ingest_pdf(pdf_path)
    return {"ingested": count, "total_in_db": ingestor.count}
