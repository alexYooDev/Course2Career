"""Singleton sentence-transformer model."""

from __future__ import annotations

import logging

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "all-mpnet-base-v2"
_BATCH_SIZE = 32
_MODEL: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _MODEL  # noqa: PLW0603
    if _MODEL is None:
        logger.info("Loading '%s'…", MODEL_NAME)
        _MODEL = SentenceTransformer(MODEL_NAME)
        logger.info("Model ready (dim=%d).", _MODEL.get_sentence_embedding_dimension())
    return _MODEL


def warmup() -> None:
    get_model().encode(["warmup"], batch_size=1, show_progress_bar=False)
    logger.info("Embedding model warmed up.")


def embed(text: str) -> np.ndarray:
    return get_model().encode(
        text, batch_size=1, normalize_embeddings=True,
        show_progress_bar=False, convert_to_numpy=True,
    ).astype(np.float32)


def embed_batch(texts: list[str]) -> np.ndarray:
    return get_model().encode(
        texts, batch_size=_BATCH_SIZE, normalize_embeddings=True,
        show_progress_bar=len(texts) > 10, convert_to_numpy=True,
    ).astype(np.float32)
