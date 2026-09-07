def safe_get(data, key, default=None):
    """
    Safely retrieves a key from a dictionary, returning default (None) if missing or if the value is null.
    """
    if data is None or not isinstance(data, dict):
        return default
    value = data.get(key, default)
    return default if value is None else value
