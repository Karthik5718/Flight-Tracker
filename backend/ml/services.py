"""
Deterministic demo prediction logic.

No trained models here — predictions are direct lookups of the hardcoded
demo datasets plus documented threshold rules. Kept in functions so a
real model can replace them later without touching views.
"""

from .delay_data import DELAY_DATA
from .congestion_data import CONGESTION_DATA


def classify_delay(avg_departure_delay):
    """Delay category from average departure delay (minutes).

    Rule: <= 5 -> "On Time", 6-30 -> "Minor Delay", > 30 -> "Major Delay".
    """
    if avg_departure_delay <= 5:
        return "On Time"
    if avg_departure_delay <= 30:
        return "Minor Delay"
    return "Major Delay"


def predict_delay(airline, origin, destination):
    """Return the configured demo delay entry for an airline-route combo.

    Returns a dict with airline/route/averages/category, or None when the
    combination is not in the dataset. Inputs are case-insensitive.
    """
    if not airline or not origin or not destination:
        return None
    key = (airline.strip().upper(), origin.strip().upper(), destination.strip().upper())
    entry = DELAY_DATA.get(key)
    if not entry:
        return None
    avg_dep = entry["avg_departure_delay"]
    avg_arr = entry["avg_arrival_delay"]
    return {
        "airline": key[0],
        "airline_name": entry["airline_name"],
        "origin": key[1],
        "destination": key[2],
        "avg_departure_delay_minutes": avg_dep,
        "avg_arrival_delay_minutes": avg_arr,
        "predicted_departure_delay_minutes": avg_dep,
        "predicted_arrival_delay_minutes": avg_arr,
        "delay_category": classify_delay(avg_dep),
    }


def classify_congestion(score):
    """Congestion category from a 0-100 score.

    Rule: 0-39 -> "Low", 40-64 -> "Moderate", 65-84 -> "High", 85-100 -> "Severe".
    """
    if score <= 39:
        return "Low"
    if score <= 64:
        return "Moderate"
    if score <= 84:
        return "High"
    return "Severe"


def predict_congestion(airport_code):
    """Return the configured demo congestion entry for an airport.

    Returns a dict with airport/score/category/forecast, or None when the
    airport is not in the dataset. Input is case-insensitive.
    """
    if not airport_code:
        return None
    code = airport_code.strip().upper()
    entry = CONGESTION_DATA.get(code)
    if not entry:
        return None
    score = entry["congestion_score"]
    return {
        "airport": code,
        "airport_name": entry["name"],
        "congestion_score": score,
        "congestion_category": classify_congestion(score),
        "avg_congestion_score": score,
        "forecast_1h": entry["forecast_1h"],
        "forecast_3h": entry["forecast_3h"],
        "forecast_6h": entry["forecast_6h"],
    }
