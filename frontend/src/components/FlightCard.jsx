import React from 'react';
import { StatusChip } from './ui';

const FlightCard = ({ flight, onSelect }) => (
  <button
    onClick={onSelect}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      width: '100%',
      textAlign: 'left',
      background: 'none',
      border: 0,
      borderBottom: '1px solid var(--line)',
      padding: '13px 4px',
      cursor: 'pointer',
      color: 'inherit',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
      <span className="mono" style={{ fontWeight: 500, color: 'var(--text)' }}>
        {flight.flight_number}
      </span>
      <span className="mono note">
        {flight.origin || '—'} → {flight.destination || '—'}
      </span>
    </span>
    <StatusChip status={flight.status} />
  </button>
);

export default FlightCard;
