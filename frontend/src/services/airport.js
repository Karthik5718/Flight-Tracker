// Airport-related API helpers.
// Uses the same fetch conventions as predictions.js — plain fetch() against the
// Django API via the Vite /api proxy. No secrets in frontend code.

export async function getAirportInfo(code) {
  const res = await fetch(`/api/airports/${encodeURIComponent(code.trim().toUpperCase())}/`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function getAirportFlights(code) {
  const res = await fetch(`/api/airports/${encodeURIComponent(code.trim().toUpperCase())}/flights/?source=airlabs`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function getAirportHistory(code) {
  const res = await fetch(`/api/airports/${encodeURIComponent(code.trim().toUpperCase())}/history/`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function searchAirports(query) {
  const res = await fetch(`/api/airports/search/?q=${encodeURIComponent(query.trim())}`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}