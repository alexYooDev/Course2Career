"""Job and QUT unit page parsers."""

from __future__ import annotations

import logging
import re

from bs4 import BeautifulSoup, Tag

from .normalizer import clean_html_to_text

logger = logging.getLogger(__name__)

_H_RE    = re.compile(r"^h[1-6]$", re.I)
_BLOCK_RE = re.compile(r"^(h[1-6]|p|div|li|td|th|strong|b|span)$", re.I)
_SEC_HEAD_RE = re.compile(r"^[A-Z][A-Za-z\s&/()\-]{2,55}:?\s*$")


def _find_tag(soup: BeautifulSoup, pattern: str) -> Tag | None:
    rx = re.compile(pattern, re.I)
    for tag in soup.find_all(_H_RE):
        if rx.search(tag.get_text(strip=True)):
            return tag
    for tag in soup.find_all(_BLOCK_RE):
        if rx.search(tag.get_text(strip=True)):
            return tag
    return None


def _siblings_until_heading(tag: Tag) -> list[Tag]:
    result, node = [], tag.find_next_sibling()
    while node:
        if isinstance(node, Tag) and _H_RE.match(node.name or ""):
            break
        result.append(node)
        node = node.find_next_sibling()
    return result


def _list_items(tag: Tag) -> list[str]:
    for s in _siblings_until_heading(tag):
        if isinstance(s, Tag) and s.name in ("ul", "ol"):
            return [re.sub(r"\s+", " ", li.get_text(" ", strip=True)).strip() for li in s.find_all("li")]
    return []


def _prose(tag: Tag, max_chars: int = 5_000) -> str:
    parts = [re.sub(r"\s+", " ", s.get_text(" ", strip=True)).strip()
             for s in _siblings_until_heading(tag) if isinstance(s, Tag)]
    return " ".join(filter(None, parts))[:max_chars]


def _section_from_text(text: str, pattern: re.Pattern) -> list[str]:
    lines, collecting, result, blanks = text.splitlines(), False, [], 0
    for line in lines:
        s = line.strip()
        if not collecting:
            if pattern.search(s): collecting = True
            continue
        if not s:
            blanks += 1
            if blanks > 2: break
            continue
        blanks = 0
        if _SEC_HEAD_RE.match(s) and len(s) < 60 and result:
            break
        result.append(s)
    return result


_REQ_DOM = r"requirement|qualification|what you.{0,5}(need|bring)|must[\s\-]have|key\s+skill|about\s+you"
_RESP_DOM = r"responsibilit|key\s+duties|day[\s\-]to[\s\-]day"
_CONT_ID_RE = re.compile(r"job|description|content|detail|posting", re.I)
_NOISE_TAGS = ["script","style","noscript","nav","header","footer","aside","form"]


class GenericJobParser:
    source = "generic"

    def parse(self, html: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(_NOISE_TAGS): tag.decompose()

        container = (soup.find("main") or soup.find("article")
                     or soup.find(attrs={"role": "main"})
                     or soup.find(id=_CONT_ID_RE) or soup.find(class_=_CONT_ID_RE))
        full_text = clean_html_to_text(str(container) if container else html)

        req_h = _find_tag(soup, _REQ_DOM)
        requirements = _list_items(req_h) if req_h else []
        if not requirements and req_h:
            p = _prose(req_h)
            requirements = [p] if p else []
        if not requirements:
            requirements = _section_from_text(full_text, re.compile(_REQ_DOM, re.I))

        resp_h = _find_tag(soup, _RESP_DOM)
        responsibilities = _list_items(resp_h) if resp_h else []

        return {"full_text": full_text, "requirements": requirements,
                "responsibilities": responsibilities, "source": self.source}


class AdzunaJobParser(GenericJobParser):
    source = "adzuna"


class QUTUnitParser:
    _LO_RE = re.compile(r"learning\s+outcome", re.I)
    _CT_RE = re.compile(r"^content\s*$", re.I)
    _OUT_LINE = re.compile(r"^(\d+[\.\)]\s+|[•\-\*]\s*)(.+)")

    def parse(self, html: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")
        clean = clean_html_to_text(html)
        outcomes = self._outcomes(soup, clean)
        content  = self._content(soup, clean)
        return {"learning_outcomes": outcomes, "content": content}

    def _outcomes(self, soup, text):
        h = _find_tag(soup, r"learning\s+outcome")
        if h:
            items = _list_items(h)
            if items: return items
            p = _prose(h)
            if p: return [p]
        lines = _section_from_text(text, self._LO_RE)
        result = []
        for line in lines:
            m = self._OUT_LINE.match(line)
            result.append(m.group(2).strip() if m else line)
        return result

    def _content(self, soup, text):
        h = _find_tag(soup, r"^content$")
        if h:
            p = _prose(h)
            if p: return p
        return " ".join(_section_from_text(text, self._CT_RE))
