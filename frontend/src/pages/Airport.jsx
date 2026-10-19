import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StatusChip } from '../components/ui';

const airportIcon = L.divIcon({
  html: '<div style="width:11px;height:11px;background:var(--accent);border:2px solid #0a0e14;border-radius:50%"></div>',
  className: 'airport-dot',
  iconSize: [11, 11],
  iconAnchor: [5, 5],
});

const fmt = (val, suffix = '') => {
  if (val == null || val === '' || val === 'null') return '—';
  return `${val}${suffix}`;
};

const fmtTime = (val) => {
  if (!val) return '—';
  const text = String(val).trim().replace(' ', 'T');
  const date = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);
  if (Number.isNaN(date.getTime())) return String(val);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const Board = ({ title, rows, direction, onSelect, expanded, onToggle }) => (
  <section className="panel panel--flush">
    <div className="panel__head">
      <span className="panel__title">
        {title} <span className="note" style={{ marginLeft: 6, fontWeight: 400 }}>{rows.length}</span>
      </span>
      {rows.length > 8 && (
        <button className="btn btn--quiet" onClick={onToggle} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
          {expanded ? 'Show less' : 'Show all'}
        </button>
      )}
    </div>
    {rows.length === 0 ? (
      <div className="empty">Nothing scheduled.</div>
    ) : (
      <div style={{ maxHeight: expanded ? 'none' : 420, overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Airline</th>
              <th>{direction === 'dep' ? 'To' : 'From'}</th>
              <th>Scheduled</th>
              <th>Gate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(expanded ? rows : rows.slice(0, 8)).map((f, i) => (
              <tr key={`${f.flight_number}-${i}`} className="is-clickable" onClick={() => onSelect(f)}>
                <td className="is-strong mono">{fmt(f.flight_number)}</td>
                <td className="mono">{fmt(f.airline)}</td>
                <td className="mono">{fmt(direction === 'dep' ? f.destination : f.origin)}</td>
                <td className="mono">{fmtTime(direction === 'dep' ? f.scheduled_departure : f.scheduled_arrival)}</td>
                <td className="mono">{fmt(f.gate)}</td>
                <td>
                  <StatusChip status={f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const Airport = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [airport, setAirport] = useState(null);
  const [flights, setFlights] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [error, setError] = useState('');
  const [flightsError, setFlightsError] = useState('');
  const [expandDep, setExpandDep] = useState(false);
  const [expandArr, setExpandArr] = useState(false);

  const fetchWeather = async (lat, lon) => {
    try {
      const wRes = await fetch(`/api/weather/?lat=${lat}&lon=${lon}`);
      if (wRes.ok) setWeather(await wRes.json());
    } catch {
      /* weather is optional */
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    const q = code.trim().toUpperCase();
    setLoading(true);
    setFlightsLoading(true);
    setError('');
    setFlightsError('');
    setAirport(null);
    setFlights(null);
    setWeather(null);
    setExpandDep(false);
    setExpandArr(false);
    try {
      const [aRes, fRes] = await Promise.all([
        fetch(`/api/airports/${q}/`),
        fetch(`/api/airports/${q}/flights/`),
      ]);
      if (aRes.ok) {
        const aData = await aRes.json();
        setAirport(aData);
        if (aData.lat != null && aData.lon != null) fetchWeather(aData.lat, aData.lon);
      } else {
        setError('Airport not found.');
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        const deps = Array.isArray(fData.departures) ? fData.departures : [];
        const arrs = Array.isArray(fData.arrivals) ? fData.arrivals : Array.isArray(fData) ? fData : [];
        setFlights({ departures: deps, arrivals: arrs, last_updated: fData.last_updated });
      } else {
        setFlightsError('Unable to load the boards.');
      }
      if (!aRes.ok && !fRes.ok) setError(`No data for ${q}.`);
    } catch {
      setError('Network error');
      setFlightsError('Unable to load the boards.');
    }
    setLoading(false);
    setFlightsLoading(false);
  };

  const handleSelectFlight = (flight) => {
    const fn = flight.flight_number;
    if (!fn || fn === '—') return;
    navigate(`/tracking/${encodeURIComponent(fn)}`);
  };

  const departures = flights?.departures || [];
  const arrivals = flights?.arrivals || [];

  return (
    <div className="shell page">
      <div className="page-head">
        <div>
          <h1>Airport</h1>
          <p className="lede">Departure and arrival boards, local weather and the airport location.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap', maxWidth: 460 }}>
        <input
          className="input input--code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Airport code — DEL, JFK, DXB"
          style={{ flex: '1 1 200px' }}
          aria-label="Airport code"
        />
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Loading…' : 'Open airport'}
        </button>
      </form>

      {error && <div className="alert alert--error">{error}</div>}
      {flightsError && <div className="alert alert--error">{flightsError}</div>}

      {airport && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(260px, 1fr)', gap: 20, marginBottom: 24 }}>
          <section className="panel panel--flush">
            <div style={{ height: 340 }}>
              {airport.lat != null && airport.lon != null ? (
                <MapContainer center={[airport.lat, airport.lon]} zoom={10} style={{ width: '100%', height: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[airport.lat, airport.lon]} icon={airportIcon}>
                    <Popup>
                      <strong>{airport.name || airport.iata || airport.icao}</strong>
                      <br />
                      {airport.iata || '—'} / {airport.icao || '—'}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-3)' }}>
                  Coordinates unavailable
                </div>
              )}
            </div>
            <div className="panel__body" style={{ padding: '16px 20px' }}>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>{fmt(airport.name)}</div>
              <div className="row-gap note">
                <span className="mono">IATA {fmt(airport.iata)}</span>
                <span className="mono">ICAO {fmt(airport.icao)}</span>
                <span className="mono">
                  {airport.lat != null ? `${airport.lat}, ${airport.lon}` : '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Weather here</h2>
            {!weather ? (
              <p className="note">No reading for this position.</p>
            ) : (
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div className="stat">
                  <span className="stat__label">Temp</span>
                  <span className="stat__value" style={{ fontSize: '1.15rem' }}>
                    {fmt(weather.temperature, '°C')}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat__label">Wind</span>
                  <span className="stat__value" style={{ fontSize: '1.15rem' }}>
                    {fmt(weather.wind_speed, '')}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}> km/h</span>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat__label">Dir</span>
                  <span className="stat__value" style={{ fontSize: '1.15rem' }}>
                    {fmt(weather.wind_direction, '°')}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {flightsLoading && <p className="note">Loading boards…</p>}

      {flights && (
        <div className="grid-2">
          <Board
            title="Departures"
            rows={departures}
            direction="dep"
            onSelect={handleSelectFlight}
            expanded={expandDep}
            onToggle={() => setExpandDep((v) => !v)}
          />
          <Board
            title="Arrivals"
            rows={arrivals}
            direction="arr"
            onSelect={handleSelectFlight}
            expanded={expandArr}
            onToggle={() => setExpandArr((v) => !v)}
          />
        </div>
      )}

      {!airport && !flights && !loading && !flightsLoading && (
        <div className="empty">Enter an airport code to open its boards.</div>
      )}
    </div>
  );
};

export default Airport;
