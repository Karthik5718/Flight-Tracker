# ML Predictions — Trained Model, Demo Fallback, Rules & Limitations

The **flight delay prediction** is served by a trained model
(`ML/arrival_delay_model.pt`); the hardcoded demo table is only a fallback
for requests that do not carry enough flight details (or for environments
where PyTorch/the artifact is unavailable). The **airport congestion**
feature is still a hardcoded demo dataset.

Responses say which source produced them: `"data_source": "model"` or
`"data_source": "demo"`, and the UI labels the result accordingly.

The React frontend (`frontend/src/pages/DelayPrediction.jsx`,
`frontend/src/pages/CongestionPrediction.jsx`,
`frontend/src/services/predictions.js`) contains **no** prediction numbers —
it renders whatever the Django API returns.

---

## 1. Trained arrival-delay model

| | |
|---|---|
| Artifact | `ML/arrival_delay_model.pt` (`torch.save` bundle: `state_dict`, `config`, `x_mean`, `x_scale`, `metrics`) |
| Trained by | `ML/arrival_delay_training.ipynb` |
| Training data | US BTS 2024 on-time performance data (`ML/flight_data_2024.csv`) |
| Architecture | MLP `27 → 256 → 128 → 64 → 1` (BatchNorm + ReLU + Dropout 0.2) |
| Target | `arr_delay` — arrival delay in minutes (negative = early) |
| Held-out metrics | val MAE **8.85** min · test MAE **9.80** min · test RMSE **13.70** min · test R² **0.934** |

**Serving code**

- `backend/ml/delay_model.py` — loads and caches the artifact, rebuilds the
  network from `config["hidden"]`, and rebuilds the feature row exactly the
  way the notebook did (same column order, same one-hot encoding, same
  scaler). PyTorch is imported optionally: when it is missing the API falls
  back to the demo table instead of failing.
- `backend/ml/services.py` — turns a request into model inputs, computes
  the route distance, and picks the model or the demo table.
- `backend/flights/services/airlabs.py` — the flight lookup also pulls the
  AirLabs **schedule** for the flight (scheduled local times, duration,
  actual departure), so the model inputs are complete. The AirLabs live
  endpoint returns position data only.

**Model inputs (27 features)**

| # | Feature | Source |
|---|---|---|
| 0 | `crs_elapsed_time` | scheduled flight time in minutes (`scheduled_duration_minutes`, else arrival − departure) |
| 1 | `distance` | great-circle miles between the two airports (airport coordinates) |
| 2 | `day_of_month` | flight date |
| 3–4 | `dep_sin`, `dep_cos` | scheduled **local** departure clock time |
| 5–6 | `arr_sin`, `arr_cos` | scheduled **local** arrival clock time |
| 7 | `dep_delay` | **observed** departure delay in minutes (0 when the flight has not departed yet) |
| 8–19 | month one-hot | flight date |
| 20–26 | day-of-week one-hot | flight date (1 = Monday … 7 = Sunday, as in BTS) |

The model was trained on **US** carriers and airports and carries no
airline, airport or carrier codes, so it generalises to other routes —
but its feature distributions (mean distance ≈ 837 mi, mean scheduled
flight time ≈ 147 min) are US-centric.

**Request contract**

The flight number is the only thing a client has to supply — the backend
looks the flight up and derives every model input from the AirLabs flight
and schedule endpoints:

```
POST /api/ml/delay-prediction/   {"flight_number": "6E754"}
```

The response carries the looked-up flight next to the prediction:

