import React, { useState, useEffect } from 'react';

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 120 }}>
    <span className="stat__label">{label}</span>
    <span className="mono" style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
      {value || '—'}
    </span>
  </div>
);

const FlightDetailsPanel = ({ flight, position }) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (position && position.lat && position.lon) {
      fetch(`/api/weather/?lat=${position.lat}&lon=${position.lon}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setWeather(data))
        .catch(() => setWeather(null));
    }
  }, [position]);

  return (
    <section className="panel">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <h2 className="mono" style={{ fontSize: '1.35rem' }}>
          {flight.flight_number}
        </h2>
        {flight.status && <span className="chip">{flight.status}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '18px 24px' }}>
        <Row label="Airline" value={flight.airline} />
        <Row label="Aircraft" value={flight.aircraft} />
        <Row label="Origin" value={flight.origin} />
        <Row label="Destination" value={flight.destination} />
        <Row label="Gate" value={flight.gate} />
        <Row label="Terminal" value={flight.terminal} />
      </div>

      {position && (
        <>
          <hr className="rule" style={{ margin: '24px 0 20px' }} />
          <h3 style={{ marginBottom: 16 }}>Position</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '18px 24px' }}>
            <Row label="Altitude" value={position.altitude != null ? `${position.altitude} ft` : null} />
            <Row label="Speed" value={position.speed != null ? `${position.speed} kts` : null} />
            <Row label="Heading" value={position.heading != null ? `${Math.round(position.heading)}°` : null} />
            <Row label="Latitude" value={position.lat != null ? position.lat.toFixed(4) : null} />
            <Row label="Longitude" value={position.lon != null ? position.lon.toFixed(4) : null} />
          </div>
        </>
      )}

      {weather && (
        <>
          <hr className="rule" style={{ margin: '24px 0 20px' }} />
          <h3 style={{ marginBottom: 16 }}>Weather at position</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '18px 24px' }}>
            <Row label="Temperature" value={weather.temperature != null ? `${weather.temperature}°C` : null} />
            <Row label="Wind" value={weather.wind_speed != null ? `${weather.wind_speed} km/h` : null} />
            <Row
              label="Direction"
              value={weather.wind_direction != null ? `${weather.wind_direction}°` : null}
            />
          </div>
        </>
      )}

      {(flight.last_updated || (position && position.last_updated)) && (
        <p className="note" style={{ marginTop: 24, textAlign: 'right' }}>
          Updated {new Date(position?.last_updated || flight.last_updated).toLocaleTimeString()}
        </p>
      )}
    </section>
  );
};

export default FlightDetailsPanel;
