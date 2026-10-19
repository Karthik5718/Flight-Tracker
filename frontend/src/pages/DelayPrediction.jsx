import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock3, Plane, Search, AlertTriangle } from 'lucide-react';
import { getDelayPrediction } from '../services/predictions';

function categoryColor(category) {
  if (category === 'On Time') return '#4ade80';
  if (category === 'Minor Delay') return '#facc15';
  return '#ef4444';
}

function Bar({ label, minutes }) {
  const width = Math.min(100, Math.max(2, (minutes / 60) * 100));
  const color = categoryColor(minutes <= 5 ? 'On Time' : minutes <= 30 ? 'Minor Delay' : 'Major Delay');
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#d4d4d8', marginBottom: 4 }}>
        <span>{label}</span>
        <strong style={{ color: '#fff' }}>{minutes} min</strong>
      </div>
      <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 6, height: 12, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

const DelayPrediction = () => {
  const [searchParams] = useSearchParams();
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [liveFlight, setLiveFlight] = useState(null);
  const [lookupMsg, setLookupMsg] = useState('');
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runPrediction = async (a, o, d) => {
    if (!a.trim() || !o.trim() || !d.trim()) {
      setError('Airline, origin and destination are all required.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { ok, data } = await getDelayPrediction({ airline: a, origin: o, destination: d });
      if (ok) {
        setResult(data);
      } else {
        setError(data?.error || 'Prediction unavailable.');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!flightNumber.trim()) return;
    setLooking(true);
    setLookupMsg('');
    setLiveFlight(null);
    try {
      const res = await fetch(`/api/flights/search/?flight=${encodeURIComponent(flightNumber.trim().toUpperCase())}`);
      if (res.ok) {
        const f = await res.json();
        setLiveFlight(f);
        // Prefill the prediction inputs from real flight fields (same fields Tracking shows)
        if (f.airline && f.airline !== 'Not available') setAirline(f.airline);
        if (f.origin && f.origin !== 'Not available') setOrigin(f.origin);
        if (f.destination && f.destination !== 'Not available') setDestination(f.destination);
        setLookupMsg('Flight found — airline and route prefilled below. Adjust if needed, then predict.');
      } else if (res.status === 404) {
        setLookupMsg('Live flight not found — enter airline and route manually below.');
      } else {
        setLookupMsg('Lookup failed — enter airline and route manually below.');
      }
    } catch {
      setLookupMsg('Network error — enter airline and route manually below.');
    }
    setLooking(false);
  };

  // Support direct URL opens: /predictions/delay?airline=6E&origin=DEL&destination=BOM
  useEffect(() => {
    const a = searchParams.get('airline');
    const o = searchParams.get('origin');
    const d = searchParams.get('destination');
    if (a && o && d) {
      setAirline(a.toUpperCase());
      setOrigin(o.toUpperCase());
      setDestination(d.toUpperCase());
      runPrediction(a, o, d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catColor = result ? categoryColor(result.delay_category) : '#a1a1aa';

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
        <Clock3 color="#4ade80" /> Flight Delay Prediction
      </h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
        Look up a flight by number <b>or</b> enter an airline + route directly.
      </p>

      {/* Step 1: flight lookup (reuses existing flight search endpoint) */}
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: 12, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 280px', alignItems: 'center', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.45rem 0.6rem' }}>
          <Search size={16} color="#a1a1aa" />
          <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Flight number — e.g. 6E216" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff' }} />
        </div>
        <button type="submit" disabled={looking} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.6rem 1.1rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          {looking ? 'Looking up...' : 'Look up flight'}
        </button>
      </form>
      {lookupMsg && <p style={{ color: '#a1a1aa', fontSize: '0.88rem', margin: '0 0 1rem 0' }}>{lookupMsg}</p>}
      {liveFlight && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#d4d4d8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
            <Plane size={16} color="#4ade80" />
            <strong style={{ color: '#fff' }}>{liveFlight.flight_number || '—'}</strong>
            <span style={{ fontSize: '0.72rem', background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '3px 8px', borderRadius: 999 }}>Live data · existing API</span>
          </div>
          Airline: {liveFlight.airline || 'Not available'} · Route: {liveFlight.origin || 'Not available'} → {liveFlight.destination || 'Not available'} · Status: {liveFlight.status || 'Not available'}
        </div>
      )}

      {/* Step 2: airline + route */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase' }}>
            Airline (IATA)
            <input value={airline} onChange={(e) => setAirline(e.target.value.toUpperCase())} placeholder="e.g. 6E" style={{ background: '#09090b', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.75rem', borderRadius: 8, outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase' }}>
            Origin (IATA)
            <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} placeholder="e.g. DEL" style={{ background: '#09090b', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.75rem', borderRadius: 8, outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase' }}>
            Destination (IATA)
            <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} placeholder="e.g. BOM" style={{ background: '#09090b', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.75rem', borderRadius: 8, outline: 'none' }} />
          </label>
        </div>
        <button onClick={() => runPrediction(airline, origin, destination)} disabled={loading} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.65rem 1.25rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Predicting...' : 'Predict delay'}
        </button>
      </div>

      {loading && <p style={{ color: '#888' }}>Predicting...</p>}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
          Look up a flight or enter an airline + route (e.g. 6E · DEL → BOM) to see the demo prediction.
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#a1a1aa', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 6 }}>Airline · Route</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{result.airline_name || result.airline}</div>
              <div style={{ color: '#d4d4d8' }}>{result.airline} · {result.origin} → {result.destination}</div>
            </div>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#a1a1aa', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 6 }}>Predicted departure delay</div>
              <div style={{ fontWeight: 800, fontSize: '1.6rem' }}>{result.predicted_departure_delay_minutes}<span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}> min</span></div>
            </div>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#a1a1aa', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 6 }}>Predicted arrival delay</div>
              <div style={{ fontWeight: 800, fontSize: '1.6rem' }}>{result.predicted_arrival_delay_minutes}<span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}> min</span></div>
            </div>
            <div style={{ background: 'var(--bg-panel)', border: `1px solid ${catColor}55`, borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#a1a1aa', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 6 }}>Delay category</div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', color: catColor }}>{result.delay_category}</div>
              <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: 4 }}>Avg on this route: {result.avg_departure_delay_minutes} min dep · {result.avg_arrival_delay_minutes} min arr</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Visual summary</h3>
            <Bar label="Departure delay" minutes={result.predicted_departure_delay_minutes} />
            <Bar label="Arrival delay" minutes={result.predicted_arrival_delay_minutes} />
          </div>

          <p style={{ color: '#71717a', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            {result.airline_name || result.airline} flights on {result.origin} → {result.destination} average about {result.avg_departure_delay_minutes} min
            late on departure and {result.avg_arrival_delay_minutes} min late on arrival, so the prediction is “{result.delay_category}”
            (On Time ≤ 5 min, Minor 6–30 min, Major &gt; 30 min). Prototype model v0 — illustrative values.
          </p>
        </div>
      )}
    </div>
  );
};

export default DelayPrediction;
