"""
Hardcoded DEMO dataset for Airport Congestion Prediction (first version).

Every value below is illustrative demo data — NOT genuine operational
airport statistics. See ML_DEMO_DATA.md in the repo root for the full
table, classification rules, and limitations.

Conventions (match the rest of the website):
- Keys are the same airport IATA codes the website already uses
  (`/api/airports/<code>/`).
- `name` values match the familiar airport names; the live airport-info
  endpoint remains the source of truth for real names/coordinates.
- `congestion_score` is 0-100. `forecast_1h/3h/6h` are the illustrative
  congestion scores for the next 1, 3, and 6 hours.
- No live activity counts are stored here: the frontend fetches live
  departure/arrival counts from the existing
  `GET /api/airports/<code>/flights/` endpoint and labels them as live.

Lookup key: IATA code, uppercase.
Edit by adding/removing entries — no other code changes needed.
"""

CONGESTION_DATA = {
    # iata: {name, congestion_score, forecast_1h, forecast_3h, forecast_6h}
    "DEL": {"name": "Indira Gandhi International Airport, Delhi", "congestion_score": 78, "forecast_1h": 82, "forecast_3h": 74, "forecast_6h": 61},
    "BOM": {"name": "Chhatrapati Shivaji Maharaj International Airport, Mumbai", "congestion_score": 88, "forecast_1h": 91, "forecast_3h": 83, "forecast_6h": 70},
    "BLR": {"name": "Kempegowda International Airport, Bengaluru", "congestion_score": 62, "forecast_1h": 66, "forecast_3h": 58, "forecast_6h": 47},
    "MAA": {"name": "Chennai International Airport", "congestion_score": 45, "forecast_1h": 50, "forecast_3h": 43, "forecast_6h": 35},
    "HYD": {"name": "Rajiv Gandhi International Airport, Hyderabad", "congestion_score": 55, "forecast_1h": 60, "forecast_3h": 52, "forecast_6h": 44},
    "CCU": {"name": "Netaji Subhas Chandra Bose International Airport, Kolkata", "congestion_score": 38, "forecast_1h": 42, "forecast_3h": 36, "forecast_6h": 29},
    "COK": {"name": "Cochin International Airport, Kochi", "congestion_score": 25, "forecast_1h": 28, "forecast_3h": 24, "forecast_6h": 20},
    "GOI": {"name": "Goa International Airport, Dabolim", "congestion_score": 30, "forecast_1h": 34, "forecast_3h": 29, "forecast_6h": 22},
    "PNQ": {"name": "Pune Airport", "congestion_score": 68, "forecast_1h": 72, "forecast_3h": 64, "forecast_6h": 51},
    "AMD": {"name": "Sardar Vallabhbhai Patel International Airport, Ahmedabad", "congestion_score": 52, "forecast_1h": 56, "forecast_3h": 49, "forecast_6h": 41},
}