```json
{
  "airline": "6E", "airline_name": "IndiGo", "origin": "DEL", "destination": "COK",
  "flight_number": "6E754",
  "predicted_departure_delay_minutes": -10,
  "predicted_arrival_delay_minutes": -10.6,
  "delay_category": "On Time",
  "delay_category_basis": "predicted_arrival_delay_minutes",
  "data_source": "model",
  "note": "Predicted by the trained arrival-delay model ...",
  "model": {"name": "arrival_delay_model.pt", "architecture": "MLP 27-256-128-64-1",
            "metrics": {"val_mae": 8.85, "test_mae": 9.8, "test_rmse": 13.7, "test_r2": 0.934}},
  "features": {"crs_elapsed_time": 190, "distance_miles": 1272.8, "day_of_month": 19,
               "month": 10, "day_of_week": 1, "departure_delay_minutes": -10,
               "flight_date": "2026-10-19"},
  "assumptions": [],
  "flight": {"flight_number": "6E754", "airline": "6E", "origin": "DEL",
             "destination": "COK", "status": "en-route",
             "scheduled_departure_local": "2026-10-19 17:10",
             "scheduled_arrival_local": "2026-10-19 20:20",
             "scheduled_duration_minutes": 190, "departure_delay_minutes": -10}
}
```

A route-only lookup stays available for tooling and for the demo table:

```
GET /api/ml/delay-prediction/?airline=6E&origin=DEL&destination=BOM
```

It answers from the demo table unless the request also carries flight
details (`scheduled_departure_local`, `scheduled_arrival_local`,
`scheduled_duration_minutes`, `departure_delay_minutes`, `flight_date`),
in which case the model runs.

**Response (model)**

```json
{
  "airline": "6E", "airline_name": "IndiGo", "origin": "DEL", "destination": "BOM",
  "flight_number": "6E216",
  "predicted_departure_delay_minutes": 12,
  "predicted_arrival_delay_minutes": 10.1,
  "delay_category": "Minor Delay",
  "delay_category_basis": "predicted_arrival_delay_minutes",
  "data_source": "model",
  "note": "Predicted by the trained arrival-delay model ...",
  "model": {"name": "arrival_delay_model.pt", "architecture": "MLP 27-256-128-64-1",
            "metrics": {"val_mae": 8.85, "test_mae": 9.8, "test_rmse": 13.7, "test_r2": 0.934}},
  "features": {"crs_elapsed_time": 150, "distance_miles": 1179, "day_of_month": 19,
               "month": 10, "day_of_week": 1, "departure_delay_minutes": 12,
               "flight_date": "2026-10-19"},
  "assumptions": []
}
```

---

## 2. Demo delay dataset — airline-route combinations (14) *(fallback only)*

File: `backend/ml/delay_data.py`, keyed by `(AIRLINE_IATA, ORIGIN, DESTINATION)`.
Airline codes match the website's existing `airline` field (AirLabs
`airline_iata`); airports match the existing `origin` / `destination` IATA fields.

| Airline | Route | Avg departure delay (min) | Avg arrival delay (min) | Category |
|---|---|---|---|---|
| 6E (IndiGo) | DEL → BOM | 12 | 8 | Minor Delay |
| 6E (IndiGo) | BOM → DEL | 18 | 14 | Minor Delay |
| 6E (IndiGo) | DEL → CCU | 28 | 24 | Minor Delay |
| AI (Air India) | DEL → BOM | 25 | 21 | Minor Delay |
| AI (Air India) | DEL → BLR | 35 | 31 | Major Delay |
| UK (Vistara) | DEL → BOM | 4 | 2 | On Time |
| UK (Vistara) | BOM → BLR | 6 | 4 | Minor Delay |
| SG (SpiceJet) | DEL → MAA | 42 | 38 | Major Delay |
| QP (Akasa Air) | DEL → HYD | 3 | 1 | On Time |
| QP (Akasa Air) | HYD → DEL | 9 | 7 | Minor Delay |
| EK (Emirates) | BOM → DXB | 15 | 11 | Minor Delay |
| QR (Qatar Airways) | BOM → DOH | 5 | 3 | On Time |
| BA (British Airways) | DEL → LHR | 55 | 48 | Major Delay |
| LH (Lufthansa) | BLR → FRA | 22 | 19 | Minor Delay |

