import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Layout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{ borderTop: '1px solid var(--line)', marginTop: 40 }}>
        <div
          className="shell"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', flexWrap: 'wrap', gap: 12 }}
        >
          <span style={{ fontFamily: 'var(--display)', fontSize: '0.82rem', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
            Approach
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
            Positions refresh every 30 seconds while a flight is open.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
