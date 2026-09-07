import json
from datetime import datetime
from django.core.cache import cache

def get_cached_or_fetch(key, fetch_func, timeout):
    """
    Fetches data from cache, or runs fetch_func() and caches the result.
    Injects a 'last_updated' timestamp.
    Handles missing/invalid cache (e.g. Redis down) gracefully — falls back to direct fetch.
    """
    try:
        cached = cache.get(key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass
    except Exception:
        # Cache backend unavailable (Redis not running) — continue to fetch directly
        cached = None

    data = fetch_func()
    if data is not None:
        if isinstance(data, dict):
            data['last_updated'] = datetime.utcnow().isoformat() + "Z"
        elif isinstance(data, list):
            data = {'results': data, 'last_updated': datetime.utcnow().isoformat() + "Z"}
        try:
            cache.set(key, json.dumps(data), timeout)
        except Exception:
            pass  # cache write failure should not break the request
    return data
