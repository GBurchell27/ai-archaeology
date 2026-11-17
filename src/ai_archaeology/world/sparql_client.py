"""A polite, cached client for the Wikidata Query Service.

Every raw response is written under the cache directory, keyed by a label and the
query's hash, so a rerun only fetches what is missing. One request at a time.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ENDPOINT = "https://query.wikidata.org/sparql"
USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"
RETRY_STATUSES = {429, 502, 503, 504}
LOGGER = logging.getLogger(__name__)


class QueryTimeout(Exception):
    """The server gave up on the query. Retrying the same text will not help; split it."""


class SparqlClient:
    def __init__(self, cache_dir: Path, pause_seconds: float = 1.0, max_attempts: int = 6,
                 request_timeout: float = 90.0) -> None:
        self.cache_dir = cache_dir
        self.pause_seconds = pause_seconds
        self.max_attempts = max_attempts
        self.request_timeout = request_timeout
        self.requests_sent = 0

    def cache_path(self, label: str, query: str) -> Path:
        digest = hashlib.sha1(query.encode()).hexdigest()[:12]
        return self.cache_dir / f"{label}-{digest}.json"

    def bindings(self, label: str, query: str) -> list[dict]:
        """Rows for the query, from the cache when present."""
        path = self.cache_path(label, query)
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))["results"]["bindings"]
        body = self._fetch(label, query)
        rows = _parse(body)["results"]["bindings"]
        path.parent.mkdir(parents=True, exist_ok=True)
        partial = path.with_suffix(".part")
        partial.write_text(body, encoding="utf-8")
        partial.replace(path)  # a crash mid-write must not leave a half file in the cache
        return rows

    def _fetch(self, label: str, query: str) -> str:
        for attempt in range(1, self.max_attempts + 1):
            time.sleep(self.pause_seconds)
            self.requests_sent += 1
            try:
                return self._post(query)
            except urllib.error.HTTPError as error:
                detail = error.read().decode("utf-8", "replace")
                if _is_server_timeout(detail):
                    raise QueryTimeout(label) from error
                if error.code not in RETRY_STATUSES:
                    raise RuntimeError(f"{label}: HTTP {error.code}: {detail[:300]}") from error
                wait = _retry_after(error) or 5.0 * 2 ** attempt
            except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
                LOGGER.warning("%s: %s", label, error)
                if attempt >= 2 and _is_read_timeout(error):
                    # Two silent 90 s waits mean the query itself is too heavy.
                    raise QueryTimeout(label) from error
                wait = 5.0 * 2 ** attempt
            LOGGER.warning("%s: attempt %d failed, waiting %.0f s", label, attempt, wait)
            time.sleep(wait)
        # Not a QueryTimeout: the service is refusing us, so stop and let a rerun resume from the cache.
        raise RuntimeError(f"{label}: gave up after {self.max_attempts} attempts")

    def _post(self, query: str) -> str:
        request = urllib.request.Request(
            ENDPOINT,
            data=urllib.parse.urlencode({"query": query}).encode(),
            headers={"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"},
        )
        with urllib.request.urlopen(request, timeout=self.request_timeout) as response:
            body = response.read().decode("utf-8")
        if _is_server_timeout(body[-2000:]):
            raise QueryTimeout("timeout reported inside a 200 response")
        return body


def _parse(body: str) -> dict:
    try:
        return json.loads(body)
    except json.JSONDecodeError as error:
        # WDQS can cut a streamed 200 response short when the query deadline passes.
        raise QueryTimeout("truncated response") from error


def _is_server_timeout(text: str) -> bool:
    return "TimeoutException" in text or "QueryTimeoutException" in text


def _is_read_timeout(error: Exception) -> bool:
    return isinstance(error, TimeoutError) or isinstance(getattr(error, "reason", None), TimeoutError)


def _retry_after(error: urllib.error.HTTPError) -> float | None:
    value = error.headers.get("Retry-After") if error.headers else None
    return float(value) + 1.0 if value and value.isdigit() else None
