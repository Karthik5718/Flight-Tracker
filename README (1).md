# Aviation Intelligence Platform — MVP Roadmap

**Scope of this document:** Core, deployable-later foundation only — from project setup through **searching a flight or airport, selecting a real flight, and viewing its details + latest position on the map**. ML features and production deployment are documented at the bottom as **deferred/future work** and are intentionally out of scope for this build pass.

---

## 1. Tech Stack

```text
FRONTEND
React
Vite
JavaScript (.jsx — no TypeScript)
React Router
Mapbox GL JS
Three.js (later, deferred)

BACKEND
Python
Django
Django REST Framework
Django Channels (only if genuinely needed)
Celery (only if genuinely needed)

DATABASE
SQLite   → Development
PostgreSQL → Production

CACHE
Redis

EXTERNAL APIs
AirLabs
AeroDataBox
Open-Meteo
Mapbox

ML
Deferred completely — not part of this build pass
```

**Note on the database:** Django models must be written in a PostgreSQL-compatible way (avoid SQLite-only field behaviors), but PostgreSQL itself is **not required during development**. Local dev runs on SQLite for simplicity; production deployment switches to PostgreSQL via `DATABASE_URL`/env config, no code changes needed.

---

## 2. Fixed API Responsibility Matrix

No fallback chains. No cross-calling another provider to fill a missing field. Missing data = `null` / "Not available".

| Feature | AirLabs | AeroDataBox | Open-Meteo | Mapbox |
|---|---|---|---|---|
| Live lat/lon, altitude, speed, heading | ✓ | — | — | — |
| Flight number, callsign, airline, aircraft | ✓ | — | — | — |
| Status, schedule, delay, gate, terminal | ✓ | — | — | — |
| Airport info, IATA/ICAO, coordinates | — | ✓ | — | — |
| Runways, terminals, gates | — | ✓ | — | — |
| Airport arrivals / departures (FIDS) | — | ✓ | — | — |
| Temperature, wind, precipitation, visibility, pressure | — | — | ✓ | — |
| Maps, markers, routes, navigation | — | — | — | ✓ |

**Rule:** `AirLabs → gate`. If AirLabs has no gate → `gate = null`. Never `AirLabs → AeroDataBox → gate`.

**MVP search behavior derived from this matrix:**
- Search by **flight number** → AirLabs (flight/live data).
- Search by **airport IATA/ICAO code** → AeroDataBox (arrivals/departures list at that airport). Selecting a flight from that list then pulls its live details from AirLabs by flight number, same as a direct flight search.

---

## 3. Data Flow

```
React → Django REST API → Cache (Redis) → External Provider
```

Frontend never calls AirLabs / AeroDataBox / Open-Meteo directly. Only Mapbox is called client-side (for map tiles/rendering).

---

## 4. MVP Phase Plan

### PHASE 0 — Requirements & Architecture Freeze
**Objective:** Lock scope, tech stack, API matrix, and folder structure before any code is written.
**Sub-phases:**
- 0.1 Confirm tech stack and repo layout (monorepo: `/backend`, `/frontend`)
- 0.2 Confirm API responsibility matrix (this doc = source of truth)
- 0.3 Confirm environment variable naming (`AIRLABS_API_KEY`, `AERODATABOX_API_KEY`, `VITE_MAPBOX_TOKEN`)
- 0.4 Confirm DB strategy: SQLite (dev) / PostgreSQL (prod), same Django models for both

**Acceptance criteria:** This README is committed as `ARCHITECTURE.md` in repo root; no code exists yet.

---

### PHASE 1 — Repository & Project Setup
**Objective:** Create the skeleton repo with backend and frontend scaffolds that boot successfully.
**Sub-phases:**
- 1.1 Init git repo, `.gitignore`, root `README.md`
- 1.2 Django project scaffold (`backend/`), virtualenv, `requirements.txt`, SQLite as the default local DB
- 1.3 React scaffold via **Vite + JavaScript** (`frontend/`) — `.jsx` files, no TypeScript, no CRA
- 1.4 Install React Router; base folder structure (`src/pages`, `src/components`, `src/services`)
- 1.5 `.env.example` files for both backend (`AIRLABS_API_KEY`, `AERODATABOX_API_KEY`) and frontend (`VITE_MAPBOX_TOKEN`) — no real keys committed

