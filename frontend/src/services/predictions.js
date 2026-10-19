// API helpers for the ML predictions.
// Same conventions as the rest of the frontend: plain fetch() against the
// Django API (via the Vite /api proxy). No prediction data is duplicated here.
//
// The delay endpoint has two shapes:
// - POST with the flight details -> the trained arrival-delay model runs.
// - GET with airline/route only    -> the backend falls back to its demo table.

export async function getDelayPrediction({ airline, origin, destination }) {
  const params = new URLSearchParams({
    airline: airline.trim().toUpperCase(),
    origin: origin.trim().toUpperCase(),
    destination: destination.trim().toUpperCase(),
  });
  const res = await fetch(`/api/ml/delay-prediction/?${params.toString()}`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function postDelayPrediction(payload) {
  const res = await fetch('/api/ml/delay-prediction/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function getCongestionPrediction(airport) {
  const params = new URLSearchParams({ airport: airport.trim().toUpperCase() });
  const res = await fetch(`/api/ml/airport-congestion/?${params.toString()}`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}
