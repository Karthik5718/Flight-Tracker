"""
Historical monthly passenger traffic analytics for the Airport Congestion dashboard.

Reads the existing ``frontend/airport_monthly.csv`` dataset. Each row is an
additive monthly total per airport with the columns:

    year, month, airport, passengers, departures, arrivals

NOTE ON UNITS AND DATA MEANING:
In this dataset, 'departures' represents embarking passengers and 'arrivals'
represents disembarking passengers. The sum of departures and arrivals equals
total passengers. These figures reflect PASSENGER traffic (people), NOT aircraft
flight movements. They must not be aggregated or used as an aircraft movement baseline.
"""

import csv
import threading
from pathlib import Path

from django.conf import settings

# settings.BASE_DIR points at the Django ``backend`` directory; the dataset
# lives in the repository-level ``frontend`` folder next to it.
CSV_PATH = Path(settings.BASE_DIR).parent / "frontend" / "airport_monthly.csv"

_LOCK = threading.Lock()
_CACHE = {"mtime": None, "by_airport": {}}

_MISSING_TOKENS = {"", "na", "n/a", "null", "none", "-", "--"}


def _to_int(value):
    """Return an integer or None. Missing tokens are treated as missing,
    never as a genuine zero."""
    if value is None:
        return None
    text = str(value).strip()
    if text.lower() in _MISSING_TOKENS:
        return None
    try:
        return int(float(text.replace(",", "")))
    except (TypeError, ValueError):
        return None


def _load_by_airport():
    path = CSV_PATH
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return {}

    with _LOCK:
        if _CACHE["mtime"] == mtime and _CACHE["by_airport"]:
            return _CACHE["by_airport"]

    by_airport = {}
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                code = (row.get("airport") or "").strip().upper()
                # IATA codes are 3 letters; skip malformed rows.
                if len(code) != 3 or not code.isalpha():
                    continue
                year = _to_int(row.get("year"))
                month = _to_int(row.get("month"))
                if year is None or month is None or not 1 <= month <= 12:
                    continue
                by_airport.setdefault(code, []).append({
                    "year": year,
                    "month": month,
                    "passengers": _to_int(row.get("passengers")),
                    "departures": _to_int(row.get("departures")),
                    "arrivals": _to_int(row.get("arrivals")),
                })
    except OSError:
        return {}

    for records in by_airport.values():
        records.sort(key=lambda r: (r["year"], r["month"]))

    with _LOCK:
        _CACHE["mtime"] = mtime
        _CACHE["by_airport"] = by_airport
    return by_airport


def get_airport_history(code):
    """Return chronological monthly records for a single airport, or None."""
    code = (code or "").strip().upper()
    if len(code) != 3 or not code.isalpha():
        return None
    records = _load_by_airport().get(code)
    if not records:
        return None

    years = sorted({r["year"] for r in records})
    return {
        "airport": code,
        "records": records,
        "available_years": years,
        "first_year": years[0],
        "last_year": years[-1],
        "record_count": len(records),
        "source": "airport_monthly.csv",
        "units": {
            "passengers": "total_passengers",
            "departures": "embarking_passengers",
            "arrivals": "disembarking_passengers"
        }
    }
