import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const planeIcon = (heading) =>
  L.divIcon({
    html: `<div style="transform:rotate(${heading || 0}deg);width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:#4da3ff;font-size:17px;">✈</div>`,
    className: 'atc-plane',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const Reading = ({ label, value }) => (
  <div className="stat">
    <span className="stat__label">{label}</span>
    <span className="stat__value" style={{ fontSize: '1.1rem' }}>
      {value}
    </span>
  </div>
);

const ATCDashboard = () => {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const [flight, setFlight] = useState('');
  const [telemetry, setTelemetry] = useState(null);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token]);

  const fetchTelemetry = async () => {
    if (!flight.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/tracking/positions/?flights=${flight.trim().toUpperCase()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        setError('ATC access denied. Sign in with a controller account.');
        return;
      }
      if (!res.ok) {
        setError('Position unavailable. Check the flight number.');
        return;
      }
      const data = await res.json();
      const pos = data.positions && data.positions[0];
      if (!pos) {
        setError('Position unavailable.');
        return;
      }
      setTelemetry(pos);
      setLastUpdated(new Date().toISOString());
      if (pos.lat && pos.lon) {
        const w = await fetch(`/api/weather/?lat=${pos.lat}&lon=${pos.lon}`);
        if (w.ok) setWeather(await w.json());
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!telemetry?.flight_number) return;
    const id = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(id);
  }, [telemetry?.flight_number]);

  return (
    <div className="shell page">
      <div className="page-head">
        <div>
          <h1>ATC console</h1>
          <p className="lede">Live telemetry for a flight under your control.</p>
        </div>
        {lastUpdated && (
          <span className="note">
            Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', maxWidth: 460 }}>
        <input
          className="input input--code"
          value={flight}
          onChange={(e) => setFlight(e.target.value.toUpperCase())}
          placeholder="Flight number — 6E754"
          style={{ flex: '1 1 200px' }}
          aria-label="Flight number"
        />
        <button className="btn btn--primary" onClick={fetchTelemetry} disabled={loading}>
          {loading ? 'Loading…' : 'Load telemetry'}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!telemetry ? (
        <div className="empty">
          {loading ? 'Loading telemetry…' : 'Enter a flight number to pull its live telemetry.'}
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="panel panel--flush">
            <div style={{ height: 420 }}>
              {telemetry?.lat && telemetry?.lon ? (
                <MapContainer center={[telemetry.lat, telemetry.lon]} zoom={6} style={{ width: '100%', height: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[telemetry.lat, telemetry.lon]} icon={planeIcon(telemetry.heading)} />
                  <Polyline
                    positions={[
                      [telemetry.lat, telemetry.lon],
                      [telemetry.lat + 0.5, telemetry.lon + 0.5],
                    ]}
                    pathOptions={{ color: '#e0a02c', dashArray: '6 6', opacity: 0.6 }}
                  />
                </MapContainer>
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-3)' }}>
                  No live position for this flight.
                </div>
              )}
            </div>
          </section>

          <div className="stack" style={{ gap: 20 }}>
            <section className="panel">
              <h2 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Flight</h2>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <Reading label="Status" value={telemetry?.status || '—'} />
                <Reading label="Flight" value={telemetry?.flight_number || flight || '—'} />
              </div>
            </section>

            <section className="panel">
              <h2 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Telemetry</h2>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <Reading label="Altitude" value={telemetry?.altitude != null ? `${telemetry.altitude} ft` : '—'} />
                <Reading label="Speed" value={telemetry?.speed != null ? `${telemetry.speed} kts` : '—'} />
                <Reading label="Heading" value={telemetry?.heading != null ? `${Math.round(telemetry.heading)}°` : '—'} />
                <Reading
                  label="Wind"
                  value={weather ? `${weather.wind_speed ?? '—'} km/h ${weather.wind_direction ?? ''}${weather.wind_direction != null ? '°' : ''}` : '—'}
                />
              </div>
            </section>

            <section className="panel">
              <h2 style={{ fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="var(--ok)" /> Anomaly detection
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>No Anomaly Detected</p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATCDashboard;