**Backend work:** `django-admin startproject core`, base settings split (`base.py`, `dev.py` using SQLite, `prod.py` using PostgreSQL via env).
**Frontend work:** App shell, routing installed, base layout component, all files `.jsx`.
**Testing:** `python manage.py runserver` boots; `npm run dev` boots; both render a placeholder page.
**Acceptance criteria:** Both servers run locally with zero errors; empty routes wired; no `.tsx`/TypeScript config present.

**Coding-agent prompt:**
> Set up a monorepo with `/backend` (Django + DRF, SQLite for local dev, PostgreSQL-ready settings for production via env vars) and `/frontend` (React + **Vite + JavaScript**, `.jsx` files only — do not use TypeScript or Create React App). Install React Router. Do not implement any features yet — only scaffolding, base settings (`dev.py` / `prod.py` split), `.env.example` files, and a placeholder home route on each side that confirms the app boots. Do not hardcode any API keys. Report files created and how to run each server.

---

### PHASE 2 — Django Foundation
**Objective:** Establish REST framework, base app structure, and settings needed by every later phase.
**Sub-phases:**
- 2.1 Install & configure DRF, CORS headers, environment-based settings (SQLite dev / PostgreSQL prod switch via `DATABASE_URL`)
- 2.2 Create Django apps: `accounts`, `flights`, `airports`, `weather`, `tracking`
- 2.3 Base URL routing (`/api/...` namespace) with placeholder views
- 2.4 Health-check endpoint (`/api/health/`)

**Testing:** `/api/health/` returns 200 with a JSON status payload, running on SQLite.
**Acceptance criteria:** DRF browsable API works locally; CORS allows the Vite dev server origin.

**Coding-agent prompt:**
> Inspect the existing Django scaffold from Phase 1. Add Django REST Framework, `django-cors-headers`, and create empty Django apps: `accounts`, `flights`, `airports`, `weather`, `tracking`. Wire a `/api/health/` endpoint returning `{"status": "ok"}`. Confirm settings default to SQLite locally and can switch to PostgreSQL via env var in production without code changes. Do not implement business logic yet. Do not hardcode secrets. Report files changed and confirm the health endpoint works.

---

### PHASE 3 — Database Foundation
**Objective:** Stand up the minimum schema needed for auth + flight/airport caching, written to work identically on SQLite (dev) and PostgreSQL (prod).
**Sub-phases:**
- 3.1 Confirm DB config: SQLite file for local dev, PostgreSQL connection via env vars for prod (same models, no branching logic in model code)
- 3.2 Define initial models: `User` (custom), `ATCProfile`
- 3.3 Define caching-support models: `Flight`, `FlightPosition`, `Airport` (normalized, minimal fields for now)
- 3.4 Migrations + admin registration

**Database work (minimum schema for MVP):**
- `User`: extends Django's user model, adds `role` (`normal` / `atc`)
- `ATCProfile`: `user` FK, `atc_number`, `verified` (bool, defaults False)
- `Flight`: normalized flight snapshot (`flight_number`, `airline`, `aircraft`, `status`, `origin`, `destination`, schedule/estimate/actual timestamps, `gate`, `terminal`, `updated_at`)
- `FlightPosition`: `flight` FK, `lat`, `lon`, `altitude`, `speed`, `heading`, `timestamp` — this table also seeds future ML data
- `Airport`: `iata`, `icao`, `name`, `lat`, `lon`, `runways` (JSON), `terminals` (JSON), `gates` (JSON), `updated_at`

**Testing:** Migrations apply cleanly on SQLite; admin panel shows all models; can manually create/query test rows.
**Acceptance criteria:** Schema matches normalized internal format (not raw API shape), avoids SQLite-only field types, ready for Phase 5's adapters.

**Coding-agent prompt:**
> Using the existing Django apps from Phase 2, add a custom `User` model with a `role` field (`normal`/`atc`), an `ATCProfile` model, and normalized caching models `Flight`, `FlightPosition`, and `Airport` as specified in this phase. Fields must reflect an internal normalized format, not any specific third-party API's response shape, and must use field types compatible with both SQLite and PostgreSQL. Create and run migrations against SQLite. Register models in Django admin. Do not implement any API integration yet. Report the schema created.

---

