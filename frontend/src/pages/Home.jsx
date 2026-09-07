import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plane, Ticket, Radar, Building2, Search, Sparkles, Shield, Clock3, CloudSun } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const [quickSearch, setQuickSearch] = useState('');
  const [quickType, setQuickType] = useState('flight');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    navigate(`/tracking?q=${encodeURIComponent(quickSearch.trim())}&type=${quickType}`);
  };

  const Card = ({ icon: Icon, title, desc, to, badge }) => (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'var(--bg-panel)', padding: '1.75rem', borderRadius: '12px',
        border: '1px solid var(--border-color)', height: '100%', position: 'relative',
        transition: 'border-color 0.2s', overflow: 'hidden'
      }}>
        {badge && <span style={{ position: 'absolute', top: 12, right: 12, background: '#27272a', color: '#a1a1aa', fontSize: '0.65rem', padding: '4px 8px', borderRadius: 999, border: '1px solid #3f3f46' }}>{badge}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', padding: 10, borderRadius: 10, display: 'inline-flex' }}>
            <Icon size={20} color="var(--accent-green)" />
          </span>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem', lineHeight: 1.5 }}>{desc}</p>
      </div>
    </Link>
  );

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '2rem 1.25rem' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #18181b 45%, #1a2e1f 100%)',
        border: '1px solid var(--border-color)', borderRadius: 16, padding: '2.25rem', marginBottom: '1.5rem', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 420px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', padding: '6px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <Sparkles size={14} /> Aviation Intelligence Platform
            </div>
            <h1 style={{ fontSize: '2.15rem', lineHeight: 1.15, margin: '1rem 0 0.75rem 0' }}>
              Track live flights.<br /> Explore airports.<br /> Fly smarter.
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0', maxWidth: 560, lineHeight: 1.6 }}>
              Real-time positions via AirLabs, airport data via AeroDataBox, weather via Open-Meteo, maps via OpenStreetMap. No mock data — missing fields show as “Not available”.
            </p>
            {/* Advertise — What we provide */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#18181b', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: 999, fontSize: '0.8rem', color: '#e4e4e7' }}><Clock3 size={14} /> Live telemetry</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#18181b', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: 999, fontSize: '0.8rem', color: '#e4e4e7' }}><CloudSun size={14} /> Weather at position</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#18181b', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: 999, fontSize: '0.8rem', color: '#e4e4e7' }}><Shield size={14} /> ATC-verified access</span>
            </div>
            {/* Quick Search */}
            <form onSubmit={handleQuickSearch} style={{ display: 'flex', gap: '0.5rem', background: '#09090b', border: '1px solid var(--border-color)', padding: '0.45rem', borderRadius: 10, maxWidth: 520 }}>
              <select value={quickType} onChange={(e) => setQuickType(e.target.value)} style={{ background: '#18181b', color: '#fff', border: '1px solid var(--border-color)', padding: '0.6rem 0.75rem', borderRadius: 8, outline: 'none' }}>
                <option value="flight">Flight #</option>
                <option value="airport">Airport (IATA)</option>
              </select>
              <input value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} placeholder={quickType === 'flight' ? 'Try AA100, BA249...' : 'Try JFK, LHR, DEL...'} style={{ flex: 1, background: 'transparent', color: '#fff', border: 'none', outline: 'none', padding: '0.5rem' }} />
              <button type="submit" style={{ background: 'var(--accent-green)', color: '#000', border: 'none', padding: '0.6rem 1rem', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <Search size={16} /> Search
              </button>
            </form>
            <p style={{ color: '#71717a', fontSize: '0.82rem', marginTop: '0.6rem' }}>Flight → AirLabs &nbsp;·&nbsp; Airport → AeroDataBox &nbsp;·&nbsp; Weather → Open-Meteo &nbsp;·&nbsp; Map → OpenStreetMap</p>
          </div>
          <div style={{ flex: '0 1 420px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', minHeight: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Radar size={16} color="#4ade80" /> Live — no mock</strong>
              <span style={{ fontSize: '0.72rem', color: '#a1a1aa', background: '#27272a', border: '1px solid #3f3f46', padding: '4px 8px', borderRadius: 999 }}>60% Map · 40% Details</span>
            </div>
            <div style={{ background: '#09090b', border: '1px dashed #3f3f46', borderRadius: 10, padding: '1.25rem', textAlign: 'center', color: '#a1a1aa' }}>
              <Plane size={32} color="#4ade80" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, color: '#fafafa' }}>Tracking Preview</div>
              <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Map on the left, flight details on the right. Position, heading, altitude, speed + freshness indicator.</div>
              <Link to="/tracking" style={{ display: 'inline-flex', marginTop: 12, background: '#4ade80', color: '#000', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem' }}>Open Tracking →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.75rem' }}>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem', fontSize: '0.82rem', color: '#d4d4d8' }}>✔ Missing = <strong style={{ color: '#fafafa' }}>Not available</strong></div>
              <div style={{ background: '#09090b', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.7rem', fontSize: '0.82rem', color: '#d4d4d8' }}>✔ <strong style={{ color: '#fafafa' }}>Last updated</strong> shown</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature grid — only implemented features, no chatbot / 3D / ML */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        <Card icon={Radar} title="Live Tracking" desc="Search by flight number or airport IATA/ICAO, view results, select a flight, see telemetry and position on OpenStreetMap." to="/tracking" />
        <Card icon={Building2} title="Airport" desc="Map via OpenStreetMap + airport info (AeroDataBox) + weather (Open-Meteo). Departures/arrivals by gate and terminal." to="/airport" />
        <Card icon={Ticket} title="Booking (Simulation)" desc="Search flights with sort/filter, view all results, simulate schedule booking. No real ticketing." to="/booking" badge="Simulation only" />
        <Card icon={Shield} title="ATC Dashboard" desc="ATC-only: live route vs planned path, signals, wind/speed/altitude/heading, anomaly detection, map." to="/atc" badge="ATC verified only" />
      </div>

      {!user && (
        <div style={{ marginTop: '1.25rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#d4d4d8' }}><strong style={{ color: '#fff' }}>New here?</strong> Create an account or ATC account to continue. Auth is server-enforced.</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/register" style={{ background: '#4ade80', color: '#000', padding: '8px 14px', borderRadius: 8, fontWeight: 700 }}>Register</Link>
            <Link to="/login" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fafafa', padding: '8px 14px', borderRadius: 8 }}>Login</Link>
            <Link to="/register-atc" style={{ background: '#18181b', border: '1px solid var(--border-color)', color: '#a1a1aa', padding: '8px 14px', borderRadius: 8, fontSize: '0.88rem' }}>Register as ATC</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
