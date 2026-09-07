import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Plane, Clock, MapPin, Calendar, Filter, Ticket } from 'lucide-react';
import FlightCard from '../components/FlightCard';

const Booking = () => {
  const [query, setQuery] = useState('');
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('scheduled'); // scheduled | airline | status
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAirline, setFilterAirline] = useState('all');
  const [booked, setBooked] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setBooked(null);
    try {
      // Booking uses airport FIDS as a flight listing source (AeroDataBox) — simulation only
      // User can type an airport IATA to list flights departing/arriving there
      const res = await fetch(`/api/airports/${query.trim().toUpperCase()}/flights/`);
      if (res.ok) {
        const data = await res.json();
        const combined = [...(data.departures || []), ...(data.arrivals || [])];
        // Normalize for Booking display
        const mapped = combined.map((f, idx) => ({
          flight_number: f.flight_number || f.number || `FL${idx}`,
          airline: f.airline || f.airline_iata || 'Not available',
          aircraft: f.aircraft || 'Not available',
          origin: f.origin || query.trim().toUpperCase(),
          destination: f.destination || 'Not available',
          status: f.status || 'unknown',
          scheduled_departure: f.scheduled_departure || f.scheduledTimeUtc || null,
          scheduled_arrival: f.scheduled_arrival || null,
        }));
        setFlights(mapped);
        if (mapped.length === 0) setError('No flights found for this airport.');
      } else {
        setError('No flights found. Try a valid airport IATA like JFK, LHR, DEL, BOM.');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const airlines = useMemo(() => {
    const set = new Set(flights.map(f => f.airline).filter(Boolean));
    return Array.from(set);
  }, [flights]);

  const filteredSorted = useMemo(() => {
    let out = [...flights];
    if (filterStatus !== 'all') out = out.filter(f => (f.status || '').toLowerCase() === filterStatus);
    if (filterAirline !== 'all') out = out.filter(f => f.airline === filterAirline);
    out.sort((a, b) => {
      if (sortBy === 'airline') return (a.airline || '').localeCompare(b.airline || '');
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      // scheduled
      const da = a.scheduled_departure ? new Date(a.scheduled_departure).getTime() : 0;
      const db = b.scheduled_departure ? new Date(b.scheduled_departure).getTime() : 0;
      return da - db;
    });
    return out;
  }, [flights, sortBy, filterStatus, filterAirline]);

  const handleSimulateBooking = (flight) => {
    setBooked(flight);
  };

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', padding: 10, borderRadius: 10, display: 'inline-flex' }}>
          <Ticket size={20} color="#4ade80" />
        </span>
        <h1 style={{ margin: 0 }}>Booking — Simulation Only</h1>
        <span style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', fontSize: '0.7rem', padding: '4px 8px', borderRadius: 999 }}>No real ticketing</span>
      </div>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
        Search flights by airport IATA (e.g. JFK, LHR, DXB, DEL). Results come from <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: 4 }}> /api/airports/{'{code}'}/flights/</code> (AeroDataBox). Sorting & filtering is client-side. “Schedule booking” is a local simulation only.
      </p>

      {/* Search bar with sorting options */}
      <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: 12, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 280px', alignItems: 'center', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.45rem 0.6rem' }}>
          <Search size={16} color="#a1a1aa" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Airport IATA — e.g. JFK" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff' }} />
        </div>
        <button type="submit" disabled={loading} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.6rem 1.1rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Searching...' : 'Display flights'}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: '0.85rem' }}><ArrowUpDown size={14} /> Sort:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="scheduled">Scheduled time</option>
            <option value="airline">Airline</option>
            <option value="status">Status</option>
          </select>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: '0.85rem' }}><Filter size={14} /> Filter:</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="all">All statuses</option>
            <option value="scheduled">scheduled</option>
            <option value="active">active</option>
            <option value="landed">landed</option>
            <option value="cancelled">cancelled</option>
            <option value="incident">incident</option>
          </select>
          <select value={filterAirline} onChange={(e) => setFilterAirline(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="all">All airlines</option>
            {airlines.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </form>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>}

      {/* Display all flights */}
      {filteredSorted.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.9rem' }}>
          {filteredSorted.map((f, i) => (
            <div key={`${f.flight_number}-${i}`} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.05rem' }}>{f.flight_number}</strong>
                <span style={{ fontSize: '0.72rem', background: f.status === 'active' ? 'rgba(74,222,128,0.15)' : '#27272a', color: f.status === 'active' ? '#4ade80' : '#a1a1aa', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: 999 }}>{f.status || 'unknown'}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', color: '#a1a1aa', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plane size={14} /> {f.airline || 'Not available'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {f.origin || 'Not available'} → {f.destination || 'Not available'}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', color: '#d4d4d8', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {f.scheduled_departure ? new Date(f.scheduled_departure).toLocaleString() : 'Schedule: Not available'}</span>
              </div>
              <button onClick={() => handleSimulateBooking(f)} style={{ marginTop: '0.25rem', background: '#4ade80', color: '#000', border: 'none', padding: '0.6rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Calendar size={16} /> Schedule booking (sim)
              </button>
            </div>
          ))}
        </div>
      )}

      {flights.length === 0 && !loading && !error && (
        <div style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
          <Plane size={28} color="#4ade80" />
          <p style={{ margin: '0.75rem 0 0 0' }}>Enter an airport code above and press “Display flights”.</p>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem' }}>Examples: JFK (New York), LHR (London), DEL (Delhi), BOM (Mumbai), DXB (Dubai).</p>
        </div>
      )}

      {booked && (
        <div style={{ marginTop: '1.25rem', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} color="#4ade80" /> Booking simulation — confirmed (local only)</h3>
          <p style={{ margin: 0, color: '#d4d4d8' }}>
            Flight <strong>{booked.flight_number}</strong> ({booked.airline}) — {booked.origin} → {booked.destination}. Stored locally only; no payment, no real ticket. Refresh to clear.
          </p>
          <p style={{ margin: '0.6rem 0 0 0', color: '#a1a1aa', fontSize: '0.85rem' }}>
            Cost-increase prediction is not implemented in this build (no ML). A future model would use historical pricing + demand + weather. This area is intentionally left as a simulation.
          </p>
        </div>
      )}
    </div>
  );
};

export default Booking;
