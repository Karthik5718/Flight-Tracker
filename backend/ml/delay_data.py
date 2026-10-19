"""
Hardcoded DEMO dataset for Flight Delay Prediction (first version).

Every value below is illustrative demo data — NOT verified historical
airline statistics. See ML_DEMO_DATA.md in the repo root for the full
table, classification rules, and limitations.

Conventions (match the rest of the website):
- `airline` uses the same airline IATA codes the website already displays
  in its `airline` field (sourced from AirLabs `airline_iata`).
- `origin` / `destination` use the same airport IATA codes the website
  already displays in its `origin` / `destination` fields.
- Delays are in whole minutes and represent the configured *average*
  delay for that specific airline-route combination.

Lookup key: (AIRLINE_IATA, ORIGIN_IATA, DESTINATION_IATA), all uppercase.
Edit by adding/removing entries — no other code changes needed.
"""

DELAY_DATA = {
    # (airline, origin, destination): {airline_name, avg_departure_delay, avg_arrival_delay}
    ("6E", "DEL", "BOM"): {"airline_name": "IndiGo", "avg_departure_delay": 12, "avg_arrival_delay": 8},
    ("6E", "BOM", "DEL"): {"airline_name": "IndiGo", "avg_departure_delay": 18, "avg_arrival_delay": 14},
    ("6E", "DEL", "CCU"): {"airline_name": "IndiGo", "avg_departure_delay": 28, "avg_arrival_delay": 24},
    ("AI", "DEL", "BOM"): {"airline_name": "Air India", "avg_departure_delay": 25, "avg_arrival_delay": 21},
    ("AI", "DEL", "BLR"): {"airline_name": "Air India", "avg_departure_delay": 35, "avg_arrival_delay": 31},
    ("UK", "DEL", "BOM"): {"airline_name": "Vistara", "avg_departure_delay": 4, "avg_arrival_delay": 2},
    ("UK", "BOM", "BLR"): {"airline_name": "Vistara", "avg_departure_delay": 6, "avg_arrival_delay": 4},
    ("SG", "DEL", "MAA"): {"airline_name": "SpiceJet", "avg_departure_delay": 42, "avg_arrival_delay": 38},
    ("QP", "DEL", "HYD"): {"airline_name": "Akasa Air", "avg_departure_delay": 3, "avg_arrival_delay": 1},
    ("QP", "HYD", "DEL"): {"airline_name": "Akasa Air", "avg_departure_delay": 9, "avg_arrival_delay": 7},
    ("EK", "BOM", "DXB"): {"airline_name": "Emirates", "avg_departure_delay": 15, "avg_arrival_delay": 11},
    ("QR", "BOM", "DOH"): {"airline_name": "Qatar Airways", "avg_departure_delay": 5, "avg_arrival_delay": 3},
    ("BA", "DEL", "LHR"): {"airline_name": "British Airways", "avg_departure_delay": 55, "avg_arrival_delay": 48},
    ("LH", "BLR", "FRA"): {"airline_name": "Lufthansa", "avg_departure_delay": 22, "avg_arrival_delay": 19},
}
