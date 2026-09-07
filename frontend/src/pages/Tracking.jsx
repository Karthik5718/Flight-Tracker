import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import FlightCard from '../components/FlightCard';
import FlightDetailsPanel from '../components/FlightDetailsPanel';
import { Plane, AlertTriangle, Filter } from 'lucide-react';

const Tracking = () => {
  const [searchParams] = useSearchParams();
  const { flightNumber: routeFlightNumber } = useParams();
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [livePosition, setLivePosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Browse by operator/aircraft filters
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [aircraftFilter, setAircraftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSearch = async (query, type) => {
    setLoading(true);
    setError('');
    setSearchResults([]);
    setSelectedFlight(null);
    setLivePosition(null);
    setOperatorFilter('all');
    setAircraftFilter('all');
    setStatusFilter('all');

    try {
      if (type === 'flight') {
        // Verified backend: GET /api/flights/search/?flight=EK440 → 200 {flight_number, lat, lon, altitude, speed, heading}
        const flightQuery = query.trim().toUpperCase();
        const res = await fetch(`/api/flights/search/?flight=${encodeURIComponent(flightQuery)}`);
        if (res.ok) {
          const flightObj = await res.json();
          if (!flightObj || !flightObj.flight_number) {
            setError('Flight not found — empty response.');
            return;
          }
          setSearchResults([flightObj]);
          handleSelectFlight(flightObj);
        } else {
          // For schedule flights with no live record, AirLabs /flights returns [] → Django 404
          // Don't show generic "Flight not found" — show live unavailable but keep flight identified
          if (res.status === 404) {
            const stub = { flight_number: flightQuery, airline: 'Not available', aircraft: 'Not available', status: 'unknown', origin: 'Not available', destination: 'Not available', lat: null, lon: null, altitude: null, speed: null, heading: null };
            setSearchResults([stub]);
            setSelectedFlight(stub);
            setLivePosition(null);
            setError('Live tracking unavailable for this flight.');
            return;
          }
          let detail = '';
          try { const e = await res.json(); detail = e.error || e.detail || ''; } catch {}
          setError(detail ? `Flight not found — ${detail}` : 'Flight not found — check flight number and AirLabs key.');
        }
      } else if (type === 'airport') {
        const res = await fetch(`/api/airports/${encodeURIComponent(query.trim())}/flights/`);
        if (res.ok) {
          const data = await res.json();
          const combined = [...(data.departures || []), ...(data.arrivals || [])];
          const normalized = combined.map(f => ({
            flight_number: f.flight_number || f.number || f.flight_iata || '—',
            airline: f.airline || f.airline_iata || 'Not available',
            aircraft: f.aircraft || f.aircraft_icao || 'Not available',
            origin: f.origin || f.dep_iata || query.toUpperCase(),
            destination: f.destination || f.arr_iata || 'Not available',
            status: f.status || 'unknown',
            gate: f.gate || null,
            terminal: f.terminal || null,
            scheduled_departure: f.scheduled_departure || f.scheduledTimeUtc || null,
            lat: f.lat,
            lon: f.lon,
          }));
          setSearchResults(normalized);
          if (normalized.length === 0) setError('No flights at this airport in the current window.');
        } else {
          setError('Airport not found — check IATA/ICAO and AeroDataBox key.');
        }
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  // Handle initial query from Home quick search ?q=&type= and route param /tracking/:flightNumber
  useEffect(() => {
    if (routeFlightNumber) {
      handleSearch(routeFlightNumber, 'flight');
      return;
    }
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    if (q && type) handleSearch(q, type);
  }, [routeFlightNumber]);

  const [route, setRoute] = useState(null);

  const fetchRoute = async (flight) => {
    const origin = flight.origin;
    const dest = flight.destination;
    if (!origin || !dest) { setRoute(null); return; }
    try {
      const [oRes, dRes] = await Promise.all([
        fetch(`/api/airports/${encodeURIComponent(origin)}/`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/airports/${encodeURIComponent(dest)}/`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (oRes && dRes && oRes.lat != null && oRes.lon != null && dRes.lat != null && dRes.lon != null) {
        setRoute([[oRes.lat, oRes.lon], [dRes.lat, dRes.lon]]);
      } else {
        setRoute(null);
      }
    } catch { setRoute(null); }
  };

  const handleSelectFlight = (flight) => {
    const flightNum = flight.flight_number;
    setSelectedFlight(flight);
    // Verified backend already includes lat/lon/altitude/speed/heading — use directly
    if (flight.lat != null && flight.lon != null) {
      setLivePosition(flight);
    } else {
      pollPosition(flightNum);
    }
    fetchRoute(flight);
    // Refresh once from verified endpoint to ensure latest live data
    fetch(`/api/flights/search/?flight=${encodeURIComponent(flightNum)}`).then(r => r.ok ? r.json() : null).then(flightObj => {
      if (flightObj && flightObj.flight_number) {
        setSelectedFlight(flightObj);
        fetchRoute(flightObj);
        if (flightObj.lat != null && flightObj.lon != null) setLivePosition(flightObj);
      }
    }).catch(() => {});
  };

  const operators = useMemo(() => {
    const s = new Set(searchResults.map(r => r.airline).filter(v => v && v !== 'Not available'));
    return Array.from(s);
  }, [searchResults]);
  const aircrafts = useMemo(() => {
    const s = new Set(searchResults.map(r => r.aircraft).filter(v => v && v !== 'Not available'));
    return Array.from(s);
  }, [searchResults]);
  const filteredResults = useMemo(() => {
    return searchResults.filter(r => {
      if (operatorFilter !== 'all' && r.airline !== operatorFilter) return false;
      if (aircraftFilter !== 'all' && r.aircraft !== aircraftFilter) return false;
      if (statusFilter !== 'all' && (r.status || '').toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [searchResults, operatorFilter, aircraftFilter, statusFilter]);

  // Poll for position every 30 seconds
  useEffect(() => {
    let interval;
    if (selectedFlight) {
      interval = setInterval(() => {
        pollPosition(selectedFlight.flight_number);
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [selectedFlight]);

  const pollPosition = async (flightNumber) => {
    // Poll verified endpoint exactly as browser: GET /api/flights/search/?flight=EK440
    try {
      const res = await fetch(`/api/flights/search/?flight=${encodeURIComponent(flightNumber)}`);
      if (res.ok) {
        const flightObj = await res.json();
        if (flightObj && flightObj.lat != null && flightObj.lon != null) {
          setLivePosition(flightObj);
          setSelectedFlight(prev => prev ? { ...prev, ...flightObj } : flightObj);
        } else if (flightObj && flightObj.flight_number) {
          setSelectedFlight(prev => prev ? { ...prev, ...flightObj } : flightObj);
        }
      }
    } catch (e) {
      // ignore silently on poll failure
    }
  };

  // Support legacy ?flight=EK440 query param as well
  useEffect(() => {
    const flightParam = searchParams.get('flight');
    if (flightParam && !selectedFlight && !routeFlightNumber) {
      handleSearch(flightParam, 'flight');
    }
  }, [searchParams, routeFlightNumber]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111', color: '#eee' }}>
      <div style={{ flex: '0 0 60%', position: 'relative' }}>
        <Map position={livePosition} route={route} selectedFlight={selectedFlight} onSelectFlight={handleSelectFlight} />
      </div>
      <div style={{ flex: '0 0 40%', padding: '1.5rem', overflowY: 'auto', borderLeft: '1px solid #333' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#fff' }}>
          <Plane color="#4ade80" /> Flight Tracking
        </h2>
        
        <SearchBar onSearch={handleSearch} disabled={loading} />
        
        {loading && <p style={{ marginTop: '1rem', color: '#888' }}>Searching...</p>}
        {error && (
          <p style={{ marginTop: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {error}
          </p>
        )}
        
        {!selectedFlight && searchResults.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', margin: 0 }}>Search Results ({filteredResults.length}/{searchResults.length})</h3>
              <span style={{ color: '#71717a', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Filter size={12} /> Browse by airport / operator / aircraft</span>
            </div>
            {(operators.length > 0 || aircrafts.length > 0) && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.45rem 0.6rem', borderRadius: 6, fontSize: '0.85rem' }}>
                  <option value="all">All operators</option>
                  {operators.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
                <select value={aircraftFilter} onChange={e => setAircraftFilter(e.target.value)} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.45rem 0.6rem', borderRadius: 6, fontSize: '0.85rem' }}>
                  <option value="all">All aircraft</option>
                  {aircrafts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.45rem 0.6rem', borderRadius: 6, fontSize: '0.85rem' }}>
                  <option value="all">All statuses</option>
                  <option value="scheduled">scheduled</option>
                  <option value="active">active</option>
                  <option value="landed">landed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            )}
            {filteredResults.map((f, i) => (
              <FlightCard key={i} flight={f} onSelect={() => handleSelectFlight(f)} />
            ))}
            {filteredResults.length === 0 && <p style={{ color: '#888', fontSize: '0.9rem' }}>No flights match the current filters.</p>}
          </div>
        )}

        {selectedFlight && (
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={() => setSelectedFlight(null)} 
              style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}
            >
              ← Back to results
            </button>
            <FlightDetailsPanel flight={selectedFlight} position={livePosition} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
