"""
Prediction services for the /api/ml/ endpoints.

Delay prediction is served by the trained model in
``ML/arrival_delay_model.pt`` (see ``ml/delay_model.py``) whenever the
request carries enough flight features for it: scheduled departure and
arrival clock times, a flight date and a route distance. The model was
trained to predict *arrival* delay from the *observed* departure delay
plus schedule and calendar features, so those are the inputs it needs.

When the model cannot run (no torch installed, missing artifact) or the
inputs are incomplete, the endpoint falls back to the hardcoded demo
table in ``delay_data.py`` and labels the response ``data_source:
"demo"``. The demo table is a fallback, not the primary source.

Congestion prediction is still the hardcoded demo dataset.
"""

import math
from datetime import date, datetime, timedelta, timezone

from core.cache import get_cached_or_fetch
from flights.services.airlabs import get_airport_coords

from . import delay_model
from .congestion_data import CONGESTION_DATA
from .delay_data import DELAY_DATA

EARTH_RADIUS_MILES = 3958.7613

MODEL_NOTE = (
    "Predicted by the trained arrival-delay model (ML/arrival_delay_model.pt), "
    "trained on US BTS 2024 on-time performance data."
)

DEMO_NOTE = (
    "Demo data: illustrative hardcoded averages for demonstration only, "
    "not verified historical statistics or a trained ML model."
)

# Flight fields the API accepts, either as query parameters (GET) or in the
# JSON body (POST).
FLIGHT_FIELDS = (
    "flight_number",
    "scheduled_departure",
    "scheduled_arrival",
    "scheduled_departure_local",
    "scheduled_arrival_local",
    "scheduled_duration_minutes",
    "departure_delay_minutes",
    "distance_miles",
    "flight_date",
)


def classify_delay(delay_minutes):
    """Delay category from a delay in minutes.

    Rule: <= 5 -> "On Time", 6-30 -> "Minor Delay", > 30 -> "Major Delay".
    """
    if delay_minutes <= 5:
        return "On Time"
    if delay_minutes <= 30:
        return "Minor Delay"
    return "Major Delay"


def airline_display_name(airline):
    """Airline name for an IATA code, when a known one exists."""
    code = (airline or "").strip().upper()
    for (entry_airline, _origin, _destination), entry in DELAY_DATA.items():
        if entry_airline == code:
            return entry["airline_name"]
    return code


def _parse_datetime(value):
    """Parse an ISO 8601 timestamp, tolerating a trailing 'Z'."""
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith(("Z", "z")):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _parse_date(value):
    """Parse a 'YYYY-MM-DD' date string."""
    if not value:
        return None
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def _as_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _aware(moment):
    """Treat naive timestamps as UTC so differences are always computable."""
    if moment is None:
        return None
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def _elapsed_minutes(departure, arrival):
    """Scheduled flight time in minutes between two timestamps."""
    departure = _aware(departure)
    arrival = _aware(arrival)
    if not departure or not arrival:
        return None
    return round((arrival - departure).total_seconds() / 60.0)


def _local_date(utc_moment, local_minutes):
    """Local calendar date of a flight, given its UTC time and local clock time.

    The UTC offset is recovered from the two clock readings, which keeps the
    day-of-week / day-of-month features right for flights that cross midnight
    relative to UTC.
    """
    if not utc_moment or local_minutes is None:
        return None
    utc_minutes = utc_moment.hour * 60 + utc_moment.minute
    offset = (local_minutes - utc_minutes) % 1440
    if offset > 14 * 60:
        offset -= 1440
    days = (utc_minutes + offset) // 1440
    return utc_moment.date() + timedelta(days=days)


def _airport_coordinates(code):
    """(lat, lon) for an airport IATA code, or None."""
    if not code:
        return None
    try:
        from airports.models import Airport

        airport = Airport.objects.filter(iata__iexact=code).first()
        if airport and airport.lat is not None and airport.lon is not None:
            return float(airport.lat), float(airport.lon)
    except Exception:
        pass

    try:
        coords = get_cached_or_fetch(
            "airport_coords_{}".format(code.upper()),
            lambda: get_airport_coords(code),
            3600,
        )
    except Exception:
        return None
    if not coords:
        return None
    lat = coords.get("lat")
    lon = coords.get("lon")
    if lat is None or lon is None:
        return None
    return float(lat), float(lon)


