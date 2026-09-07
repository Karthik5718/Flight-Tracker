import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, Plane, CloudSun, Search, MapPin, Navigation, AlertTriangle } from 'lucide-react';

const airportIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function fmt(val, suffix = '') {
  if (val == null || val === '' || val === 'null') return 'Not available';
  return `${val}${suffix}`;
}
function fmtTime(val) {
  if (!val) return 'Not available';
  try { return new Date(val).toLocaleString(); } catch { return String(val); }
}

function FlightRow({ flight, onSelect }) {
  const statusColor = flight.status === 'en-route' || flight.status === 'active' ? '#4ade80'
    : flight.status === 'landed' ? '#60a5fa'
      : flight.status === 'cancelled' ? '#ef4444'
        : flight.status === 'delayed' ? '#facc15' : '#a1a1aa';
  return (
    <div onClick={() => onSelect(flight)} style={{
      background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: '0.85rem 1rem',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.45rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.98rem' }}>{fmt(flight.flight_number)}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: statusColor === '#a1a1aa' ? '#27272a' : `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55`, padding: '3px 8px', borderRadius: 999 }}>{fmt(flight.status)}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1rem', fontSize: '0.82rem', color: '#d4d4d8' }}>
        <span><b style={{ color: '#a1a1aa' }}>Airline:</b> {fmt(flight.airline)}</span>
        <span><b style={{ color: '#a1a1aa' }}>Aircraft:</b> {fmt(flight.aircraft)}</span>
        <span><b style={{ color: '#a1a1aa' }}>Route:</b> {fmt(flight.origin)} → {fmt(flight.destination)}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1rem', fontSize: '0.78rem', color: '#a1a1aa' }}>
        <span>Gate {fmt(flight.gate)} · Term {fmt(flight.terminal)}</span>
        <span>Sched dep {fmtTime(flight.scheduled_departure)}</span>
        {flight.estimated_departure && <span>Est dep {fmtTime(flight.estimated_departure)}</span>}
        {flight.delayed != null && <span style={{ color: '#facc15' }}>Delay {flight.delayed}m</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1rem', fontSize: '0.78rem', color: '#71717a' }}>
        {flight.scheduled_arrival && <span>Sched arr {fmtTime(flight.scheduled_arrival)}</span>}
        {flight.estimated_arrival && <span>Est arr {fmtTime(flight.estimated_arrival)}</span>}
      </div>
    </div>
  );
}

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
    } catch { /* ignore */ }
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
        setError('Airport info not found.');
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        const deps = Array.isArray(fData.departures) ? fData.departures : [];
        const arrs = Array.isArray(fData.arrivals) ? fData.arrivals : (Array.isArray(fData) ? fData : []);
        setFlights({ departures: deps, arrivals: arrs, last_updated: fData.last_updated });
      } else {
        setFlightsError('Unable to load flights.');
      }
      if (!aRes.ok && !fRes.ok) setError('No data for ' + q);
    } catch {
      setError('Network error');
      setFlightsError('Unable to load flights.');
    }
    setLoading(false);
    setFlightsLoading(false);
  };

  const handleSelectFlight = (flight) => {
    const fn = flight.flight_number;
    if (!fn || fn === 'Not available' || fn === '—') return;
    // Navigate to existing Tracking page with exact flight number — no inline tracking panel
    navigate(`/tracking/${encodeURIComponent(fn)}`);
  };

  const departures = flights?.departures || [];
  const arrivals = flights?.arrivals || [];

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
        <Building2 color="#4ade80" /> Airport — Gates & Map
      </h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
        Search <b>DEL</b> (or any IATA). Map via <strong>OpenStreetMap</strong> (light, keyless). Weather via Open-Meteo. Flights via AirLabs schedules. Click any flight to track it.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 280px', alignItems: 'center', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.45rem 0.6rem' }}>
          <Search size={16} color="#a1a1aa" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="IATA — e.g. DEL, JFK, DXB" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff' }} />
        </div>
        <button type="submit" disabled={loading} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.6rem 1.1rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Search airport'}
        </button>
      </form>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={16} /> {error}</div>}

      {airport && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ height: 380 }}>
              {(airport.lat != null && airport.lon != null) ? (
                <MapContainer center={[airport.lat, airport.lon]} zoom={10} style={{ width: '100%', height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                  <Marker position={[airport.lat, airport.lon]} icon={airportIcon}>
                    <Popup><strong>{airport.name || airport.iata || airport.icao}</strong><br />{airport.iata || '—'} / {airport.icao || '—'}<br />Airport</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#a1a1aa' }}>Coordinates not available</div>
              )}
            </div>
            <div style={{ padding: '0.9rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#d4d4d8', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {fmt(airport.name)}</span>
              <span>IATA: {fmt(airport.iata)}</span>
              <span>ICAO: {fmt(airport.icao)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Navigation size={14} /> {airport.lat != null && airport.lon != null ? `${airport.lat}, ${airport.lon}` : 'Coords not available'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: 8 }}><Plane size={16} color="#4ade80" /> Details</h3>
              <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.92rem', color: '#d4d4d8' }}>
                <div><span style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</span><br />{fmt(airport.name)}</div>
                <div><span style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase' }}>IATA / ICAO</span><br />{fmt(airport.iata)} / {fmt(airport.icao)}</div>
                <div><span style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase' }}>Lat/Lon</span><br />{airport.lat != null ? `${airport.lat}, ${airport.lon}` : 'Not available'}</div>
              </div>
            </div>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: 8 }}><CloudSun size={16} color="#4ade80" /> Weather</h3>
              {!weather ? <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.85rem' }}>Weather not available.</p> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.6rem 0.8rem', flex: '1 1 110px' }}><div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>Temp</div><div style={{ fontWeight: 700 }}>{fmt(weather.temperature, '°C')}</div></div>
                  <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.6rem 0.8rem', flex: '1 1 110px' }}><div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>Wind</div><div style={{ fontWeight: 700 }}>{fmt(weather.wind_speed, ' km/h')}</div></div>
                  <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.6rem 0.8rem', flex: '1 1 110px' }}><div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>Dir</div><div style={{ fontWeight: 700 }}>{fmt(weather.wind_direction, '°')}</div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {flightsLoading && <p style={{ color: '#a1a1aa' }}>Loading departures... Loading arrivals...</p>}
      {flightsError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{flightsError}</div>}

      {flights && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
            <div onClick={() => setExpandDep(!expandDep)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Plane size={16} color="#4ade80" /> Departures <span style={{ color: '#a1a1aa', fontWeight: 400, fontSize: '0.85rem' }}>({departures.length})</span></h3>
              <span style={{ color: '#4ade80', fontSize: '0.85rem', border: '1px solid #333', padding: '4px 8px', borderRadius: 6 }}>{expandDep ? '▲ Collapse' : '▼ Click to expand'}</span>
            </div>
            {departures.length === 0 ? <p style={{ color: '#a1a1aa' }}>No departing flights found.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(expandDep ? departures : departures.slice(0, 6)).map((f, i) => (
                  <FlightRow key={`${f.flight_number}-${i}`} flight={f} onSelect={handleSelectFlight} />
                ))}
                {!expandDep && departures.length > 6 && <p style={{ color: '#71717a', fontSize: '0.8rem', margin: 0 }}>Showing 6 of {departures.length} — click header to expand</p>}
              </div>
            )}
          </div>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
            <div onClick={() => setExpandArr(!expandArr)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Plane size={16} color="#60a5fa" /> Arrivals <span style={{ color: '#a1a1aa', fontWeight: 400, fontSize: '0.85rem' }}>({arrivals.length})</span></h3>
              <span style={{ color: '#4ade80', fontSize: '0.85rem', border: '1px solid #333', padding: '4px 8px', borderRadius: 6 }}>{expandArr ? '▲ Collapse' : '▼ Click to expand'}</span>
            </div>
            {arrivals.length === 0 ? <p style={{ color: '#a1a1aa' }}>No arriving flights found.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(expandArr ? arrivals : arrivals.slice(0, 6)).map((f, i) => (
                  <FlightRow key={`${f.flight_number}-${i}`} flight={f} onSelect={handleSelectFlight} />
                ))}
                {!expandArr && arrivals.length > 6 && <p style={{ color: '#71717a', fontSize: '0.8rem', margin: 0 }}>Showing 6 of {arrivals.length} — click header to expand</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {!airport && !flights && !loading && !flightsLoading && (
        <div style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
          Enter an airport code (e.g. DEL) to see map, departures and arrivals.
        </div>
      )}
    </div>
  );
};

export default Airport;
