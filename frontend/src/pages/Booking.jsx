import React, { useState, useMemo, useRef } from 'react';
import { Search, ArrowUpDown, Plane, Clock, MapPin, Calendar, Filter, Ticket, ExternalLink, Users } from 'lucide-react';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
});

const fmtDuration = (mins) => {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const AirportInput = ({ value, onChange, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  const onType = (v) => {
    onChange(v);
    setOpen(true);
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/booking/airports/?q=${encodeURIComponent(v.trim())}&limit=6`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore autocomplete errors */
      }
    }, 300);
  };

  return (
    <div style={{ position: 'relative', flex: '1 1 140px' }}>
      <input
        value={value}
        onChange={(e) => onType(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', color: '#fff', textTransform: 'uppercase' }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#18181b', border: '1px solid var(--border-color)', borderRadius: 8, marginTop: 4, zIndex: 20, overflow: 'hidden' }}>
          {suggestions.map((a) => (
            <button
              key={a.code}
              type="button"
              onMouseDown={() => { onChange(a.code); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#e4e4e7', padding: '0.5rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <strong>{a.code}</strong> <span style={{ color: '#a1a1aa' }}>{a.name} — {a.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Booking = () => {
  const [trip, setTrip] = useState('one-way');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState('economy');
  const [market, setMarket] = useState('IN');
  const [nonstop, setNonstop] = useState(false);

  const [itineraries, setItineraries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [sortBy, setSortBy] = useState('price');
  const [filterAirline, setFilterAirline] = useState('all');

  const [selected, setSelected] = useState(null);
  const [links, setLinks] = useState(null);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLinks(null);
    setLinksError('');
    setSelected(null);
    if (!origin.trim() || !destination.trim() || !departureDate) {
      setError('Enter origin, destination and departure date.');
      return;
    }
    if (trip === 'round-trip' && !returnDate) {
      setError('Enter a return date for round-trip.');
      return;
    }
    setLoading(true);
    setItineraries([]);
    try {
      const payload = {
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        departure_date: departureDate,
        adults: Number(adults) || 1,
        cabin_class: cabin,
        market,
      };
      if (nonstop) payload.max_stops = 0;
      let url = '/api/booking/search/one-way/';
      if (trip === 'round-trip') {
        url = '/api/booking/search/round-trip/';
        payload.return_date = returnDate;
      }
      const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No results.');
        return;
      }
      setItineraries(data.itineraries || []);
      setMeta({ origin: data.origin, destination: data.destination, departure_date: data.departure_date, return_date: data.return_date, last_updated: data.last_updated });
      if ((data.itineraries || []).length === 0) setError('No results.');
    } catch {
      setError('No results.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (itin) => {
    setSelected(itin);
    setLinks(null);
    setLinksError('');
    if (!itin.ignav_id) {
      setLinksError('No booking reference for this itinerary.');
      return;
    }
    setLinksLoading(true);
    try {
      const res = await fetch('/api/booking/links/', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ignav_id: itin.ignav_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinksError(data.error || 'No results.');
        return;
      }
      setLinks(data);
      if ((data.booking_options || []).length === 0) setLinksError('No results.');
    } catch {
      setLinksError('No results.');
    } finally {
      setLinksLoading(false);
    }
  };

  const airlines = useMemo(() => {
    const set = new Set();
    itineraries.forEach((it) => {
      const name = it.outbound?.carrier || it.inbound?.carrier;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [itineraries]);

  const visible = useMemo(() => {
    let out = [...itineraries];
    if (filterAirline !== 'all') {
      out = out.filter((it) => (it.outbound?.carrier || it.inbound?.carrier) === filterAirline);
    }
    out.sort((a, b) => {
      if (sortBy === 'duration') return (a.outbound?.duration_minutes || 0) - (b.outbound?.duration_minutes || 0);
      return (a.price?.amount || 0) - (b.price?.amount || 0);
    });
    return out;
  }, [itineraries, sortBy, filterAirline]);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', padding: 10, borderRadius: 10, display: 'inline-flex' }}>
          <Ticket size={20} color="#4ade80" />
        </span>
        <h1 style={{ margin: 0 }}>Booking</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
        Search live fares and continue to the airline or agency to complete your purchase.
      </p>

      <form onSubmit={handleSearch} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.9rem', borderRadius: 12, marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['one-way', 'round-trip'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrip(t)}
              style={{
                background: trip === t ? '#4ade80' : '#18181b',
                color: trip === t ? '#000' : '#e4e4e7',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t === 'one-way' ? 'One-way' : 'Round-trip'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flex: '2 1 300px', alignItems: 'center', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.45rem 0.6rem' }}>
            <MapPin size={16} color="#a1a1aa" />
            <AirportInput value={origin} onChange={setOrigin} placeholder="FROM (e.g. JFK)" />
            <button type="button" onClick={swap} title="Swap" style={{ background: '#27272a', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>⇄</button>
            <AirportInput value={destination} onChange={setDestination} placeholder="TO (e.g. LHR)" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.45rem 0.6rem' }}>
            <Calendar size={16} color="#a1a1aa" />
            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff' }} />
          </div>
          {trip === 'round-trip' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.45rem 0.6rem' }}>
              <Calendar size={16} color="#a1a1aa" />
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: '0.85rem' }}><Users size={14} /></span>
          <select value={adults} onChange={(e) => setAdults(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>)}
          </select>
          <select value={cabin} onChange={(e) => setCabin(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
          <select value={market} onChange={(e) => setMarket(e.target.value)} title="Price currency" style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="IN">₹ INR</option>
            <option value="US">$ USD</option>
            <option value="GB">£ GBP</option>
            <option value="AE">د.إ AED</option>
            <option value="SG">$ SGD</option>
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#d4d4d8', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} /> Nonstop only
          </label>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: '0.85rem' }}><ArrowUpDown size={14} /> Sort:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="price">Lowest price</option>
            <option value="duration">Shortest trip</option>
          </select>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: '0.85rem' }}><Filter size={14} /> Airline:</span>
          <select value={filterAirline} onChange={(e) => setFilterAirline(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.55rem 0.7rem', borderRadius: 8 }}>
            <option value="all">All airlines</option>
            {airlines.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="submit" disabled={loading} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.6rem 1.4rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Search size={16} /> {loading ? 'Searching...' : 'Search flights'}
          </button>
        </div>
      </form>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>}

      {visible.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.9rem' }}>
          {visible.map((it, i) => {
            const segs = it.outbound?.segments || [];
            const first = segs[0];
            const last = segs[segs.length - 1];
            const isSel = selected?.ignav_id === it.ignav_id;
            return (
              <div key={it.ignav_id || i} style={{ background: 'var(--bg-panel)', border: isSel ? '1px solid #4ade80' : '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.4rem', color: '#4ade80' }}>
                    {it.price?.amount != null ? `${it.price.amount} ${it.price.currency || ''}` : '—'}
                  </strong>
                  <span style={{ fontSize: '0.72rem', background: '#27272a', color: '#a1a1aa', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: 999 }}>
                    {segs.length <= 1 ? 'Nonstop' : `${segs.length - 1} stop${segs.length > 2 ? 's' : ''}`}
                  </span>
                </div>
                <div style={{ color: '#e4e4e7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plane size={14} color="#4ade80" /> {it.outbound?.carrier || '—'}
                </div>
                <div style={{ color: '#a1a1aa', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} /> {first?.departure_airport || meta?.origin || '—'} → {last?.arrival_airport || meta?.destination || '—'}
                </div>
                <div style={{ color: '#d4d4d8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> {fmtTime(first?.departure_time_local)} · {fmtDuration(it.outbound?.duration_minutes)}
                </div>
                <div style={{ color: '#71717a', fontSize: '0.78rem' }}>
                  {segs.map((s) => `${s.marketing_carrier_code || ''} ${s.flight_number || ''}`).join(' · ')}
                  {it.inbound ? ` · Return: ${(it.inbound.segments || []).map((s) => `${s.marketing_carrier_code || ''} ${s.flight_number || ''}`).join(' · ')}` : ''}
                </div>
                <button onClick={() => handleSelect(it)} style={{ marginTop: '0.25rem', background: isSel ? '#18181b' : '#4ade80', color: isSel ? '#4ade80' : '#000', border: '1px solid #4ade80', padding: '0.6rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                  {isSel ? 'Selected — view options below' : 'Select flight'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: '1.25rem', background: 'var(--bg-panel)', border: '1px solid #4ade80', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0' }}>Booking options</h3>
          {linksLoading && <p style={{ color: '#a1a1aa' }}>Loading options...</p>}
          {linksError && <p style={{ color: '#fecaca' }}>{linksError}</p>}
          {links && (links.booking_options || []).map((opt, oi) => (
            <div key={oi} style={{ marginBottom: '0.75rem' }}>
              {(opt.links || []).map((l, li) => (
                <a
                  key={li}
                  href={l.url?.startsWith('http') ? l.url : `https://${l.url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.5rem', textDecoration: 'none', color: '#fff' }}
                >
                  <span>
                    <strong>{l.provider_name}</strong>
                    <span style={{ color: '#a1a1aa', fontSize: '0.8rem', marginLeft: 8 }}>
                      {l.provider_type === 'airline' ? 'Airline' : 'Travel agency'}{l.fare_name ? ` · ${l.fare_name}` : ''}
                    </span>
                    <br />
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>
                      {l.price?.amount != null ? `${l.price.amount} ${l.price.currency || ''}` : (links.itinerary?.price ? `${links.itinerary.price.amount} ${links.itinerary.price.currency || ''}` : '')}
                    </span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#4ade80', color: '#000', fontWeight: 700, padding: '0.5rem 0.9rem', borderRadius: 8, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    Continue <ExternalLink size={14} />
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Booking;
