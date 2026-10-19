# ML Demo Data — Hardcoded Values, Rules & Limitations

Both prediction features in this first version use **small, hardcoded,
deterministic demo datasets**. Nothing here is a trained or validated ML
model, and none of the averages/scores are verified historical or
operational statistics. Every API response carries `"data_source": "demo"`
and every result screen shows a demo-data label.

Hardcoded data lives **only** in the backend:

- `backend/ml/delay_data.py` — airline-route delay averages
- `backend/ml/congestion_data.py` — airport congestion scores + forecasts
- `backend/ml/services.py` — classification/prediction functions (threshold rules only)

The React frontend (`frontend/src/pages/DelayPrediction.jsx`,
`frontend/src/pages/CongestionPrediction.jsx`,
`frontend/src/services/predictions.js`) contains **no** prediction numbers —
it renders whatever the Django API returns.

---

## 1. Delay dataset — airline-route combinations (14)

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

## 2. Delay classification rule

File: `backend/ml/services.py::classify_delay`. Based on the **average
departure delay** in minutes:

- ≤ 5 → **On Time**
- 6 – 30 → **Minor Delay**
- \> 30 → **Major Delay**

## 3. Congestion dataset — airports (10)

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

## 4. Congestion classification rule

File: `backend/ml/services.py::classify_congestion`. Based on the 0–100 score:

- 0 – 39 → **Low**
- 40 – 64 → **Moderate**
- 65 – 84 → **High**
- 85 – 100 → **Severe**

Forecast values are fixed illustrative entries per airport, not computed.

## 5. Which displayed values are real vs hardcoded

**From existing live APIs (real, labelled as live):**
- Delay page flight lookup: flight number, airline, origin, destination,
  status (via `GET /api/flights/search/?flight=`).
- Congestion page airport name/coords and departure/arrival activity counts
  (via `GET /api/airports/<code>/` and `GET /api/airports/<code>/flights/`).

**Hardcoded demo (labelled demo, `data_source: "demo"`):**
- All average/predicted delays, delay categories, congestion scores,
  congestion categories, and 1h/3h/6h forecasts.

## 6. Assumptions & limitations

1. Demo averages are invented for UI demonstration; do not quote them as
   airline or airport performance facts.
2. Unsupported airline-route or airport inputs return HTTP 404 with an
   explicit error — never another entry's numbers.
3. The delay prediction does not consider day, season, aircraft, weather,
   or live traffic; the congestion forecast does not consider time of day,
   events, or real operations.
4. No database migrations, no new dependencies, no external API keys added
   (`recharts` etc. intentionally not installed — charts are pure CSS).
5. To replace with a real model later: keep the URL/response contracts and
   reimplement `backend/ml/services.py` against trained artifacts; update
   this file accordingly.
