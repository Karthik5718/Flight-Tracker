import React, { useState, useEffect } from 'react';

const FlightDetailsPanel = ({ flight, position }) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (position && position.lat && position.lon) {
      fetch(`/api/weather/?lat=${position.lat}&lon=${position.lon}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setWeather(data));
    }
  }, [position]);

  const Item = ({ label, value }) => (
    <div style={{ marginBottom: '1rem', flex: '1 1 45%' }}>
      <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', color: '#fff' }}>{value || 'Not available'}</div>
    </div>
  );

  return (
    <div style={{ background: '#222', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '1rem' }}>
        {flight.flight_number}
      </h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <Item label="Airline" value={flight.airline} />
        <Item label="Aircraft" value={flight.aircraft} />
        <Item label="Origin" value={flight.origin} />
        <Item label="Destination" value={flight.destination} />
        <Item label="Status" value={flight.status} />
        <Item label="Gate" value={flight.gate} />
        <Item label="Terminal" value={flight.terminal} />
      </div>

      <div style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
        <h4 style={{ color: '#aaa', margin: '0 0 1rem 0' }}>Live Telemetry</h4>
        {!position ? (
          <p style={{ color: '#888' }}>Position unavailable</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Item label="Altitude" value={position.altitude ? `${position.altitude} ft` : null} />
            <Item label="Speed" value={position.speed ? `${position.speed} kts` : null} />
            <Item label="Heading" value={position.heading ? `${position.heading}°` : null} />
            <Item label="Lat/Lon" value={`${position.lat}, ${position.lon}`} />
          </div>
        )}
      </div>

      {weather && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
          <h4 style={{ color: '#aaa', margin: '0 0 1rem 0' }}>Weather at current position</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Item label="Temperature" value={weather.temperature ? `${weather.temperature}°C` : null} />
            <Item label="Wind" value={weather.wind_speed ? `${weather.wind_speed} km/h` : null} />
          </div>
        </div>
      )}
      
      {(flight.last_updated || (position && position.last_updated)) && (
        <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#666', textAlign: 'right' }}>
          Last updated: {new Date(position?.last_updated || flight.last_updated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default FlightDetailsPanel;
