// API helpers for the demo ML predictions.
// Same conventions as the rest of the frontend: plain fetch() against the
// Django API (via the Vite /api proxy). No prediction data is duplicated here.

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
