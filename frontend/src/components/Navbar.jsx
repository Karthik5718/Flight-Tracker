import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Plane, LogOut, Home as HomeIcon, Ticket, Building2, Shield, BrainCircuit, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [predOpen, setPredOpen] = useState(false);

  if (!user) return null;

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 2rem', 
      backgroundColor: 'var(--bg-panel)', 
      borderBottom: '1px solid var(--border-color)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>
          <Plane color="var(--accent-green)" />
          Aviation Platform
        </Link>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
            <HomeIcon size={18} /> Home
          </Link>
          <Link to="/tracking" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
            <Plane size={18} /> Tracking
          </Link>
          <Link to="/airport" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
            <Building2 size={18} /> Airport
          </Link>
          <Link to="/booking" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
            <Ticket size={18} /> Booking
          </Link>
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setPredOpen(true)}
            onMouseLeave={() => setPredOpen(false)}
          >
            <button
              onClick={() => setPredOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
            >
              <BrainCircuit size={18} /> Predictions <ChevronDown size={14} />
            </button>
            {predOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, paddingTop: '0.5rem', zIndex: 50 }}>
                <div style={{ display: 'flex', flexDirection: 'column', background: '#18181b', border: '1px solid var(--border-color)', borderRadius: 8, minWidth: 220, overflow: 'hidden' }}>
                  <Link to="/predictions/delay" onClick={() => setPredOpen(false)} style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>
                    Flight Delay Prediction
                  </Link>
                  <Link to="/predictions/congestion" onClick={() => setPredOpen(false)} style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                    Airport Congestion
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link to="/atc" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#facc15' }}>
            <Shield size={18} /> ATC
          </Link>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.username}</span>
        <button 
          onClick={logout}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
