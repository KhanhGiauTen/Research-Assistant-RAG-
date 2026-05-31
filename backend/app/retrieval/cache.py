from __future__ import annotations

from collections import OrderedDict
import hashlib
from time import time

from app.retrieval.retriever_models import RetrievalResult


class QueryCache:
    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self._cache: OrderedDict[str, tuple[RetrievalResult, float]] = OrderedDict()
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds

    def _key(self, query: str, top_k: int, filter_file: str | None) -> str:
        raw = f"{query.strip().lower()}::{top_k}::{filter_file or ''}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def get(
        self,
        query: str,
        top_k: int,
        filter_file: str | None,
    ) -> RetrievalResult | None:
        key = self._key(query, top_k, filter_file)
        cached = self._cache.get(key)
        if cached is None:
            return None

        result, created_at = cached
        if time() - created_at > self.ttl_seconds:
            self._cache.pop(key, None)
            return None

        self._cache.move_to_end(key)
        return result

    def set(
        self,
        query: str,
        top_k: int,
        filter_file: str | None,
        result: RetrievalResult,
    ) -> None:
        key = self._key(query, top_k, filter_file)
        self._cache[key] = (result, time())
        self._cache.move_to_end(key)

        while len(self._cache) > self.max_size:
            self._cache.popitem(last=False)

    def invalidate_all(self) -> None:
        self._cache.clear()


query_cache = QueryCache()
