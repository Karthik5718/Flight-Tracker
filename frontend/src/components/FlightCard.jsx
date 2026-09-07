import React from 'react';
import { ChevronRight } from 'lucide-react';

const FlightCard = ({ flight, onSelect }) => {
  const statusColor = flight.status === 'active' ? '#4ade80' : 
                      flight.status === 'delayed' ? '#facc15' : 
                      flight.status === 'cancelled' ? '#ef4444' : '#888';

  return (
    <div 
      onClick={onSelect}
      style={{ 
        background: '#222', 
        padding: '1rem', 
        borderRadius: '8px', 
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #333'
      }}
    >
      <div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>{flight.flight_number}</h4>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#aaa' }}>
          <span>{flight.origin || 'N/A'} → {flight.destination || 'N/A'}</span>
          <span style={{ color: statusColor }}>{flight.status || 'Unknown'}</span>
        </div>
      </div>
      <ChevronRight color="#555" />
    </div>
  );
};

export default FlightCard;
