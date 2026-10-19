import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import FlightCard from '../components/FlightCard';
import FlightDetailsPanel from '../components/FlightDetailsPanel';

const Tracking = () => {
  const [searchParams] = useSearchParams();
  const { flightNumber: routeFlightNumber } = useParams();
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [livePosition, setLivePosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [aircraftFilter, setAircraftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const searchIdRef = useRef(0);

  const handleSearch = async (query, type) => {
    const currentId = ++searchIdRef.current;
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
        const flightQuery = query.trim().toUpperCase();
        const res = await fetch(`/api/flights/search/?flight=${encodeURIComponent(flightQuery)}`);
        if (res.ok) {
          const flightObj = await res.json();
          if (!flightObj || !flightObj.flight_number) {
            setError('Flight not found.');
            return;
          }
          setSearchResults([flightObj]);
          handleSelectFlight(flightObj);
        } else if (res.status === 404) {
          const stub = {
            flight_number: flightQuery,
            airline: null,
            aircraft: null,
            status: 'unknown',
            origin: null,
            destination: null,
            lat: null,
            lon: null,
            altitude: null,
            speed: null,
            heading: null,
          };
          setSearchResults([stub]);
          setSelectedFlight(stub);
          setLivePosition(null);
          setError('This flight is not airborne right now.');
        } else {
          let detail = '';
          try {
            const e = await res.json();
            detail = e.error || e.detail || '';
          } catch {
            /* keep the generic message */
          }
          setError(detail ? `Flight not found — ${detail}` : 'Flight not found. Check the flight number.');
        }
      } else if (type === 'airport') {
        const res = await fetch(`/api/airports/${encodeURIComponent(query.trim())}/flights/`);
        if (res.ok) {
          const data = await res.json();
          const combined = [...(data.departures || []), ...(data.arrivals || [])];
          const normalized = combined.map((f) => ({
            flight_number: f.flight_number || f.number || f.flight_iata || '—',
            airline: f.airline || f.airline_iata || null,
            aircraft: f.aircraft || f.aircraft_icao || null,
            origin: f.origin || f.dep_iata || query.toUpperCase(),
            destination: f.destination || f.arr_iata || null,
            status: f.status || 'unknown',
            gate: f.gate || null,
            terminal: f.terminal || null,
            scheduled_departure: f.scheduled_departure || f.scheduledTimeUtc || null,
            lat: f.lat,
            lon: f.lon,
          }));
          setSearchResults(normalized);
          if (normalized.length === 0) setError('No flights listed for this airport.');
        } else {
          setError('Airport not found. Check the airport code.');
        }
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

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
    if (!origin || !dest) {
      setRoute(null);
      return;
    }
    try {
      const [oRes, dRes] = await Promise.all([
        fetch(`/api/airports/${encodeURIComponent(origin)}/`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/airports/${encodeURIComponent(dest)}/`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (oRes && dRes && oRes.lat != null && oRes.lon != null && dRes.lat != null && dRes.lon != null) {
        setRoute({ origin: [oRes.lat, oRes.lon], destination: [dRes.lat, dRes.lon] });
      } else {
        setRoute(null);
      }
    } catch {
      setRoute(null);
    }
  };

  const handleSelectFlight = (flight) => {
    const flightNum = flight.flight_number;
    setSelectedFlight(flight);
    if (flight.lat != null && flight.lon != null) {
      setLivePosition(flight);
    } else {
      pollPosition(flightNum);
    }
    fetchRoute(flight);
    fetch(`/api/flights/search/?flight=${encodeURIComponent(flightNum)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((flightObj) => {
        if (flightObj && flightObj.flight_number) {
          setSelectedFlight(flightObj);
          fetchRoute(flightObj);
          if (flightObj.lat != null && flightObj.lon != null) setLivePosition(flightObj);
        }
      })
      .catch(() => {});
  };

  const operators = useMemo(() => {
    const s = new Set(searchResults.map((r) => r.airline).filter(Boolean));
    return Array.from(s);
  }, [searchResults]);

  const aircrafts = useMemo(() => {
    const s = new Set(searchResults.map((r) => r.aircraft).filter(Boolean));
    return Array.from(s);
  }, [searchResults]);

  const filteredResults = useMemo(
    () =>
      searchResults.filter((r) => {
        if (operatorFilter !== 'all' && r.airline !== operatorFilter) return false;
        if (aircraftFilter !== 'all' && r.aircraft !== aircraftFilter) return false;
        if (statusFilter !== 'all' && (r.status || '').toLowerCase() !== statusFilter) return false;
        return true;
      }),
    [searchResults, operatorFilter, aircraftFilter, statusFilter]
  );

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
    try {
      const res = await fetch(`/api/flights/search/?flight=${encodeURIComponent(flightNumber)}`);
      if (res.ok) {
        const flightObj = await res.json();
        if (flightObj && flightObj.lat != null && flightObj.lon != null) {
          setLivePosition(flightObj);
          setSelectedFlight((prev) => (prev ? { ...prev, ...flightObj } : flightObj));
        } else if (flightObj && flightObj.flight_number) {
          setSelectedFlight((prev) => (prev ? { ...prev, ...flightObj } : flightObj));
        }
      }
    } catch (e) {
      /* a failed poll keeps the last known position */
    }
  };

  useEffect(() => {
    const flightParam = searchParams.get('flight');
    if (flightParam && !selectedFlight && !routeFlightNumber) {
      handleSearch(flightParam, 'flight');
    }
  }, [searchParams, routeFlightNumber]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(380px, 2fr)', height: 'calc(100vh - 60px)' }}>
      <div style={{ position: 'relative', minHeight: 320 }}>
        <Map position={livePosition} route={route} selectedFlight={selectedFlight} onSelectFlight={handleSelectFlight} />
      </div>

      <div style={{ padding: '28px 26px 40px', overflowY: 'auto', borderLeft: '1px solid var(--line)' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 20 }}>Tracking</h1>

        <SearchBar onSearch={handleSearch} disabled={loading} />

        {loading && <p className="note" style={{ marginTop: 14 }}>Searching…</p>}
        {error && <div className="alert alert--error" style={{ marginTop: 16 }}>{error}</div>}

        {!selectedFlight && searchResults.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '0.95rem' }}>
                Results
                <span className="note" style={{ marginLeft: 8, fontWeight: 400 }}>
                  {filteredResults.length} of {searchResults.length}
                </span>
              </h2>
            </div>

            {(operators.length > 0 || aircrafts.length > 0) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <select className="select" value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} style={{ width: 160, padding: '7px 30px 7px 10px' }}>
                  <option value="all">All operators</option>
                  {operators.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
                <select className="select" value={aircraftFilter} onChange={(e) => setAircraftFilter(e.target.value)} style={{ width: 160, padding: '7px 30px 7px 10px' }}>
                  <option value="all">All aircraft</option>
                  {aircrafts.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160, padding: '7px 30px 7px 10px' }}>
                  <option value="all">All statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="landed">Landed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {filteredResults.map((f, i) => (
              <FlightCard key={i} flight={f} onSelect={() => handleSelectFlight(f)} />
            ))}
            {filteredResults.length === 0 && <p className="note">No flights match the current filters.</p>}
          </div>
        )}

        {selectedFlight && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setSelectedFlight(null)}
              style={{ background: 'none', border: 0, color: 'var(--accent)', cursor: 'pointer', padding: 0, marginBottom: 18, fontSize: '0.9rem' }}
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
