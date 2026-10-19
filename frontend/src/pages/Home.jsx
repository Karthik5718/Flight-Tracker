import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { parseTimeToMs } from '../utils/dataProcessing';

const BOARD_AIRPORT = 'DEL';

const SECTIONS = [
  { to: '/tracking', title: 'Live tracking', text: 'Position, altitude, speed and heading for a flight in the air.' },
  { to: '/airport', title: 'Airports', text: 'Departure and arrival boards, weather and traffic history.' },
  { to: '/predictions/delay', title: 'Arrival delay', text: 'Expected arrival delay for a flight, from its schedule and departure.' },
  { to: '/predictions/congestion', title: 'Airport load', text: 'How busy an airport is, and how that is trending.' },
  { to: '/booking', title: 'Booking', text: 'Search fares by route and date.' },
];

const formatClock = (value) => {
  if (!value) return '—';
  const text = String(value).trim().replace(' ', 'T');
  const date = new Date(`${text}Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const Home = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('flight');
  const [departures, setDepartures] = useState([]);
  const [boardError, setBoardError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch(`/api/airports/${BOARD_AIRPORT}/flights/?source=airlabs`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return;
          if (!data) {
            setBoardError(true);
            return;
          }
          const now = Date.now();
          const rows = (data.departures || [])
            .filter((f) => (f.origin || '').toUpperCase() === BOARD_AIRPORT)
            .map((f) => ({ ...f, ms: parseTimeToMs(f.scheduled_departure) }))
            .filter((f) => f.ms && f.ms >= now)
            .sort((a, b) => a.ms - b.ms)
            .slice(0, 8);
          setDepartures(rows);
        })
        .catch(() => {
          if (!cancelled) setBoardError(true);
        });
    };

    load();
    const timer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/tracking?q=${encodeURIComponent(query.trim())}&type=${type}`);
  };

  return (
    <div className="shell page">
      <div className="page-head">
        <div>
          <h1>Flight operations</h1>
          <p className="lede">Live positions, airport activity and arrival forecasts.</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel" style={{ padding: 26 }}>
          <h2 style={{ marginBottom: 6 }}>Look up a flight</h2>
          <p className="note" style={{ marginBottom: 18 }}>
            Enter a flight number, or an airport code to see its board.
          </p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: 168 }}
              aria-label="Search type"
            >
              <option value="flight">Flight number</option>
              <option value="airport">Airport code</option>
            </select>
            <input
              className="input input--code"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder={type === 'flight' ? '6E754' : 'DEL'}
              style={{ flex: '1 1 180px' }}
              aria-label="Flight number or airport code"
            />
            <button className="btn btn--primary" type="submit">
              <Search size={15} /> Search
            </button>
          </form>

          <hr className="rule" style={{ margin: '26px 0 20px' }} />

          <h2 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Elsewhere</h2>
          <div className="stack" style={{ gap: 12 }}>
            {SECTIONS.map((section) => (
              <Link
                key={section.to}
                to={section.to}
                style={{
                  display: 'block',
                  color: 'var(--text)',
                  padding: '10px 12px',
                  marginLeft: -12,
                  borderRadius: 'var(--r-control)',
                }}
              >
                <div style={{ fontWeight: 500 }}>{section.title}</div>
                <div className="note">{section.text}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel panel--flush">
          <div className="panel__head">
            <span className="panel__title">Next departures · {BOARD_AIRPORT}</span>
            <Link to="/airport" className="note">
              All airports
            </Link>
          </div>
          {boardError ? (
            <div className="empty">The board could not be loaded.</div>
          ) : departures.length === 0 ? (
            <div className="empty">No further departures scheduled.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>To</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departures.map((f) => (
                  <tr
                    key={f.flight_number}
                    className="is-clickable"
                    onClick={() => navigate(`/tracking/${encodeURIComponent(f.flight_number)}`)}
                  >
                    <td className="is-strong mono">{f.flight_number}</td>
                    <td className="mono">{f.destination}</td>
                    <td className="mono">{formatClock(f.scheduled_departure)}</td>
                    <td>
                      <span className="chip">{f.status || 'Scheduled'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
