import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Radar, Wind, Gauge, Navigation, AlertTriangle, Activity, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const planeIcon = (heading) => L.divIcon({
  html: `<div style="transform:rotate(${heading||0}deg);width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#4ade80;font-size:18px;">✈</div>`,
  className: 'atc-plane',
  iconSize: [24,24],
  iconAnchor: [12,12],
});

const ATCDashboard = () => {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const [flight, setFlight] = useState('');
  const [telemetry, setTelemetry] = useState(null);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token]);

  const fetchTelemetry = async () => {
    if (!flight.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/tracking/positions/?flights=${flight.trim().toUpperCase()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        setError('ATC access denied — server requires verified ATC role. Ensure you logged in as a verified ATC user.');
        return;
      }
      if (!res.ok) {
        setError('Flight position not available. Check flight number and AirLabs key.');
        return;
      }
      const data = await res.json();
      const pos = data.positions && data.positions[0];
      if (!pos) { setError('Position unavailable (AirLabs returned no lat/lon).'); return; }
      setTelemetry(pos);
      setLastUpdated(new Date().toISOString());
      if (pos.lat && pos.lon) {
        const w = await fetch(`/api/weather/?lat=${pos.lat}&lon=${pos.lon}`);
        if (w.ok) setWeather(await w.json());
      }
    } catch {
      setError('Network error');
    }
  };

  useEffect(() => {
    if (!telemetry?.flight_number) return;
    const id = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(id);
  }, [telemetry?.flight_number]);

  // Simple anomaly placeholder — disabled per user request (no ML), but we show logic placeholder text
  const anomalyText = 'Anomaly detection disabled — no ML model in this build. This panel would show route deviation & signal anomalies when enabled.';

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <span style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', padding: 10, borderRadius: 10, display: 'inline-flex' }}>
          <Shield size={20} color="#4ade80" />
        </span>
        <h1 style={{ margin: 0 }}>ATC Dashboard</h1>
        <span style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', fontSize: '0.7rem', padding: '4px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={12} /> ATC verified only — server-enforced</span>
      </div>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
        Monitors live route vs planned path (when available), signals, wind/speed/altitude/direction, and map. Data via <strong>AirLabs</strong> + <strong>Open-Meteo</strong>. Missing fields = “Not available”. Anomaly/ML is intentionally disabled.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={flight} onChange={(e) => setFlight(e.target.value)} placeholder="Flight number — e.g. AA100" style={{ flex: '1 1 200px', background: '#09090b', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: 8, outline: 'none' }} />
        <button onClick={fetchTelemetry} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.6rem 1.1rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Load telemetry</button>
        {lastUpdated && <span style={{ alignSelf: 'center', color: '#a1a1aa', fontSize: '0.82rem' }}>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={16} /> {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', minHeight: 380 }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <Radar size={16} color="#4ade80" /> Map — current vs actual path
          </div>
          <div style={{ height: 360 }}>
            {telemetry?.lat && telemetry?.lon ? (
              <MapContainer center={[telemetry.lat, telemetry.lon]} zoom={6} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                <Marker position={[telemetry.lat, telemetry.lon]} icon={planeIcon(telemetry.heading)} />
                {/* Placeholder planned path — single segment until real route data exists */}
                <Polyline positions={[[telemetry.lat, telemetry.lon], [telemetry.lat + 0.5, telemetry.lon + 0.5]]} pathOptions={{ color: '#4ade80', dashArray: '6 6', opacity: 0.6 }} />
              </MapContainer>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#a1a1aa', padding: '1rem', textAlign: 'center' }}>
                No position yet. Enter a flight number and load telemetry.
                <span style={{ fontSize: '0.82rem', marginTop: 6 }}>Route travelled vs actual path requires historical FlightPosition data — plot will improve as positions accumulate.</span>
              </div>
            )}
          </div>
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', color: '#a1a1aa', fontSize: '0.82rem' }}>
            Heading controls marker rotation. <strong style={{ color: '#d4d4d8' }}>Planned path (dashed)</strong> is a placeholder until a route source is integrated.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} color="#4ade80" /> Signals</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem' }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontWeight: 700 }}>{telemetry?.status || 'Not available'}</div>
              </div>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem' }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>Flight</div>
                <div style={{ fontWeight: 700 }}>{telemetry?.flight_number || flight || '—'}</div>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', color: '#a1a1aa', fontSize: '0.82rem' }}>
              Signals (transponder/ADS-B) will appear here when AirLabs provides them. Without ML, no anomaly scoring is shown.
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wind size={16} color="#4ade80" /> Wind, Speed, Altitude, Direction
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem' }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><Gauge size={12} /> Altitude</div>
                <div style={{ fontWeight: 700 }}>{telemetry?.altitude != null ? `${telemetry.altitude} ft` : 'Not available'}</div>
              </div>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem' }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>Speed</div>
                <div style={{ fontWeight: 700 }}>{telemetry?.speed != null ? `${telemetry.speed} kts` : 'Not available'}</div>
              </div>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem' }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><Navigation size={12} /> Heading / Direction</div>
                <div style={{ fontWeight: 700 }}>{telemetry?.heading != null ? `${telemetry.heading}°` : 'Not available'}</div>
              </div>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem' }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><Wind size={12} /> Wind (Open-Meteo)</div>
                <div style={{ fontWeight: 700 }}>{weather ? `${weather.wind_speed ?? '—'} km/h ${weather.wind_direction ?? ''}${weather.wind_direction != null ? '°' : ''}` : 'Not available'}</div>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ color: '#a1a1aa', fontSize: '0.82rem' }}>Lat/Lon: {telemetry?.lat != null ? `${telemetry.lat}, ${telemetry.lon}` : 'Not available'}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: 8, color: '#facc15' }}><AlertTriangle size={16} /> Anomaly detection</h3>
            <p style={{ margin: 0, color: '#e4e4e7', fontSize: '0.88rem', lineHeight: 1.5 }}>{anomalyText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATCDashboard;