Predicted departure delay = configured avg departure delay;
predicted arrival delay = configured avg arrival delay (no hidden formula).

## 3. Delay classification rule

File: `backend/ml/services.py::classify_delay`. Based on a delay in minutes
(the model path classifies the **predicted arrival delay**, the demo path the
average departure delay):

- ≤ 5 → **On Time**
- 6 – 30 → **Minor Delay**
- \> 30 → **Major Delay**

## 4. Congestion dataset — airports (10) *(still demo)*

File: `backend/ml/congestion_data.py`, keyed by airport IATA code
(same codes as `GET /api/airports/<code>/`).

| Airport | Name | Score (0–100) | Category | +1h | +3h | +6h |
|---|---|---|---|---|---|---|
| DEL | Indira Gandhi International Airport, Delhi | 78 | High | 82 | 74 | 61 |
| BOM | Chhatrapati Shivaji Maharaj International Airport, Mumbai | 88 | Severe | 91 | 83 | 70 |
| BLR | Kempegowda International Airport, Bengaluru | 62 | Moderate | 66 | 58 | 47 |
| MAA | Chennai International Airport | 45 | Moderate | 50 | 43 | 35 |
| HYD | Rajiv Gandhi International Airport, Hyderabad | 55 | Moderate | 60 | 52 | 44 |
| CCU | Netaji Subhas Chandra Bose International Airport, Kolkata | 38 | Low | 42 | 36 | 29 |
| COK | Cochin International Airport, Kochi | 25 | Low | 28 | 24 | 20 |
| GOI | Goa International Airport, Dabolim | 30 | Low | 34 | 29 | 22 |
| PNQ | Pune Airport | 68 | High | 72 | 64 | 51 |
| AMD | Sardar Vallabhbhai Patel International Airport, Ahmedabad | 52 | Moderate | 56 | 49 | 41 |

## 5. Congestion classification rule

File: `backend/ml/services.py::classify_congestion`. Based on the 0–100 score:

- 0 – 39 → **Low**
- 40 – 64 → **Moderate**
- 65 – 84 → **High**
- 85 – 100 → **Severe**

Forecast values are fixed illustrative entries per airport, not computed.

## 6. Which displayed values are real vs hardcoded

**From existing live APIs (real, labelled as live):**
- Delay page flight lookup: flight number, airline, origin, destination,
  status, scheduled local times, scheduled duration and observed delays
  (via `GET /api/flights/search/?flight=` and the AirLabs schedule
  endpoint behind it).
- Congestion page airport name/coords and departure/arrival activity counts
  (via `GET /api/airports/<code>/` and `GET /api/airports/<code>/flights/`).

**From the trained model (`data_source: "model"`):**
- The predicted arrival delay and its delay category.

**Hardcoded demo (labelled demo, `data_source: "demo"`):**
- The fallback airline-route averages, and all congestion scores,
  congestion categories, and 1h/3h/6h forecasts.

## 7. Assumptions & limitations

1. The model is trained on **US** 2024 BTS data. Indian routes are out of
   its training distribution, so treat the numbers as an estimate.
2. The model needs the **observed departure delay**. Before a flight
   departs that value is unknown and is assumed to be 0 min (the response
   lists this under `assumptions`).
3. The model is a **post-departure** arrival predictor: it does not predict
   departure delay, and it ignores carrier, airport, aircraft, weather and
   live traffic.
4. The demo averages are invented for UI demonstration; do not quote them as
   airline or airport performance facts.
5. Unsupported airline-route or airport inputs return HTTP 404 with an
   explicit error — never another entry's numbers.
6. The congestion forecast does not consider time of day, events, or real
   operations; it is still hardcoded.
7. `torch` and `numpy` are now listed in `requirements.txt`. Without them
   the delay endpoint keeps working on the demo table and reports
   `"data_source": "demo"`.
