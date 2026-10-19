import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusChip } from '../components/ui';

const CATEGORY = {
  'On Time': 'chip--ok',
  'Minor Delay': 'chip--warn',
  'Major Delay': 'chip--bad',
};

const clock = (value) => {
  if (!value) return '—';
  const text = String(value).trim().replace(' ', 'T');
  const date = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const DelayPrediction = () => {
  const [searchParams] = useSearchParams();
  const [flightNumber, setFlightNumber] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runPrediction = async (code) => {
    if (!code.trim()) {
      setError('Enter a flight number.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ml/delay-prediction/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_number: code.trim().toUpperCase() }),
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.ok) {
        setResult(data);
      } else {
        setError(data?.error || 'That flight could not be found.');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runPrediction(flightNumber);
  };

  useEffect(() => {
    const code = searchParams.get('flight');
    if (code) {
      setFlightNumber(code.toUpperCase());
      runPrediction(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flight = result?.flight;
  const arrival = result?.predicted_arrival_delay_minutes;
  const departure = result?.predicted_departure_delay_minutes;

  return (
    <div className="shell page">
      <div className="page-head">
        <div>
          <h1>Arrival delay</h1>
          <p className="lede">
            How late a flight is likely to arrive, worked out from its schedule and how late it left the gate.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 460, marginBottom: 28 }}>
        <input
          className="input input--code"
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
          placeholder="Flight number — 6E754"
          style={{ flex: '1 1 200px' }}
          aria-label="Flight number"
        />
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Working…' : 'Predict'}
        </button>
      </form>

      {error && <div className="alert alert--error">{error}</div>}

      {!result && !loading && !error && (
        <div className="empty">Enter a flight number to see its expected arrival delay.</div>
      )}

      {result && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="panel" style={{ padding: 28 }}>
            <span className="stat__label">Expected arrival delay</span>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '3.25rem',
                lineHeight: 1.05,
                margin: '10px 0 14px',
                fontVariantNumeric: 'tabular-nums',
                color: arrival > 30 ? 'var(--bad)' : arrival > 5 ? 'var(--warn)' : 'var(--ok)',
              }}
            >
              {arrival > 0 ? '+' : ''}
              {Math.round(arrival)}
              <span style={{ fontSize: '1.1rem', color: 'var(--text-3)', marginLeft: 8 }}>min</span>
            </div>
            <span className={`chip ${CATEGORY[result.delay_category] || ''}`}>{result.delay_category}</span>
            <p className="note" style={{ marginTop: 16 }}>
              {arrival <= 5
                ? 'On schedule.'
                : arrival <= 30
                ? 'A minor delay is expected.'
                : 'A significant delay is expected.'}
            </p>
          </section>

          <section className="panel">
            <h2 style={{ fontSize: '0.95rem', marginBottom: 18 }}>Flight</h2>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
              <div className="stat">
                <span className="stat__label">Flight</span>
                <span className="stat__value" style={{ fontSize: '1.05rem' }}>
                  {flight?.flight_number || result.flight_number || '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat__label">Route</span>
                <span className="stat__value" style={{ fontSize: '1.05rem' }}>
                  {result.origin} → {result.destination}
                </span>
              </div>
              <div className="stat">
                <span className="stat__label">Scheduled departure</span>
                <span className="stat__value" style={{ fontSize: '1.05rem' }}>
                  {clock(flight?.scheduled_departure_local)}
                </span>
              </div>
              <div className="stat">
                <span className="stat__label">Scheduled arrival</span>
                <span className="stat__value" style={{ fontSize: '1.05rem' }}>
                  {clock(flight?.scheduled_arrival_local)}
                </span>
              </div>
              <div className="stat">
                <span className="stat__label">Departure delay</span>
                <span className="stat__value" style={{ fontSize: '1.05rem' }}>
                  {departure != null ? `${Math.round(departure)} min` : '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat__label">Status</span>
                <span style={{ marginTop: 4 }}>
                  <StatusChip status={flight?.status} />
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default DelayPrediction;
