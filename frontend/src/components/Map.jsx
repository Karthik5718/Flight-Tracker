import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { Plane } from 'lucide-react';

const Map = ({ position, route, selectedFlight }) => {
  const [map, setMap] = useState(null);

  // Fly to aircraft when live position updates
  useEffect(() => {
    if (map && position && position.lat && position.lon) {
      map.flyTo([position.lat, position.lon], 6, { animate: true, duration: 1.5 });
    }
  }, [position, map]);

  // Fly to route when route is available and no live position
  useEffect(() => {
    if (map && route && route.length >= 2 && !(position && position.lat && position.lon)) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [route, map, position]);

  const createPlaneIcon = (heading) => {
    const iconHtml = renderToString(
      <div style={{
        transform: `rotate(${heading || 0}deg)`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Plane size={24} color="#4ade80" fill="#4ade80" />
      </div>
    );
    return L.divIcon({
      html: iconHtml,
      className: 'custom-plane-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const hasRoute = route && route.length >= 2;
  const hasPosition = position && position.lat && position.lon;

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
        {hasRoute && (
          <Polyline positions={route} pathOptions={{ color: '#4ade80', weight: 2, dashArray: '8 6', opacity: 0.9 }} />
        )}
        {/* origin/destination markers */}
        {hasRoute && route.map((coord, idx) => (
          <Marker key={idx} position={coord} icon={L.divIcon({
            html: `<div style="width:8px;height:8px;background:#fff;border:2px solid #4ade80;border-radius:50%"></div>`,
            className: 'route-dot',
            iconSize: [8,8],
            iconAnchor: [4,4]
          })} />
        ))}
        {hasPosition && (
          <Marker position={[position.lat, position.lon]} icon={createPlaneIcon(position.heading)} />
        )}
      </MapContainer>

      {!hasRoute && !hasPosition && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#888',
          background: 'rgba(0,0,0,0.5)',
          padding: '1rem',
          borderRadius: '8px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          No position available<br />
          <span style={{ fontSize: '0.8rem' }}>Route will appear when origin/destination are known</span>
        </div>
      )}
      {hasRoute && !hasPosition && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          background: 'rgba(0,0,0,0.6)',
          color: '#4ade80',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: '0.8rem',
          zIndex: 1000
        }}>
          Route shown · Live position unavailable
        </div>
      )}
    </div>
  );
};

export default Map;