def great_circle_miles(lat1, lon1, lat2, lon2):
    """Great-circle distance between two points, in miles."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = phi2 - phi1
    delta_lambda = math.radians(lon2 - lon1)
    inner = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * EARTH_RADIUS_MILES * math.asin(min(1.0, math.sqrt(inner)))


def route_distance_miles(origin, destination):
    """Great-circle distance between two airports, in miles (None if unknown)."""
    if not origin or not destination:
        return None
    if origin.strip().upper() == destination.strip().upper():
        return 0.0
    start = _airport_coordinates(origin)
    end = _airport_coordinates(destination)
    if not start or not end:
        return None
    return great_circle_miles(start[0], start[1], end[0], end[1])


def flight_payload(source):
    """Pick the flight fields out of a query dict or JSON body."""
    if not source:
        return {}
    payload = {}
    for field in FLIGHT_FIELDS:
        value = source.get(field)
        if value is None or value == "":
            continue
        payload[field] = value
    return payload


def build_flight_features(payload, origin, destination):
    """Turn a request payload into the raw values the model was trained on.

    Returns ``(numeric_values, month, day_of_week, meta)``. ``numeric_values``
    uses the trained column names; ``meta`` records where each value came
    from and which defaults were applied.
    """
    payload = payload or {}
    meta = {"assumptions": [], "sources": {}}

    departure = _parse_datetime(payload.get("scheduled_departure"))
    arrival = _parse_datetime(payload.get("scheduled_arrival"))
    dep_local_minutes = delay_model.parse_clock(payload.get("scheduled_departure_local"))
    arr_local_minutes = delay_model.parse_clock(payload.get("scheduled_arrival_local"))

    # Scheduled flight time
    elapsed = _as_float(payload.get("scheduled_duration_minutes"))
    if elapsed is not None:
        meta["sources"]["crs_elapsed_time"] = "scheduled_duration_minutes"
    else:
        elapsed = _elapsed_minutes(departure, arrival)
        if elapsed is not None:
            meta["sources"]["crs_elapsed_time"] = "scheduled_arrival - scheduled_departure"
    if elapsed is not None and elapsed <= 0:
        # A non-positive flight time means the timestamps were not comparable.
        elapsed = None
        meta["sources"].pop("crs_elapsed_time", None)

    # Distance
    distance = _as_float(payload.get("distance_miles"))
    if distance is not None:
        meta["sources"]["distance"] = "distance_miles"
    else:
        distance = route_distance_miles(origin, destination)
        if distance is not None:
            meta["sources"]["distance"] = "great-circle distance between airport coordinates"
    if distance is not None and distance < 0:
        distance = None
        meta["sources"].pop("distance", None)

    # Clock times (local clock time at each airport, as the model was trained on)
    dep_minutes = dep_local_minutes
    if dep_minutes is None:
        dep_minutes = delay_model.parse_clock(payload.get("scheduled_departure"))
        if dep_minutes is not None:
            meta["sources"]["dep_sin/cos"] = "scheduled_departure clock time"
    else:
        meta["sources"]["dep_sin/cos"] = "scheduled_departure_local"

    arr_minutes = arr_local_minutes
    if arr_minutes is None:
        arr_minutes = delay_model.parse_clock(payload.get("scheduled_arrival"))
        if arr_minutes is not None:
            meta["sources"]["arr_sin/cos"] = "scheduled_arrival clock time"
    else:
        meta["sources"]["arr_sin/cos"] = "scheduled_arrival_local"

    # Calendar features
    flight_date = _parse_date(payload.get("flight_date"))
    if flight_date is None:
        flight_date = _local_date(departure, dep_minutes) or (
            departure.date() if departure else None
        )
    if flight_date is None:
        flight_date = date.today()
        meta["assumptions"].append("flight date defaulted to today")

    # Observed departure delay
    dep_delay = _as_float(payload.get("departure_delay_minutes"))
    if dep_delay is None:
        dep_delay = 0.0
        meta["assumptions"].append(
            "departure delay assumed to be 0 min (not observed yet)"
        )

    numeric_values = {
        "crs_elapsed_time": elapsed,
        "distance": distance,
        "day_of_month": float(flight_date.day),
        "dep_sin": None,
        "dep_cos": None,
        "arr_sin": None,
        "arr_cos": None,
        "dep_delay": dep_delay,
    }
    if dep_minutes is not None:
        dep_sin, dep_cos = delay_model.cyclic_features(dep_minutes)
        numeric_values["dep_sin"] = dep_sin
        numeric_values["dep_cos"] = dep_cos
    if arr_minutes is not None:
        arr_sin, arr_cos = delay_model.cyclic_features(arr_minutes)
        numeric_values["arr_sin"] = arr_sin
        numeric_values["arr_cos"] = arr_cos

    # BTS day-of-week: 1 = Monday ... 7 = Sunday
    day_of_week = flight_date.isoweekday()

    meta["flight_date"] = flight_date.isoformat()
    meta["day_of_week"] = day_of_week
    meta["missing"] = [
        name
        for name, value in numeric_values.items()
        if value is None
    ]
    return numeric_values, flight_date.month, day_of_week, meta


def flight_summary(flight):
    """The flight fields worth showing next to a prediction."""
    if not flight:
        return None
    return {
        "flight_number": flight.get("flight_number"),
        "airline": flight.get("airline"),
        "origin": flight.get("origin"),
        "destination": flight.get("destination"),
        "status": flight.get("status"),
        "aircraft": flight.get("aircraft"),
        "scheduled_departure": flight.get("scheduled_departure"),
        "scheduled_arrival": flight.get("scheduled_arrival"),
        "scheduled_departure_local": flight.get("scheduled_departure_local"),
        "scheduled_arrival_local": flight.get("scheduled_arrival_local"),
        "actual_departure": flight.get("actual_departure"),
        "scheduled_duration_minutes": flight.get("scheduled_duration_minutes"),
        "departure_delay_minutes": flight.get("departure_delay_minutes"),
    }


def predict_delay_for_flight(flight_number):
    """Predict the arrival delay of a flight, looked up by flight number.

    Everything the model needs — scheduled local clock times, scheduled
    flight time, distance and the observed departure delay — comes from the
    AirLabs flight and schedule endpoints, so the caller only supplies a
    flight number. Returns ``(flight, result)``; ``result`` is None when
    the flight is unknown or nothing can predict for it.
    """
    from flights.services.airlabs import get_flight_details

    flight = get_flight_details(flight_number)
    if not flight:
        return None, None

    airline = flight.get("airline")
    origin = flight.get("origin")
    destination = flight.get("destination")
    if not airline or not origin or not destination:
        return flight, None

    details = {
        "flight_number": flight.get("flight_number"),
        "scheduled_departure": flight.get("scheduled_departure"),
        "scheduled_arrival": flight.get("scheduled_arrival"),
        "scheduled_departure_local": flight.get("scheduled_departure_local"),
        "scheduled_arrival_local": flight.get("scheduled_arrival_local"),
        "scheduled_duration_minutes": flight.get("scheduled_duration_minutes"),
        "departure_delay_minutes": flight.get("departure_delay_minutes"),
    }
    details = {key: value for key, value in details.items() if value is not None}

    result = predict_delay(airline, origin, destination, details)
    return flight, result


def predict_delay(airline, origin, destination, flight=None):
    """Delay prediction for an airline and route.

    Uses the trained model when ``flight`` carries enough features, and
    falls back to the demo table otherwise. Returns a dict, or None when
    neither source can answer.
    """
    if not airline or not origin or not destination:
        return None

    airline = airline.strip().upper()
    origin = origin.strip().upper()
    destination = destination.strip().upper()

    model_result = predict_delay_with_model(airline, origin, destination, flight)
    if model_result is not None:
        return model_result

    entry = DELAY_DATA.get((airline, origin, destination))
    if not entry:
        return None

    avg_dep = entry["avg_departure_delay"]
    avg_arr = entry["avg_arrival_delay"]
    return {
        "airline": airline,
        "airline_name": entry["airline_name"],
        "origin": origin,
        "destination": destination,
        "avg_departure_delay_minutes": avg_dep,
        "avg_arrival_delay_minutes": avg_arr,
        "predicted_departure_delay_minutes": avg_dep,
        "predicted_arrival_delay_minutes": avg_arr,
        "delay_category": classify_delay(avg_dep),
        "delay_category_basis": "predicted_departure_delay_minutes",
        "data_source": "demo",
        "note": DEMO_NOTE,
        "model": delay_model.model_status(),
    }


def predict_delay_with_model(airline, origin, destination, flight):
    """Run the trained model, or return None when it cannot be used."""
    if not flight:
        return None

    numeric_values, month, day_of_week, meta = build_flight_features(
        flight, origin, destination
    )
    missing = meta.get("missing") or []
    if missing:
        return None

    try:
        prediction = delay_model.predict_arrival_delay(numeric_values, month, day_of_week)
    except Exception:
        return None
    if prediction is None:
        return None

    departure_delay = numeric_values["dep_delay"]
    return {
        "airline": airline,
        "airline_name": airline_display_name(airline),
        "origin": origin,
        "destination": destination,
        "flight_number": (flight.get("flight_number") or "").strip().upper() or None,
        "avg_departure_delay_minutes": departure_delay,
        "avg_arrival_delay_minutes": round(prediction, 1),
        "predicted_departure_delay_minutes": departure_delay,
        "predicted_arrival_delay_minutes": round(prediction, 1),
        "delay_category": classify_delay(prediction),
        "delay_category_basis": "predicted_arrival_delay_minutes",
        "data_source": "model",
        "note": MODEL_NOTE,
        "model": delay_model.model_status(),
        "features": {
            "crs_elapsed_time": numeric_values["crs_elapsed_time"],
            "distance_miles": round(numeric_values["distance"], 1),
            "day_of_month": int(numeric_values["day_of_month"]),
            "month": month,
            "day_of_week": day_of_week,
            "departure_delay_minutes": departure_delay,
            "flight_date": meta["flight_date"],
        },
        "assumptions": meta["assumptions"],
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
