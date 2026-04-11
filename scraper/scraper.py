"""Async Playwright scraper with persistent session and auth-refresh support."""

from __future__ import annotations

import logging
from pathlib import Path

from playwright.async_api import (
    Browser, BrowserContext, Page,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

logger = logging.getLogger(__name__)

STORAGE_STATE_PATH = Path(__file__).parent.parent / "auth" / "storage_state.json"

MICROSOFT_LOGIN_DOMAINS = (
    "login.microsoftonline.com",
    "login.microsoft.com",
    "aadcdn.msftauth.net",
)
CAPTCHA_INDICATORS = ("captcha", "recaptcha", "hcaptcha", "cf-chl-bypass", "cf_clearance", "turnstile")
DEFAULT_TIMEOUT_MS = 30_000
NAVIGATION_TIMEOUT_MS = 60_000
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class ScraperError(Exception): pass
class AuthenticationRequiredError(ScraperError): pass
class CaptchaDetectedError(ScraperError): pass
class PageNotFoundError(ScraperError): pass


class JobScraper:
    def __init__(
        self,
        headless: bool = True,
        storage_state_path: Path | None = STORAGE_STATE_PATH,
        timeout_ms: int = DEFAULT_TIMEOUT_MS,
    ) -> None:
        self._headless = headless
        self._storage_state_path = storage_state_path
        self._timeout_ms = timeout_ms
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._context_refreshed = False

    async def __aenter__(self) -> "JobScraper":
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=self._headless)
        self._context = await self._create_context()
        return self

    async def __aexit__(self, *_) -> None:
        if self._context: await self._context.close()
        if self._browser: await self._browser.close()
        if self._playwright: await self._playwright.stop()

    async def _create_context(self) -> BrowserContext:
        storage_state = None
        if self._storage_state_path and self._storage_state_path.exists():
            storage_state = str(self._storage_state_path)
        context = await self._browser.new_context(
            storage_state=storage_state,
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
            locale="en-AU",
            timezone_id="Australia/Brisbane",
        )
        context.set_default_timeout(self._timeout_ms)
        return context

    async def save_session(self, path: Path | None = None) -> None:
        target = path or self._storage_state_path
        if target:
            target.parent.mkdir(parents=True, exist_ok=True)
            await self._context.storage_state(path=str(target))

    async def fetch_html(self, url: str) -> str:
        page: Page = await self._context.new_page()
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT_MS)
            if response is None:
                raise ScraperError(f"No response for: {url}")
            if response.status == 404:
                raise PageNotFoundError(f"404: {url}")
            if response.status >= 400:
                raise ScraperError(f"HTTP {response.status}: {url}")

            if any(d in page.url for d in MICROSOFT_LOGIN_DOMAINS):
                if not self._context_refreshed:
                    await page.close()
                    if self._context: await self._context.close()
                    self._context_refreshed = True
                    self._context = await self._create_context()
                    return await self.fetch_html(url)
                raise AuthenticationRequiredError(f"Microsoft login required. Run auth/save_session.py.")

            try:
                await page.wait_for_load_state("networkidle", timeout=10_000)
            except PlaywrightTimeoutError:
                pass

            html = await page.content()
            lower = html.lower()
            for ind in CAPTCHA_INDICATORS:
                if ind in lower:
                    raise CaptchaDetectedError(f"CAPTCHA at {url}")

            if self._storage_state_path:
                await self.save_session()
            return html

        except (PageNotFoundError, AuthenticationRequiredError, CaptchaDetectedError, ScraperError):
            raise
        except PlaywrightTimeoutError as exc:
            raise ScraperError(f"Timeout: {url}") from exc
        except Exception as exc:
            raise ScraperError(f"Unexpected error: {url}") from exc
        finally:
            if not page.is_closed():
                await page.close()
