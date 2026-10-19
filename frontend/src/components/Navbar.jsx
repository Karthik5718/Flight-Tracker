import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChevronDown, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (!user) return null;

  const isATC = user.role === 'atc';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'rgba(10, 14, 20, 0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        className="shell"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, gap: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 30, minWidth: 0 }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              color: 'var(--text)',
              fontFamily: 'var(--display)',
              fontWeight: 600,
              fontSize: '0.95rem',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15.5v-2l-8-4.5V4a1.5 1.5 0 0 0-3 0v5L2 13.5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" fill="var(--accent)" />
            </svg>
            Approach
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: '0.9rem' }}>
            <NavLink to="/tracking">Tracking</NavLink>
            <NavLink to="/airport">Airports</NavLink>
            <NavLink to="/booking">Booking</NavLink>
            <div style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
              <button
                onClick={() => setOpen((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                }}
                onFocus={() => setOpen(true)}
              >
                Forecasts <ChevronDown size={14} />
              </button>
              {open && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    paddingTop: 12,
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      background: 'var(--bg-elev)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-control)',
                      minWidth: 210,
                      padding: 6,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                    }}
                  >
                    <NavLink to="/predictions/delay" onClick={() => setOpen(false)}>
                      Arrival delay
                    </NavLink>
                    <NavLink to="/predictions/congestion" onClick={() => setOpen(false)}>
                      Airport load
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
            {isATC && (
              <NavLink to="/atc" style={{ color: 'var(--warn)' }}>
                ATC
              </NavLink>
            )}
          </nav>
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 0,
              padding: '6px 2px',
              cursor: 'pointer',
              color: 'var(--text-2)',
              fontSize: '0.88rem',
            }}
          >
            {user.username}
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 10,
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-control)',
                minWidth: 190,
                padding: 6,
                boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              }}
            >
              <div style={{ padding: '8px 10px', color: 'var(--text-3)', fontSize: '0.78rem' }}>
                {isATC ? 'ATC controller' : 'Account'}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  background: 'none',
                  border: 0,
                  padding: '8px 10px',
                  borderRadius: 6,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const NavLink = ({ to, children, style, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    style={{ color: 'var(--text-2)', ...style }}
    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
    onMouseLeave={(e) => (e.currentTarget.style.color = (style && style.color) || 'var(--text-2)')}
  >
    {children}
  </Link>
);

export default Navbar;
