"""
backend/src/dependencies.py

FastAPI dependency functions.

Keeping dependencies in a dedicated module breaks the circular import that
would arise if routes imported directly from main.py.
"""

from __future__ import annotations

from fastapi import Request

from backend.src.ingestor import UnitIngestor


def get_ingestor(request: Request) -> UnitIngestor:
    """Return the shared UnitIngestor stored on app.state."""
    return request.app.state.ingestor
