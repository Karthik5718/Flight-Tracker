import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeftRight, ExternalLink } from 'lucide-react';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
});

const fmtDuration = (mins) => {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const AirportInput = ({ value, onChange, placeholder, id }) => {
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
        /* autocomplete is best effort */
      }
    }, 300);
  };

  return (
    <div style={{ position: 'relative', flex: '1 1 140px' }}>
      <input
        id={id}
        className="input input--code"
        value={value}
        onChange={(e) => onType(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-control)',
            marginTop: 4,
            zIndex: 30,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((a) => (
            <button
              key={a.code}
              type="button"
              onMouseDown={() => {
                onChange(a.code);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 0,
                color: 'var(--text)',
                padding: '9px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <span className="mono" style={{ marginRight: 8 }}>{a.code}</span>
              <span className="note">
                {a.name} — {a.city}
              </span>
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
      setError('Enter a return date for a round trip.');
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
      setMeta({
        origin: data.origin,
        destination: data.destination,
        departure_date: data.departure_date,
        return_date: data.return_date,
        last_updated: data.last_updated,
      });
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
    <div className="shell page">
      <div className="page-head">
        <div>
          <h1>Booking</h1>
          <p className="lede">Compare fares and continue to the airline or travel agency to complete the purchase.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 3, background: 'var(--bg)', borderRadius: 'var(--r-control)', border: '1px solid var(--line)' }}>
          {[
            { id: 'one-way', label: 'One-way' },
            { id: 'round-trip', label: 'Round trip' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTrip(option.id)}
              className="btn"
              style={{
                background: trip === option.id ? 'var(--surface-3)' : 'transparent',
                color: trip === option.id ? 'var(--text)' : 'var(--text-3)',
                padding: '6px 14px',
                fontSize: '0.85rem',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flex: '2 1 340px' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="trip-from">From</label>
              <AirportInput id="trip-from" value={origin} onChange={setOrigin} placeholder="DEL" />
            </div>
            <button
              type="button"
              onClick={swap}
              title="Swap"
              aria-label="Swap origin and destination"
              className="btn btn--quiet"
              style={{ padding: '10px 12px' }}
            >
              <ArrowLeftRight size={15} />
            </button>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="trip-to">To</label>
              <AirportInput id="trip-to" value={destination} onChange={setDestination} placeholder="BOM" />
            </div>
          </div>

          <div className="field" style={{ flex: '1 1 170px' }}>
            <label htmlFor="trip-depart">Departure</label>
            <input id="trip-depart" className="input" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
          </div>

          {trip === 'round-trip' && (
            <div className="field" style={{ flex: '1 1 170px' }}>
              <label htmlFor="trip-return">Return</label>
              <input id="trip-return" className="input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '0 1 120px' }}>
            <label htmlFor="trip-adults">Travellers</label>
            <select id="trip-adults" className="select" value={adults} onChange={(e) => setAdults(e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} adult{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '0 1 160px' }}>
            <label htmlFor="trip-cabin">Cabin</label>
            <select id="trip-cabin" className="select" value={cabin} onChange={(e) => setCabin(e.target.value)}>
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
          <div className="field" style={{ flex: '0 1 120px' }}>
            <label htmlFor="trip-market">Currency</label>
            <select id="trip-market" className="select" value={market} onChange={(e) => setMarket(e.target.value)}>
              <option value="IN">₹ INR</option>
              <option value="US">$ USD</option>
              <option value="GB">£ GBP</option>
              <option value="AE">AED</option>
              <option value="SG">SGD</option>
            </select>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: '0.88rem', cursor: 'pointer', paddingBottom: 10 }}>
            <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} />
            Nonstop only
          </label>
          <button type="submit" className="btn btn--primary" disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? 'Searching…' : 'Search flights'}
          </button>
        </div>
      </form>

      {error && <div className="alert alert--error">{error}</div>}

      {visible.length > 0 && (
        <>
          <div className="row-gap row-gap--between" style={{ marginBottom: 16 }}>
            <span className="note">
              {visible.length} itinerar{visible.length === 1 ? 'y' : 'ies'}
            </span>
            <div className="row-gap">
              {airlines.length > 1 && (
                <select
                  className="select"
                  value={filterAirline}
                  onChange={(e) => setFilterAirline(e.target.value)}
                  style={{ width: 170, padding: '7px 30px 7px 10px' }}
                  aria-label="Filter by airline"
                >
                  <option value="all">All airlines</option>
                  {airlines.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: 170, padding: '7px 30px 7px 10px' }}
                aria-label="Sort results"
              >
                <option value="price">Lowest price</option>
                <option value="duration">Shortest trip</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {visible.map((it, i) => {
            const segs = it.outbound?.segments || [];
            const first = segs[0];
            const last = segs[segs.length - 1];
            const isSel = selected?.ignav_id === it.ignav_id;
            return (
              <article
                key={it.ignav_id || i}
                className="panel"
                style={isSel ? { boxShadow: 'inset 0 0 0 1px var(--accent)' } : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <strong className="mono" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                    {it.price?.amount != null ? `${it.price.amount} ${it.price.currency || ''}` : '—'}
                  </strong>
                  <span className="chip">
                    {segs.length <= 1 ? 'Nonstop' : `${segs.length - 1} stop${segs.length > 2 ? 's' : ''}`}
                  </span>
                </div>

                <div style={{ marginTop: 12, fontWeight: 500 }}>{it.outbound?.carrier || '—'}</div>
                <div className="note" style={{ marginTop: 4 }}>
                  {first?.departure_airport || meta?.origin || '—'} → {last?.arrival_airport || meta?.destination || '—'}
                </div>
                <div className="note" style={{ marginTop: 2 }}>
                  {fmtTime(first?.departure_time_local)} · {fmtDuration(it.outbound?.duration_minutes)}
                </div>
                <div className="note" style={{ marginTop: 2, fontSize: '0.78rem' }}>
                  {segs.map((s) => `${s.marketing_carrier_code || ''} ${s.flight_number || ''}`).join(' · ')}
                  {it.inbound
                    ? ` · Return: ${(it.inbound.segments || [])
                        .map((s) => `${s.marketing_carrier_code || ''} ${s.flight_number || ''}`)
                        .join(' · ')}`
                    : ''}
                </div>

                <button
                  onClick={() => handleSelect(it)}
                  className={isSel ? 'btn btn--quiet btn--block' : 'btn btn--primary btn--block'}
                  style={{ marginTop: 16 }}
                >
                  {isSel ? 'Selected' : 'Select flight'}
                </button>
              </article>
            );
          })}
          </div>
        </>
      )}

      {selected && (
        <section className="panel" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Where to book</h2>
          {linksLoading && <p className="note">Loading options…</p>}
          {linksError && <div className="alert alert--error">{linksError}</div>}
          {links &&
            (links.booking_options || []).map((opt, oi) =>
              (opt.links || []).map((l, li) => (
                <a
                  key={`${oi}-${li}`}
                  href={l.url?.startsWith('http') ? l.url : `https://${l.url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    background: 'var(--bg)',
                    borderRadius: 'var(--r-control)',
                    padding: '14px 16px',
                    marginBottom: 8,
                    textDecoration: 'none',
                    color: 'var(--text)',
                  }}
                >
                  <span>
                    <strong>{l.provider_name}</strong>
                    <span className="note" style={{ marginLeft: 10 }}>
                      {l.provider_type === 'airline' ? 'Airline' : 'Travel agency'}
                      {l.fare_name ? ` · ${l.fare_name}` : ''}
                    </span>
                    <div className="mono" style={{ marginTop: 4, color: 'var(--accent)' }}>
                      {l.price?.amount != null
                        ? `${l.price.amount} ${l.price.currency || ''}`
                        : links.itinerary?.price
                        ? `${links.itinerary.price.amount} ${links.itinerary.price.currency || ''}`
                        : ''}
                    </div>
                  </span>
                  <span className="btn btn--primary" style={{ pointerEvents: 'none' }}>
                    Continue <ExternalLink size={14} />
                  </span>
                </a>
              ))
            )}
        </section>
      )}
    </div>
  );
};

export default Booking;