### PHASE 4 — Authentication & Roles
**Objective:** Working signup/login with `normal` vs `atc` roles, enforced server-side.
**Sub-phases:**
- 4.1 Token or session auth (DRF SimpleJWT recommended)
- 4.2 Register/login/logout endpoints
- 4.3 ATC registration flow (collects `atc_number`, sets `verified=False` by default; simple admin-approval flag for the prototype — no real employment verification)
- 4.4 Permission classes: `IsATCVerified` for future ATC-only endpoints
- 4.5 Frontend: Login/Register pages (`.jsx`), auth context, protected routes

**Testing:** Register normal user, register ATC user, login returns token, protected endpoint rejects unauthenticated/unauthorized requests.
**Acceptance criteria:** A normal user cannot access an endpoint decorated with `IsATCVerified`; enforcement is server-side, not just hidden in the UI.

**Coding-agent prompt:**
> Implement authentication using DRF SimpleJWT (or DRF's session auth if simpler) on top of the `User`/`ATCProfile` models from Phase 3. Add register, login, logout endpoints. ATC registration must collect an ATC number and default `verified=False` — do not treat the number alone as proof of employment. Add a permission class that blocks unverified/non-ATC users from ATC-only endpoints. Build matching React (`.jsx`, no TypeScript) pages (Login, Register, ATC Register) with an auth context and protected route wrapper. Backend authorization is mandatory — do not rely on frontend-only role checks. Report endpoints created and how they were tested.

---

### PHASE 5 — Provider Adapter Layer & Normalized Schemas
**Objective:** Define the adapter contracts and serializers *before* wiring any real provider, so AirLabs/AeroDataBox/Open-Meteo integrations are built correctly the first time instead of needing a later rewrite.
**Sub-phases:**
- 5.1 Define adapter interfaces (empty/stub implementations for now): `airlabs_to_flight()`, `aerodatabox_to_airport()`, `aerodatabox_to_flight_list()` (for arrivals/departures), `open_meteo_to_weather()`
- 5.2 Define DRF serializers matching the normalized internal shapes exactly (`FlightSerializer`, `FlightPositionSerializer`, `AirportSerializer`, `WeatherSerializer`)
- 5.3 Define the shared "missing field → `null`" convention as a documented helper (e.g. a `safe_get()` utility used by every adapter)
- 5.4 Document each adapter's expected input (raw provider shape) and output (normalized shape) with inline comments/docstrings only — no real HTTP calls yet

**Testing:** Unit tests for each adapter using hand-written mock provider payloads (including partial/missing-field payloads), asserting the normalized output shape.
**Acceptance criteria:** Adapters and serializers exist and are tested against mock data; Phases 6–8 will plug real HTTP clients into these adapters rather than inventing their own mapping logic.

**Coding-agent prompt:**
> Create adapter modules and DRF serializers that define the normalized internal shapes for `Flight`, `FlightPosition`, `Airport`, and `Weather`, matching the models from Phase 3. Adapters (`airlabs_to_flight()`, `aerodatabox_to_airport()`, `aerodatabox_to_flight_list()`, `open_meteo_to_weather()`) should accept a raw provider-shaped dict and return a normalized dict/model instance, with any missing field mapped to `null` via a shared helper. Do not implement real HTTP calls to any provider in this phase — write unit tests using hand-crafted mock payloads, including payloads with missing fields, to prove the adapters behave correctly. Report the adapter interfaces created.

---

### PHASE 6 — AirLabs Integration
**Objective:** A working backend service that calls AirLabs and returns normalized flight/live data through the Phase 5 adapters — the first real external API wired in.
**Sub-phases:**
- 6.1 AirLabs client module (`backend/flights/services/airlabs.py`), reads key from env, no key in code
- 6.2 Endpoint: search flight by flight number
- 6.3 Endpoint: fetch latest available position for a flight/set of flights
- 6.4 Route raw AirLabs responses through the `airlabs_to_flight()` adapter from Phase 5 — no ad-hoc mapping in this phase
- 6.5 Missing-field handling: any field AirLabs doesn't return becomes `null` — no calls to any other provider

**Testing:** Manual test against a real flight number returns normalized JSON via the serializer; a field AirLabs doesn't provide comes back `null`, not an error.
**Acceptance criteria:** `/api/flights/search/?flight=XXXX` and `/api/tracking/positions/` return normalized data sourced only from AirLabs, using the Phase 5 adapter/serializer — not new mapping code.

**Coding-agent prompt:**
> Implement an AirLabs integration in the `flights` app: a service module that calls the AirLabs API using a key from environment variables (never hardcoded, never exposed to frontend), plus DRF endpoints to search a flight by flight number and fetch the latest available position data. Route all responses through the `airlabs_to_flight()` adapter and serializers from Phase 5 — do not write new mapping logic or pass raw provider JSON to the frontend. If AirLabs does not return a field, it must come back as `null`; do not call AeroDataBox or any other provider to fill it. Add tests confirming normalization and null-handling. Report endpoints and sample responses.

---

### PHASE 7 — AeroDataBox Integration
**Objective:** Backend service for airport lookup and arrivals/departures, fully separate responsibility from AirLabs, sufficient to support **airport-code search in the MVP** without building the full Airport Page yet.
**Sub-phases:**
- 7.1 AeroDataBox client module (`backend/airports/services/aerodatabox.py`)
- 7.2 Endpoint: airport lookup by IATA/ICAO (name, coordinates — minimal fields needed for MVP search context)
- 7.3 Endpoint: arrivals/departures (FIDS) for an airport code — this is what powers MVP airport search
- 7.4 Route responses through `aerodatabox_to_airport()` and `aerodatabox_to_flight_list()` adapters from Phase 5
- 7.5 Missing-field handling: `null`, no cross-calls to AirLabs

**Testing:** Lookup a real airport code and confirm a normalized list of arrivals/departures; missing data returns `null` cleanly, not an error.
**Acceptance criteria:** `/api/airports/{code}/flights/` returns a normalized list of flights at that airport, sourced only from AeroDataBox, usable directly by the MVP search flow in Phase 11. (The full Airport Page — runways, terminals, gates UI, navigation — remains deferred; see Section 6.)

**Coding-agent prompt:**
> Implement an AeroDataBox integration in the `airports` app: a service module using an env-based API key, a DRF endpoint for basic airport lookup by IATA/ICAO code, and a DRF endpoint returning arrivals/departures (FIDS) for that airport code. Route responses through the `aerodatabox_to_airport()` and `aerodatabox_to_flight_list()` adapters from Phase 5. Any field AeroDataBox doesn't return must be `null` — do not call AirLabs or any other provider to supplement it. This is scoped only to support flight search by airport code; do not build the full Airport Page (runways/terminals/gates UI, navigation) in this phase. Add tests for normalization and missing-field handling. Report endpoints and sample responses.

---

### PHASE 8 — Open-Meteo Integration
**Objective:** Backend weather service, decoupled from both aviation providers, routed through the Phase 5 adapter.
**Sub-phases:**
- 8.1 Open-Meteo client module (`backend/weather/services/open_meteo.py`) — no API key required for Open-Meteo, but keep it modular
- 8.2 Endpoint: current weather + short forecast by lat/lon
- 8.3 Route responses through `open_meteo_to_weather()` adapter from Phase 5

**Testing:** Query weather for a known airport's coordinates and get normalized output.
**Acceptance criteria:** `/api/weather/?lat=..&lon=..` returns normalized weather data, used later by Flight Details.

**Coding-agent prompt:**
> Implement an Open-Meteo integration in the `weather` app: a service module and a DRF endpoint that accepts lat/lon and returns current weather plus short forecast, routed through the `open_meteo_to_weather()` adapter and serializer from Phase 5. Do not use AirLabs or AeroDataBox as weather sources. Add basic tests. Report the endpoint and a sample response.

---

### PHASE 9 — Caching & Controlled Polling
**Objective:** Make searches and position lookups efficient — cache AirLabs/AeroDataBox/Open-Meteo responses in Redis, control refresh frequency, avoid redundant external calls.
**Sub-phases:**
- 9.1 Redis setup, cache keys per flight number / per airport code / per lat-lon-rounded weather query
- 9.2 TTL strategy: latest flight position ~15-30s, flight schedule/status ~1-2min, airport arrivals/departures list ~1-2min, weather ~10-15min
- 9.3 Backend on-demand-with-cache pattern (Celery optional — only introduce if on-demand caching proves insufficient)
- 9.4 Rate-limit/backoff handling for AirLabs/AeroDataBox quotas
- 9.5 Every cached response includes a `last_updated` timestamp passed through to the frontend, so the UI can show "Last updated: Xs ago" instead of implying true real-time data

**Testing:** Repeated requests within TTL window hit cache, not the external provider; verify via logging/call counters; confirm `last_updated` is present and accurate in responses.
**Acceptance criteria:** External API calls are demonstrably reduced under repeated frontend polling; stale-data threshold is respected; every position/flight/weather response is timestamped.

**Coding-agent prompt:**
> Add Redis-backed caching to the AirLabs, AeroDataBox, and Open-Meteo services built in Phases 6–8. Use these TTLs: latest flight position ~15-30s, flight schedule/status ~1-2min, airport arrivals/departures ~1-2min, weather ~10-15min. Requests within the TTL window must be served from cache, not from the external API. Every cached response must include a `last_updated` timestamp field so the frontend can display data freshness rather than implying true real-time updates. Add logging or counters so cache hits vs. real API calls can be verified in testing. Do not introduce Celery unless on-demand caching proves insufficient — justify if you do. Report the caching strategy implemented and how it was tested.

---

### PHASE 10 — Mapbox Integration (Frontend)
**Objective:** Get a working Mapbox map on the frontend, wired to receive backend-normalized position data (not yet the full Tracking page layout).
**Sub-phases:**
- 10.1 Mapbox GL JS setup, token from `VITE_MAPBOX_TOKEN`, never hardcoded
- 10.2 Base `Map` component (`.jsx`), world view
- 10.3 `AircraftMarker` component: custom aircraft icon, rotates via `heading`
- 10.4 Wire markers to the `/api/tracking/positions/` response from Phase 9, including a small "Last updated: Xs ago" or "Position unavailable" indicator per marker

**Testing:** Map renders; at least one real aircraft marker appears at AirLabs' reported position and rotates per heading; staleness indicator reflects the `last_updated` field.
**Acceptance criteria:** No hardcoded aircraft positions anywhere in the code; markers reflect the latest available backend data, honestly labeled as such (not claimed as real-time).

**Coding-agent prompt:**
> Add Mapbox GL JS to the React (Vite + JavaScript) frontend. Create a reusable `Map` component and an `AircraftMarker` component styled to look like an aircraft icon that rotates based on a `heading` prop. Fetch position data from the `/api/tracking/positions/` endpoint (built in Phase 9) and render real markers — do not hardcode any aircraft coordinates. Use the `last_updated` field from the response to show a small freshness indicator ("Last updated: Xs ago") or a "Position unavailable" state if data is stale/missing. Use `VITE_MAPBOX_TOKEN` for the Mapbox token; never hardcode it. Report the components created and confirm markers render from live backend data.

---

### PHASE 11 — Tracking Page: Flight & Airport Search (MVP Milestone)
**Objective:** Assemble the first real, usable feature: search by flight number **or airport code**, view results, select a flight, and see its details + latest map position. **This is the milestone the user wants to see working.**
**Sub-phases:**
- 11.1 Page layout: left 60% Mapbox map, right 40% search/results/details panel
- 11.2 `SearchBar` component: accepts either a flight number or an airport IATA/ICAO code, dispatches to the correct endpoint (flight search → Phase 6; airport arrivals/departures → Phase 7)
- 11.3 `SearchResults`/`FlightCard` components: render a list of matching flights when searching by airport code (multiple results), or the single matching flight when searching by flight number
- 11.4 `FlightDetailsPanel` component: on selecting a flight (from results or a map marker), shows normalized AirLabs fields — flight number, airline, aircraft, status, origin/destination, scheduled/estimated/actual times, delay, gate, terminal, lat/lon, altitude, speed, heading — with `Not available` for any missing field
- 11.5 Selected flight's marker appears/highlights on the map if position data exists; if not, the details panel clearly states position is unavailable rather than showing nothing
- 11.6 Frontend polling on a reasonable interval that respects backend cache TTLs from Phase 9 (not hammering the API); "Last updated: Xs ago" shown in the details panel

**Testing:** Search a real flight number → single result → details populate correctly. Search a real airport code → list of flights → select one → details populate correctly. Unavailable fields show `Not available`; stale/missing position shows an honest state instead of breaking the UI.
**Acceptance criteria:** See the **MVP Checkpoint** in Section 5 below — all 14 points must hold.

**Coding-agent prompt:**
> Build the Tracking page: a 60/40 layout with the `Map`/`AircraftMarker` components from Phase 10 on the left and a search/results/details panel on the right. The `SearchBar` must accept either a flight number (routes to the Phase 6 flight search endpoint) or an airport IATA/ICAO code (routes to the Phase 7 arrivals/departures endpoint). Render search results as a list of flight cards when multiple flights match (airport search) or a single result (flight number search). Selecting a result or a map marker should populate a `FlightDetailsPanel` with normalized AirLabs fields; any field AirLabs doesn't provide must render as "Not available", not break the UI. If position data is missing or stale, state that clearly rather than silently omitting the marker. Poll for updated data on a reasonable interval that respects the backend's cache TTLs from Phase 9, and show a "Last updated: Xs ago" indicator. Do not call AirLabs or AeroDataBox directly from the frontend. Use JavaScript (`.jsx`), not TypeScript. Report the final page structure and confirm it works end-to-end against real API keys, for both a flight-number search and an airport-code search.

---

## 5. MVP Checkpoint (Explicit Acceptance Criteria)

By the end of Phase 11, the application must support the following complete end-to-end flow:

1. User opens the Tracking page.
2. User can search using a flight number.
3. User can search using an airport IATA/ICAO code.
4. Backend queries the designated provider(s) according to the fixed API responsibility matrix (flight number → AirLabs; airport code → AeroDataBox).
5. Search results display matching real flights.
6. User can select a flight from the results.
7. The selected flight opens a Flight Details view/panel.
8. Flight Details displays available real data: flight number, airline, aircraft, status, origin, destination, scheduled departure/arrival, estimated departure/arrival, actual departure/arrival, delay, gate, terminal, latitude, longitude, altitude, speed, heading.
9. If a position is available, the aircraft appears on Mapbox at its latest reported position.
10. Aircraft heading controls marker rotation.
11. Missing provider data displays `Not available`.
12. The frontend never calls AirLabs/AeroDataBox directly.
13. No hardcoded flight or aircraft data is used anywhere.
14. API calls are cached and rate-limit-aware; the UI shows data freshness (`Last updated: Xs ago`) rather than implying true real-time tracking.

**This milestone does not include** the full Airport Page, Booking, 3D aircraft, ATC Dashboard, Chatbot, or ML functionality.

---

## 6. Deferred — Not Part of This Build Pass

| Phase | Feature |
|---|---|
| 12 | Full Airport Page (AeroDataBox + Open-Meteo — runways/terminals/gates UI, weather panel; MVP already covers airport-code flight search from Phase 7) |
| 13 | Airport Navigation (AeroDataBox + Mapbox) |
| 14 | ATC Dashboard (role-gated, telemetry view) |
| 15 | Booking/Search simulation |
| 16 | 3D Aircraft (Three.js/GLTF) |
| 17 | AI Airport Chatbot (LLM → Django → designated API → LLM → user) |
| 18 | ML Coming-Soon placeholders across Home/Flight/Airport/ATC/Booking |
| 19 | Caching/performance hardening beyond MVP |
| 20 | Security hardening (rate limiting, audit logging, CSRF/CORS review) |
| 21 | Full test suite / CI |
| 22 | Deployment (PostgreSQL cutover, env config, HTTPS, migrations, health checks) |
| 23 | Final integration pass |

### Hard rules that still apply once these resume
- No ML models, training pipelines, inference, or fake/mock predictions — ever — until explicitly requested. Only "🔒 Coming Soon" placeholders.
- No new external APIs beyond AirLabs, AeroDataBox, Open-Meteo, Mapbox.
- No provider fallback chains — a missing field stays `null`.
- ATC access must remain server-enforced, never frontend-only.
- Booking remains a search/simulation, not real ticketing, unless a real provider is integrated later.
- Frontend stays React + Vite + JavaScript (`.jsx`) — no TypeScript migration unless explicitly requested.
- Development stays on SQLite; PostgreSQL is only introduced at deployment (Phase 22).

---

## 7. Reference: Future ML Roadmap (Documentation Only, Not Implemented)

Data being preserved now for future models (already captured by the `FlightPosition`/`Flight`/`Weather` schema in Phase 3):

- **Flight:** scheduled/actual departure & arrival, origin, destination, airline, aircraft
- **Aircraft state:** lat, lon, altitude, speed, heading, timestamp
- **Weather:** temperature, wind, precipitation, visibility, pressure, timestamp, location

Planned future models (delay prediction, arrival prediction, demand prediction, congestion prediction, anomaly detection, route deviation detection, price prediction) will consume this historical data plus external datasets (TranStats, Kaggle flight/weather dataset, ANS Performance data) once model development begins. No training, inference, or model code is part of this roadmap.
