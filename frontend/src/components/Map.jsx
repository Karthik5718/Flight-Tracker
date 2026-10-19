import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { Plane } from 'lucide-react';

const Map = ({ position, route, selectedFlight }) => {
  const [map, setMap] = useState(null);

  const origin = route?.origin;
  const destination = route?.destination;
  const hasOrigin = Array.isArray(origin) && origin.length === 2;
  const hasDest = Array.isArray(destination) && destination.length === 2;
  const hasPosition = position && position.lat != null && position.lon != null;
  const aircraftCoord = hasPosition ? [position.lat, position.lon] : null;

  // Fit bounds to all available points
  useEffect(() => {
    if (!map) return;
    const pts = [];
    if (hasOrigin) pts.push(origin);
    if (hasDest) pts.push(destination);
    if (aircraftCoord) pts.push(aircraftCoord);
    if (pts.length >= 2) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pts.length === 1) {
      map.flyTo(pts[0], 6, { animate: true, duration: 1.5 });
    }
  }, [map, origin, destination, aircraftCoord]);

  const createPlaneIcon = (heading) => {
    const iconHtml = renderToString(
      <div style={{
        transform: `rotate(${heading || 0}deg)`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Plane size={22} color="#4da3ff" fill="#4da3ff" />
      </div>
    );
    return L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  };

  const airportIcon = (color) => L.divIcon({
    html: `<div style="width:10px;height:10px;background:${color};border:2px solid #0a0e14;border-radius:50%"></div>`,
    className: 'airport-dot',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  const travelled = hasOrigin && aircraftCoord ? [origin, aircraftCoord] : null;
  const remaining = aircraftCoord && hasDest ? [aircraftCoord, destination] : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
        ref={setMap}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {travelled && (
          <Polyline positions={travelled} pathOptions={{ color: '#4da3ff', weight: 3, opacity: 0.85 }} />
        )}
        {remaining && (
          <Polyline positions={remaining} pathOptions={{ color: '#e0a02c', weight: 3, dashArray: '8 6', opacity: 0.85 }} />
        )}
        {hasOrigin && (
          <Marker position={origin} icon={airportIcon('#46c46a')} />
        )}
        {hasDest && (
          <Marker position={destination} icon={airportIcon('#f4685f')} />
        )}
        {aircraftCoord && (
          <Marker position={aircraftCoord} icon={createPlaneIcon(position.heading)} />
        )}
      </MapContainer>

      {!hasOrigin && !hasDest && !aircraftCoord && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-2)',
          background: 'rgba(10, 14, 20, 0.82)',
          padding: '14px 18px',
          borderRadius: 'var(--r-control)',
          zIndex: 1000,
          textAlign: 'center',
          fontSize: '0.9rem',
        }}>
          No aircraft selected
        </div>
      )}
    </div>
  );
};

export default Map;