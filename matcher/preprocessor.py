"""Text cleaning utilities for the embedding pipeline."""

from __future__ import annotations

import re
import string
from collections import Counter

_MAX_CHARS = 1_500
_STOP_WORDS: frozenset[str] = frozenset({
    "a","an","the","and","or","but","if","in","on","at","to","for","of","with",
    "by","is","are","was","be","been","have","has","do","will","can","that","this",
    "it","we","you","they","all","not","work","working","team","role","experience",
    "ability","strong","good","required","must","using","use","based","new",
    "unit","course","study","learn","learning","student","demonstrate","apply",
})
_PUNCT = str.maketrans("", "", string.punctuation)
_HTML_RE  = re.compile(r"<[^>]+>")
_ENT_RE   = re.compile(r"&[a-z#0-9]{1,8};")
_SP_RE    = re.compile(r"[ \t]+")
_NL_RE    = re.compile(r"\n{3,}")


def clean_for_embedding(text: str) -> str:
    text = _HTML_RE.sub(" ", text)
    text = _ENT_RE.sub(" ", text)
    text = _SP_RE.sub(" ", text)
    text = _NL_RE.sub("\n\n", text).strip()
    if len(text) > _MAX_CHARS:
        cut = text.rfind(".", 0, _MAX_CHARS)
        text = text[:cut + 1] if cut > 0 else text[:_MAX_CHARS]
    return text


def extract_keywords(text: str, top_n: int = 15) -> list[str]:
    tokens = text.lower().translate(_PUNCT).split()
    counts = Counter(t for t in tokens if len(t) >= 3 and t not in _STOP_WORDS)
    return [w for w, _ in counts.most_common(top_n)]
