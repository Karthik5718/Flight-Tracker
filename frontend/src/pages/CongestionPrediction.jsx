import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  AlertTriangle,
  Plane,
  Clock,
  TrendingUp,
  BarChart3,
  Calendar,
  RefreshCw,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import {
  getAirportInfo,
  getAirportFlights,
  getAirportHistory,
  searchAirports,
} from '../services/airport';
import {
  aggregateYearly,
  aggregateMonthlySeasonality,
  calculateYearOverYearGrowth,
  getAnnualSummary,
  getHistoricalMonthlyInsight,
  calculateCongestionScore,
  processLiveFlights,
  getAirportOperationalBaseline,
} from '../utils/dataProcessing';
import {
  YearlyPassengerTrendChart,
  YearlyDeparturesArrivalsChart,
  MonthlyPassengerTrendChart,
  MonthlySeasonalityChart,
  YearOverYearGrowthChart,
  DeparturesVsArrivalsChart,
  DelayBreakdownChart,
  CircularProgress,
  SummaryCard,
} from '../components/charts';

const POPULAR_AIRPORTS = [
  { code: 'DEL', name: 'Indira Gandhi Intl', city: 'Delhi' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai' },
  { code: 'BLR', name: 'Kempegowda Intl', city: 'Bengaluru' },
  { code: 'MAA', name: 'Chennai Intl', city: 'Chennai' },
  { code: 'CCU', name: 'Netaji Subhash Chandra Bose', city: 'Kolkata' },
  { code: 'HYD', name: 'Rajiv Gandhi Intl', city: 'Hyderabad' },
];

function formatTime(val) {
  if (!val) return '—';
  try {
    const cleanStr = String(val).replace(' ', 'T');
    const d = new Date(cleanStr.includes('Z') || cleanStr.includes('+') ? cleanStr : cleanStr + 'Z');
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return String(val);
  }
}

function UpcomingFlightsTable({ flights, direction = 'dep', onSelectFlight }) {
  if (!flights || !flights.length) {
    return (
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px dashed var(--border-color)',
        borderRadius: 12,
        padding: '2.5rem 1rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
      }}>
        No upcoming {direction === 'dep' ? 'departures' : 'arrivals'} scheduled in the immediate window.
      </div>
    );
  }

  const getStatusBadge = (status, delay) => {
    const s = (status || '').toLowerCase();
    let bg = '#27272a';
    let color = '#a1a1aa';
    let border = '#3f3f46';

    if (s === 'en-route' || s === 'active' || s === 'landed') {
      bg = 'rgba(74, 222, 128, 0.15)';
      color = '#4ade80';
      border = 'rgba(74, 222, 128, 0.4)';
    } else if (s === 'delayed' || (delay != null && delay > 0)) {
      bg = 'rgba(250, 204, 21, 0.15)';
      color = '#facc15';
      border = 'rgba(250, 204, 21, 0.4)';
    } else if (s === 'cancelled') {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = 'rgba(239, 68, 68, 0.4)';
    } else if (s === 'scheduled') {
      bg = 'rgba(96, 165, 250, 0.15)';
      color = '#60a5fa';
      border = 'rgba(96, 165, 250, 0.4)';
    }

    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'inline-block',
      }}>
        {status || 'Scheduled'}
      </span>
    );
  };

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{
              background: '#121215',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ padding: '0.75rem 1rem' }}>Flight</th>
              <th style={{ padding: '0.75rem 1rem' }}>Airline</th>
              <th style={{ padding: '0.75rem 1rem' }}>{direction === 'dep' ? 'Destination' : 'Origin'}</th>
              <th style={{ padding: '0.75rem 1rem' }}>Scheduled Time</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Delay</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f, i) => {
              const timeVal = direction === 'dep' ? f.scheduled_departure : f.scheduled_arrival;
              const routeVal = direction === 'dep' ? f.destination : f.origin;
              const canClick = Boolean(f.flight_number && f.flight_number !== '—');
              return (
                <tr
                  key={`${f.flight_number || 'flt'}-${i}`}
                  onClick={() => canClick && onSelectFlight && onSelectFlight(f.flight_number)}
                  style={{
                    borderBottom: i < flights.length - 1 ? '1px solid var(--border-color)' : 'none',
                    cursor: canClick ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (canClick) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: canClick ? '#4ade80' : '#fff' }}>
                    <div>{f.flight_number || '—'}</div>
                    {f.codeshares && f.codeshares.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                        Codeshare: {f.codeshares.slice(0, 2).join(', ')}{f.codeshares.length > 2 ? ` +${f.codeshares.length - 2}` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d4d4d8' }}>
                    {f.airline || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d4d4d8' }}>
                    {routeVal || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {formatTime(timeVal)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {getStatusBadge(f.status, f.delay_minutes)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {f.delay_minutes != null && f.delay_minutes > 0 ? (
                      <span style={{ color: '#facc15', fontWeight: 600 }}>+{f.delay_minutes}m</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CongestionPrediction = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search and selection state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAirportCode, setSelectedAirportCode] = useState('');

  // Loaded data state
  const [airportInfo, setAirportInfo] = useState(null);
  const [liveFlightsRaw, setLiveFlightsRaw] = useState(null);
  const [historyRecords, setHistoryRecords] = useState(null);

  // Status and error states
  const [loading, setLoading] = useState(false);
  const [mainError, setMainError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [historyError, setHistoryError] = useState('');

  // Ref to track latest request ID and prevent race conditions/stale data
  const requestIdRef = useRef(0);
  const searchDebounceRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search suggestions
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const { ok, data } = await searchAirports(trimmed);
        if (ok && data?.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);
  };

  // Main data loading function for selected airport
  const loadAirportData = useCallback(async (codeToLoad) => {
    const code = (codeToLoad || '').trim().toUpperCase();
    if (!code) return;

    const currentRequestId = ++requestIdRef.current;

    // Immediately reset prior data to prevent stale display
    setLoading(true);
    setMainError('');
    setLiveError('');
    setHistoryError('');
    setAirportInfo(null);
    setLiveFlightsRaw(null);
    setHistoryRecords(null);

    try {
      // Execute all 3 services concurrently
      const [infoRes, flightsRes, historyRes] = await Promise.allSettled([
        getAirportInfo(code),
        getAirportFlights(code),
        getAirportHistory(code),
      ]);

      // Guard against stale asynchronous responses
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      let hasAnySuccess = false;

      // 1. Airport Info
      if (infoRes.status === 'fulfilled' && infoRes.value.ok && infoRes.value.data) {
        setAirportInfo(infoRes.value.data);
        hasAnySuccess = true;
      } else {
        // Fallback info with minimal known details
        setAirportInfo({ iata: code, name: code, icao: null });
      }

      // 2. Live Flights
      if (flightsRes.status === 'fulfilled' && flightsRes.value.ok && flightsRes.value.data) {
        setLiveFlightsRaw(flightsRes.value.data);
        hasAnySuccess = true;
      } else {
        setLiveError('Live flight activity is currently unavailable for this airport.');
      }

      // 3. Historical Data
      if (historyRes.status === 'fulfilled' && historyRes.value.ok && historyRes.value.data?.records) {
        setHistoryRecords(historyRes.value.data.records);
        hasAnySuccess = true;
      } else {
        setHistoryError('Historical passenger and flight records are not available for this airport in the dataset.');
      }

      if (!hasAnySuccess) {
        setMainError(`No records found for airport code "${code}". Please verify the IATA code and try again.`);
      }
    } catch {
      if (requestIdRef.current === currentRequestId) {
        setMainError('Network error while connecting to airport services. Please check your connection and retry.');
      }
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, []);

  // Airport selection handler
  const selectAirport = useCallback((code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return;

    setSelectedAirportCode(cleanCode);
    setSearchInput(cleanCode);
    setShowSuggestions(false);
    setSuggestions([]);

    // Update URL query parameter
    setSearchParams({ airport: cleanCode }, { replace: false });
    loadAirportData(cleanCode);
  }, [loadAirportData, setSearchParams]);

  // Form submit handler
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchInput.trim().toUpperCase();
    if (!query) return;

    // If suggestions are visible and query matches first suggestion, use it
    if (suggestions.length > 0 && query.length !== 3) {
      selectAirport(suggestions[0].iata);
    } else {
      selectAirport(query);
    }
  };

  // Support direct URL parameter on initial load and browser back/forward navigation
  useEffect(() => {
    const urlAirport = searchParams.get('airport');
    if (urlAirport) {
      const clean = urlAirport.trim().toUpperCase();
      if (clean !== selectedAirportCode) {
        setSelectedAirportCode(clean);
        setSearchInput(clean);
        loadAirportData(clean);
      }
    }
  }, [searchParams, selectedAirportCode, loadAirportData]);

  // Navigate to flight tracking
  const handleTrackFlight = (flightNumber) => {
    if (!flightNumber || flightNumber === '—') return;
    navigate(`/tracking/${encodeURIComponent(flightNumber)}`);
  };

  // Compute airport operational baseline from historical records
  const operationalBaseline = useMemo(() => {
    if (!historyRecords || !historyRecords.length) return null;
    return getAirportOperationalBaseline(historyRecords, selectedAirportCode);
  }, [historyRecords, selectedAirportCode]);

  // Process live flights data with strict airport filtering & codeshare deduplication
  const processedLive = useMemo(() => {
    if (!liveFlightsRaw) return null;
    return processLiveFlights(liveFlightsRaw, selectedAirportCode);
  }, [liveFlightsRaw, selectedAirportCode]);

  // Calculate congestion score using normalized activity against baseline and delay rate
  const congestionScore = useMemo(() => {
    if (!processedLive) return null;
    return calculateCongestionScore(processedLive, operationalBaseline);
  }, [processedLive, operationalBaseline]);

  // Process historical yearly data
  const yearlyData = useMemo(() => {
    if (!historyRecords || !historyRecords.length) return [];
    return aggregateYearly(historyRecords);
  }, [historyRecords]);

  // Process monthly seasonality
  const seasonalityData = useMemo(() => {
    if (!historyRecords || !historyRecords.length) return [];
    return aggregateMonthlySeasonality(historyRecords);
  }, [historyRecords]);

  // Process year-over-year growth
  const growthData = useMemo(() => {
    if (!yearlyData || !yearlyData.length) return [];
    return calculateYearOverYearGrowth(yearlyData);
  }, [yearlyData]);

  // Annual summary statistics
  const annualSummary = useMemo(() => {
    if (!yearlyData || !yearlyData.length) return null;
    return getAnnualSummary(yearlyData);
  }, [yearlyData]);

  // Monthly passenger trend
  const monthlyTrendData = useMemo(() => {
    if (!historyRecords || !historyRecords.length) return [];
    return historyRecords.filter((r) => r.passengers != null);
  }, [historyRecords]);

  // Historical monthly insight with fallback to latest recorded month
  const monthlyInsight = useMemo(() => {
    if (!historyRecords || !historyRecords.length) return null;
    const directInsight = getHistoricalMonthlyInsight(historyRecords);
    if (directInsight) return directInsight;

    // Fallback: baseline from most recent month available in dataset
    const sorted = [...historyRecords].sort((a, b) => (b.year - a.year) || (b.month - a.month));
    if (!sorted.length) return null;

    const latest = sorted[0];
    const targetMonth = latest.month;
    const monthRecords = historyRecords.filter((r) => r.month === targetMonth);
    const latestRecord = monthRecords.reduce((max, r) => (r.year > max.year ? r : max), monthRecords[0]);
    const prevRecord = monthRecords.find((r) => r.year === latestRecord.year - 1);

    let passengerChange = null;
    let departureChange = null;
    let arrivalChange = null;

    if (prevRecord) {
      if (latestRecord.passengers != null && prevRecord.passengers != null && prevRecord.passengers > 0) {
        passengerChange = ((latestRecord.passengers - prevRecord.passengers) / prevRecord.passengers) * 100;
      }
      if (latestRecord.departures != null && prevRecord.departures != null && prevRecord.departures > 0) {
        departureChange = ((latestRecord.departures - prevRecord.departures) / prevRecord.departures) * 100;
      }
      if (latestRecord.arrivals != null && prevRecord.arrivals != null && prevRecord.arrivals > 0) {
        arrivalChange = ((latestRecord.arrivals - prevRecord.arrivals) / prevRecord.arrivals) * 100;
      }
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return {
      month: targetMonth,
      monthName: monthNames[targetMonth - 1],
      currentYear: latestRecord.year,
      currentPassengers: latestRecord.passengers,
      currentDepartures: latestRecord.departures,
      currentArrivals: latestRecord.arrivals,
      previousYear: prevRecord?.year ?? null,
      previousPassengers: prevRecord?.passengers ?? null,
      previousDepartures: prevRecord?.departures ?? null,
      previousArrivals: prevRecord?.arrivals ?? null,
      passengerChange,
      departureChange,
      arrivalChange,
      isLatestAvailableBaseline: true,
    };
  }, [historyRecords]);

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* =========================================================================
          SECTION 1: Airport search and selected airport header
          ========================================================================= */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.8rem' }}>
            <Building2 color="#4ade80" /> Airport Congestion & Operations Dashboard
          </h1>
          {selectedAirportCode && (
            <button
              onClick={() => loadAirportData(selectedAirportCode)}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#18181b',
                color: '#d4d4d8',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 0.9rem',
                borderRadius: 8,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              title="Refresh live telemetry"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 1.25rem 0', fontSize: '0.95rem' }}>
          Explore estimated activity/congestion indicators, live scheduled operations, and authoritative multi-year traffic trends.
        </p>

        {/* Search input with suggestions */}
        <div ref={searchContainerRef} style={{ position: 'relative', marginBottom: '1rem' }}>
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              padding: '0.6rem',
              borderRadius: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.6rem',
                flex: '1 1 300px',
                alignItems: 'center',
                background: '#09090b',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '0.55rem 0.75rem',
              }}
            >
              <Search size={16} color="#a1a1aa" />
              <input
                value={searchInput}
                onChange={handleInputChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Search by IATA code or airport name (e.g. DEL, Mumbai, BLR)..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              style={{
                background: '#4ade80',
                color: '#000',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: 8,
                fontWeight: 700,
                cursor: loading || !searchInput.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !searchInput.trim() ? 0.6 : 1,
                fontSize: '0.9rem',
              }}
            >
              {loading ? 'Loading...' : 'Check Congestion'}
            </button>
          </form>

          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 6,
                background: '#121215',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                zIndex: 50,
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((item, idx) => (
                <div
                  key={`${item.iata}-${idx}`}
                  onClick={() => selectAirport(item.iata)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid #1f1f23' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1f1f23';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        background: 'rgba(74, 222, 128, 0.15)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        color: '#4ade80',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {item.iata}
                    </span>
                    <span style={{ color: '#fff', fontSize: '0.92rem' }}>{item.name}</span>
                  </div>
                  {item.icao && (
                    <span style={{ color: '#71717a', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      {item.icao}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected airport banner */}
        {airportInfo && (
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <span
                  style={{
                    background: '#4ade80',
                    color: '#000',
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {airportInfo.iata || selectedAirportCode}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>
                  {airportInfo.name || selectedAirportCode}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                {airportInfo.icao && (
                  <span>
                    ICAO: <strong style={{ color: '#d4d4d8', fontFamily: 'JetBrains Mono, monospace' }}>{airportInfo.icao}</strong>
                  </span>
                )}
                {airportInfo.lat != null && airportInfo.lon != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Navigation size={13} />
                    {Number(airportInfo.lat).toFixed(4)}, {Number(airportInfo.lon).toFixed(4)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#4ade80',
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                ● Active Airport Selection
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Global / Top-level Error State */}
      {mainError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid #ef4444',
            color: '#fecaca',
            padding: '1rem 1.25rem',
            borderRadius: 12,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#ef4444" />
            <div>
              <strong>Error Loading Airport</strong>
              <div style={{ fontSize: '0.9rem', color: '#fca5a5', marginTop: 2 }}>{mainError}</div>
            </div>
          </div>
          {selectedAirportCode && (
            <button
              onClick={() => loadAirportData(selectedAirportCode)}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '0.45rem 0.9rem',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Initial Empty State (When no airport has been selected yet) */}
      {!selectedAirportCode && !loading && !mainError && (
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '1px dashed var(--border-color)',
            borderRadius: 16,
            padding: '3rem 2rem',
            textAlign: 'center',
            marginBottom: '2rem',
          }}
        >
          <Building2 size={48} color="#4ade80" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>
            Select an Airport to View Live & Historical Telemetry
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 1.75rem auto', lineHeight: 1.6 }}>
            Search by airport name or 3-letter IATA code in the box above, or click one of the popular hubs below to explore real-time activity and long-term historical trends.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {POPULAR_AIRPORTS.map((item) => (
              <button
                key={item.code}
                onClick={() => selectAirport(item.code)}
                style={{
                  background: '#09090b',
                  border: '1px solid var(--border-color)',
                  color: '#f4f4f5',
                  padding: '0.6rem 1rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4ade80';
                  e.currentTarget.style.background = '#18181b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = '#09090b';
                }}
              >
                <strong style={{ color: '#4ade80', fontFamily: 'JetBrains Mono, monospace' }}>{item.code}</strong>
                <span>{item.city}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State Spinner */}
      {loading && (
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            padding: '3rem',
            textAlign: 'center',
            marginBottom: '2rem',
          }}
        >
          <RefreshCw size={36} color="#4ade80" className="spin" style={{ marginBottom: '1rem' }} />
          <h3 style={{ margin: 0, color: '#fff' }}>Fetching Airport Telemetry & Historical Dataset...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Loading live schedules, delay metrics, and monthly records for {selectedAirportCode}...
          </p>
        </div>
      )}

      {/* Main Dashboard Body when an airport is selected and loaded */}
      {selectedAirportCode && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* =========================================================================
              SECTION 2: Congestion gauge and live KPI cards
              ========================================================================= */}
          <section>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plane size={18} color="#4ade80" /> Estimated Airport Activity & Congestion Score
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Calculated directly from live scheduled flights, active turnarounds, and delay patterns.
              </p>
            </div>

            {liveError ? (
              <div
                style={{
                  background: 'rgba(250, 204, 21, 0.08)',
                  border: '1px solid rgba(250, 204, 21, 0.3)',
                  color: '#fef08a',
                  padding: '1rem',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.88rem',
                }}
              >
                <AlertTriangle size={18} color="#facc15" />
                <span>{liveError} Historical traffic metrics remain accessible below.</span>
              </div>
            ) : processedLive && congestionScore ? (
              <div>
                {/* Sample Notice when API returns a limited batch */}
                {processedLive.isPartial && (
                  <div
                    style={{
                      background: 'rgba(250, 204, 21, 0.08)',
                      border: '1px solid rgba(250, 204, 21, 0.25)',
                      borderRadius: 10,
                      padding: '0.65rem 0.9rem',
                      marginBottom: '1rem',
                      fontSize: '0.82rem',
                      color: '#fef08a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Info size={16} color="#facc15" />
                    <span>
                      <strong>Schedule sample notice:</strong> Showing {processedLive.totalUniqueFlights} unique flights ({processedLive.totalRecordsFetched} records retrieved)
                      {processedLive.totalReported ? ` of ${processedLive.totalReported.toLocaleString()} schedule items reported by API provider` : ''}.
                      {processedLive.totalCodesharesConsolidated > 0 ? ` Consolidated ${processedLive.totalCodesharesConsolidated} codeshare records.` : ''} Metrics reflect the retrieved operational window.
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '1rem' }}>
                  {/* Circular Gauge Card */}
                  <div
                    style={{
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress
                      value={congestionScore.score != null ? congestionScore.score : 0}
                      size={170}
                      strokeWidth={12}
                      label="Activity Score"
                    />
                    <div
                      style={{
                        marginTop: '1rem',
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.75rem',
                        width: '100%',
                      }}
                    >
                      <strong>Estimated Activity & Delay Indicator</strong>
                      <br />
                      Activity: {congestionScore.activityScore != null ? `${congestionScore.activityScore}/100` : 'N/A'} (70% wt) · Delays: {congestionScore.delayScore != null ? `${congestionScore.delayScore}/100` : 'Not reported'} (30% wt)
                      <br />
                      <span style={{ color: '#d4d4d8', fontSize: '0.74rem' }}>
                        {congestionScore.baseline?.description}
                      </span>
                      {congestionScore.delayRate != null && (
                        <>
                          <br />
                          <span style={{ color: '#facc15', fontSize: '0.74rem' }}>
                            Known delay rate: {congestionScore.delayRate.toFixed(1)}% ({congestionScore.delayedFlights}/{congestionScore.knownDelayFlights} flights)
                          </span>
                        </>
                      )}
                      <br />
                      <em style={{ color: '#71717a', fontSize: '0.72rem' }}>
                        Estimated indicator. Not an official measure of terminal crowding.
                      </em>
                    </div>
                  </div>

                  {/* Live KPI Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <SummaryCard
                      title={`Scheduled Departures${processedLive.isPartial ? ' (Sample)' : ''}`}
                      value={processedLive.uniqueDepartures.toLocaleString()}
                      subtitle={`${processedLive.onTimeDepartures || 0} on time · ${processedLive.delayedDepartures || 0} delayed${processedLive.departuresCodeshareCount > 0 ? ` · ${processedLive.departuresCodeshareCount} codeshares merged` : ''}${processedLive.departuresTotalReported ? ` · ${processedLive.departuresTotalReported} reported` : ''}`}
                      icon={<Plane size={18} />}
                    />
                    <SummaryCard
                      title={`Scheduled Arrivals${processedLive.isPartial ? ' (Sample)' : ''}`}
                      value={processedLive.uniqueArrivals.toLocaleString()}
                      subtitle={`${processedLive.onTimeArrivals || 0} on time · ${processedLive.delayedArrivals || 0} delayed${processedLive.arrivalsCodeshareCount > 0 ? ` · ${processedLive.arrivalsCodeshareCount} codeshares merged` : ''}${processedLive.arrivalsTotalReported ? ` · ${processedLive.arrivalsTotalReported} reported` : ''}`}
                      icon={<Plane size={18} style={{ transform: 'rotate(90deg)' }} />}
                    />
                    <SummaryCard
                      title="Delayed Operations"
                      value={processedLive.totalDelayed.toLocaleString()}
                      subtitle={`${processedLive.delayRate != null ? `${processedLive.delayRate.toFixed(1)}% delay rate (${processedLive.totalWithKnownDelayStatus} known)` : 'Delay rate unavailable'} (${processedLive.delayedDepartures} dep · ${processedLive.delayedArrivals} arr)`}
                      icon={<Clock size={18} />}
                    />
                    <SummaryCard
                      title="Flight Status Breakdown"
                      value={`${processedLive.onTimeTotal} On-Time`}
                      subtitle={`${processedLive.unknownTotal} unknown delay · ${processedLive.cancelledCount} cancelled${processedLive.totalActive > 0 ? ` · ${processedLive.totalActive} airborne` : ''}`}
                      icon={<AlertTriangle size={18} />}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* =========================================================================
              SECTION 3: Yearly passenger trend — Prominent Historical Chart
              ========================================================================= */}
          <section>
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid #3f3f46',
                borderRadius: 14,
                padding: '1.25rem 1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '0.85rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={22} color="#4ade80" />
                    <h2 style={{ fontSize: '1.35rem', margin: 0, color: '#fff' }}>
                      Historical Annual Passenger Traffic
                    </h2>
                    <span
                      style={{
                        background: 'rgba(74, 222, 128, 0.15)',
                        border: '1px solid rgba(74, 222, 128, 0.4)',
                        color: '#4ade80',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      Core Trend
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
                    Authoritative annual passenger volume for {selectedAirportCode} aggregated from monthly records.
                  </p>
                </div>

                {annualSummary && (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        Latest ({annualSummary.latestYear})
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>
                        {annualSummary.latestPassengers.toLocaleString()}
                        {annualSummary.latestIsPartial && (
                          <span style={{ fontSize: '0.72rem', color: '#facc15', marginLeft: 4 }}>*Partial</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        Peak ({annualSummary.highestYear})
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#4ade80' }}>
                        {annualSummary.highestPassengers.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {historyError ? (
                <div className="chart-empty">{historyError}</div>
              ) : yearlyData.filter((y) => y.hasPassengerData).length > 0 ? (
                <YearlyPassengerTrendChart
                  data={yearlyData.filter((y) => y.hasPassengerData)}
                  height={380}
                />
              ) : (
                <div className="chart-empty">No annual passenger records found for {selectedAirportCode}.</div>
              )}
            </div>
          </section>

          {/* =========================================================================
              SECTION 4: Yearly departures and arrivals trend
              ========================================================================= */}
          <section>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="#60a5fa" /> Annual Flight Operations Trend (Departures vs Arrivals)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Long-term comparison of historical departures and arrivals recorded annually.
              </p>
            </div>

            {historyError ? (
              <div className="chart-empty">{historyError}</div>
            ) : yearlyData.filter((y) => y.hasFlightData).length > 0 ? (
              <YearlyDeparturesArrivalsChart
                data={yearlyData.filter((y) => y.hasFlightData)}
                height={350}
              />
            ) : (
              <div className="chart-empty">No annual flight operations records available for {selectedAirportCode}.</div>
            )}
          </section>

          {/* =========================================================================
              SECTION 5: Monthly passenger trend and monthly seasonality
              ========================================================================= */}
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.25rem' }}>
              {/* Monthly Passenger Trend */}
              <div>
                <div style={{ marginBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={16} color="#4ade80" /> Monthly Passenger Traffic Timeline
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                    Continuous timeline of monthly passenger counts across all recorded years.
                  </p>
                </div>
                {historyError ? (
                  <div className="chart-empty">{historyError}</div>
                ) : monthlyTrendData.length > 0 ? (
                  <MonthlyPassengerTrendChart data={monthlyTrendData} height={340} />
                ) : (
                  <div className="chart-empty">No monthly passenger trend records available.</div>
                )}
              </div>

              {/* Monthly Seasonality Profile */}
              <div>
                <div style={{ marginBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={16} color="#facc15" /> Monthly Seasonality Profile
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                    Average monthly volume across all recorded years highlighting seasonal peaks.
                  </p>
                </div>
                {historyError ? (
                  <div className="chart-empty">{historyError}</div>
                ) : seasonalityData.length > 0 ? (
                  <MonthlySeasonalityChart data={seasonalityData} height={340} />
                ) : (
                  <div className="chart-empty">No seasonality records available.</div>
                )}
              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION 6: Year-over-year growth chart and annual summary cards
              ========================================================================= */}
          <section>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="#4ade80" /> Year-over-Year Passenger Growth & Historical Summary
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Annual growth percentage dynamics and key historical milestones.
              </p>
            </div>

            {/* Growth Chart */}
            <div style={{ marginBottom: '1.25rem' }}>
              {historyError ? (
                <div className="chart-empty">{historyError}</div>
              ) : growthData.length > 0 ? (
                <YearOverYearGrowthChart data={growthData} height={320} />
              ) : (
                <div className="chart-empty">Insufficient consecutive years to calculate YoY growth.</div>
              )}
            </div>

            {/* Annual Summary KPI Cards */}
            {annualSummary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <SummaryCard
                  title="Latest Annual Volume"
                  value={annualSummary.latestPassengers.toLocaleString()}
                  subtitle={`Year ${annualSummary.latestYear}${annualSummary.latestIsPartial ? ' (Partial Year)' : ''}`}
                  trend={annualSummary.growthPercent}
                  icon={<Calendar size={18} />}
                />
                <SummaryCard
                  title="Peak Passenger Year"
                  value={annualSummary.highestPassengers.toLocaleString()}
                  subtitle={`Recorded in Year ${annualSummary.highestYear}`}
                  icon={<TrendingUp size={18} />}
                />
                <SummaryCard
                  title="Latest Annual Departures"
                  value={annualSummary.latestDepartures ? annualSummary.latestDepartures.toLocaleString() : 'N/A'}
                  subtitle={`Recorded flights (${annualSummary.latestYear})`}
                  icon={<Plane size={18} />}
                />
                <SummaryCard
                  title="Latest Annual Arrivals"
                  value={annualSummary.latestArrivals ? annualSummary.latestArrivals.toLocaleString() : 'N/A'}
                  subtitle={`Recorded flights (${annualSummary.latestYear})`}
                  icon={<Plane size={18} style={{ transform: 'rotate(90deg)' }} />}
                />
              </div>
            )}
          </section>

          {/* =========================================================================
              SECTION 7 & 8: Live departures-vs-arrivals and Delay breakdown charts
              ========================================================================= */}
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
              {/* Section 7: Live Departures vs Arrivals */}
              <div>
                <div style={{ marginBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plane size={16} color="#60a5fa" /> Live Departures vs Arrivals Split
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                    Distribution of unique scheduled departures vs arrivals in retrieved schedule.
                  </p>
                </div>
                {liveError || !processedLive ? (
                  <div className="chart-empty">{liveError || 'Live flight operations currently unavailable.'}</div>
                ) : (
                  <DeparturesVsArrivalsChart
                    departures={processedLive.uniqueDepartures}
                    arrivals={processedLive.uniqueArrivals}
                    height={280}
                  />
                )}
              </div>

              {/* Section 8: Delay Breakdown */}
              <div>
                <div style={{ marginBottom: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color="#fb923c" /> Live Delay Breakdown
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                    Flight delay status breakdown across scheduled flights with reported delay metrics.
                  </p>
                </div>
                {liveError || !processedLive ? (
                  <div className="chart-empty">{liveError || 'Live delay breakdown currently unavailable.'}</div>
                ) : (
                  <DelayBreakdownChart
                    delayedDepartures={processedLive.delayedDepartures}
                    delayedArrivals={processedLive.delayedArrivals}
                    onTime={processedLive.onTimeTotal}
                    unknown={processedLive.unknownTotal}
                    height={280}
                  />
                )}
              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION 9: Upcoming departures table
              ========================================================================= */}
          <section>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plane size={18} color="#4ade80" /> Top 10 Upcoming Departures
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Chronologically ordered upcoming departures. Codeshares deduplicated. Click any flight to track.
              </p>
            </div>

            {liveError || !processedLive ? (
              <div className="chart-empty">{liveError || 'Live flight departures unavailable.'}</div>
            ) : (
              <UpcomingFlightsTable
                flights={processedLive.upcomingDepartures}
                direction="dep"
                onSelectFlight={handleTrackFlight}
              />
            )}
          </section>

          {/* =========================================================================
              SECTION 10: Upcoming arrivals table
              ========================================================================= */}
          <section>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plane size={18} color="#60a5fa" style={{ transform: 'rotate(90deg)' }} /> Top 10 Upcoming Arrivals
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Chronologically ordered upcoming arrivals. Codeshares deduplicated. Click any flight to track.
              </p>
            </div>

            {liveError || !processedLive ? (
              <div className="chart-empty">{liveError || 'Live flight arrivals unavailable.'}</div>
            ) : (
              <UpcomingFlightsTable
                flights={processedLive.upcomingArrivals}
                direction="arr"
                onSelectFlight={handleTrackFlight}
              />
            )}
          </section>

          {/* =========================================================================
              SECTION 11: Historical monthly insight
              ========================================================================= */}
          <section>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={18} color="#4ade80" /> Historical Monthly Benchmark Insight
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Baseline comparison against same-month historical traffic and flight activity.
              </p>
            </div>

            {historyError ? (
              <div className="chart-empty">{historyError}</div>
            ) : monthlyInsight ? (
              <div
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Calendar size={18} color="#4ade80" />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                      {monthlyInsight.monthName} Benchmark ({monthlyInsight.currentYear}
                      {monthlyInsight.previousYear ? ` vs ${monthlyInsight.previousYear}` : ''})
                    </span>
                  </div>
                  {monthlyInsight.isLatestAvailableBaseline && (
                    <span
                      style={{
                        background: '#27272a',
                        border: '1px solid #3f3f46',
                        color: 'var(--text-muted)',
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: 999,
                      }}
                    >
                      Latest recorded month baseline
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {/* Passenger Traffic */}
                  <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 10, padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>
                      Monthly Passengers
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                      {monthlyInsight.currentPassengers != null ? monthlyInsight.currentPassengers.toLocaleString() : 'N/A'}
                    </div>
                    {monthlyInsight.passengerChange != null && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: monthlyInsight.passengerChange >= 0 ? '#4ade80' : '#ef4444',
                        }}
                      >
                        {monthlyInsight.passengerChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {monthlyInsight.passengerChange >= 0 ? '+' : ''}{monthlyInsight.passengerChange.toFixed(1)}% vs {monthlyInsight.previousYear}
                      </div>
                    )}
                  </div>

                  {/* Departures */}
                  <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 10, padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>
                      Monthly Departures
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#60a5fa' }}>
                      {monthlyInsight.currentDepartures != null ? monthlyInsight.currentDepartures.toLocaleString() : 'N/A'}
                    </div>
                    {monthlyInsight.departureChange != null && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: monthlyInsight.departureChange >= 0 ? '#4ade80' : '#ef4444',
                        }}
                      >
                        {monthlyInsight.departureChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {monthlyInsight.departureChange >= 0 ? '+' : ''}{monthlyInsight.departureChange.toFixed(1)}% vs {monthlyInsight.previousYear}
                      </div>
                    )}
                  </div>

                  {/* Arrivals */}
                  <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 10, padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>
                      Monthly Arrivals
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#facc15' }}>
                      {monthlyInsight.currentArrivals != null ? monthlyInsight.currentArrivals.toLocaleString() : 'N/A'}
                    </div>
                    {monthlyInsight.arrivalChange != null && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: monthlyInsight.arrivalChange >= 0 ? '#4ade80' : '#ef4444',
                        }}
                      >
                        {monthlyInsight.arrivalChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {monthlyInsight.arrivalChange >= 0 ? '+' : ''}{monthlyInsight.arrivalChange.toFixed(1)}% vs {monthlyInsight.previousYear}
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ color: '#71717a', fontSize: '0.8rem', margin: '1rem 0 0 0', lineHeight: 1.5 }}>
                  Benchmark comparison for {monthlyInsight.monthName} ({monthlyInsight.currentYear} vs {monthlyInsight.previousYear})
                  from authoritative monthly civil aviation traffic records for {selectedAirportCode}.
                </p>
              </div>
            ) : (
              <div className="chart-empty">No monthly historical insight records available for {selectedAirportCode}.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default CongestionPrediction;
