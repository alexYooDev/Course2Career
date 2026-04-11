"""HTML → clean plain text normalizer."""

from __future__ import annotations

import html as html_lib
import re

from bs4 import BeautifulSoup

_SCRIPT_RE = re.compile(r"<script[^>]*>.*?</script>", re.DOTALL | re.IGNORECASE)
_STYLE_RE  = re.compile(r"<style[^>]*>.*?</style>",  re.DOTALL | re.IGNORECASE)
_NOISE_TAGS = ["script","style","noscript","nav","header","footer","aside","form","iframe"]
_JS_NOISE = [
    re.compile(r"javascript\s+is\s+(required|disabled)[^\n]*", re.I),
    re.compile(r"please\s+enable\s+javascript[^\n]*", re.I),
    re.compile(r"\bloading[.\u2026]{0,3}\s*", re.I),
    re.compile(r"(accept|reject)\s+(all\s+)?cookies[^\n]*", re.I),
]


def clean_html_to_text(html: str) -> str:
    html = _SCRIPT_RE.sub(" ", html)
    html = _STYLE_RE.sub(" ", html)
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(_NOISE_TAGS):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    text = html_lib.unescape(text).replace("\u00a0", " ")
    for p in _JS_NOISE:
        text = p.sub(" ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
