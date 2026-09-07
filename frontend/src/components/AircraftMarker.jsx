import React from 'react';
import { Plane } from 'lucide-react';

const AircraftMarker = ({ heading }) => {
  return (
    <div style={{ 
      transform: `rotate(${heading}deg)`,
      transition: 'transform 0.3s ease-out'
    }}>
      <Plane size={24} color="#4ade80" fill="#4ade80" />
    </div>
  );
};

export default AircraftMarker;
