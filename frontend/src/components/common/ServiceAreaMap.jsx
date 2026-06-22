import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getLocationCoordinates } from '@/utils/localSearch';
import '@/styles/maps.css';

const DEFAULT_CENTER = { lat: 31.7917, lng: -7.0926 };
const DEFAULT_RADIUS_KM = 10;
const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

const markerIcon = L.divIcon({
  className: 'service-area-marker',
  html: '<span></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function isValidCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  return Number.isFinite(Number(value));
}

function normalizePosition(latitude, longitude) {
  if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return null;
  }

  return {
    lat: Number(latitude),
    lng: Number(longitude),
  };
}

function MapClickHandler({ disabled, onSelect }) {
  useMapEvents({
    click(event) {
      if (disabled) {
        return;
      }

      onSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export default function ServiceAreaMap({
  city,
  latitude,
  longitude,
  radiusKm = DEFAULT_RADIUS_KM,
  disabled = false,
  onLocationChange,
}) {
  const selectedPosition = normalizePosition(latitude, longitude);
  const fallbackCenter = useMemo(() => getLocationCoordinates(city) || DEFAULT_CENTER, [city]);
  const center = selectedPosition || fallbackCenter;
  const radiusMeters = Math.max(1, Number(radiusKm) || DEFAULT_RADIUS_KM) * 1000;
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL || DEFAULT_TILE_URL;
  const tileAttribution = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || DEFAULT_TILE_ATTRIBUTION;

  const handleSelect = (position) => {
    onLocationChange?.({
      latitude: Number(position.lat.toFixed(6)),
      longitude: Number(position.lng.toFixed(6)),
    });
  };

  return (
    <div className="service-area-map">
      <MapContainer
        center={center}
        zoom={selectedPosition ? 12 : 6}
        scrollWheelZoom={false}
        className="service-area-map-canvas"
        aria-label="Zone d'intervention du service"
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} />
        <MapRecenter center={center} />
        <MapClickHandler disabled={disabled} onSelect={handleSelect} />
        {selectedPosition && (
          <>
            <Circle center={selectedPosition} radius={radiusMeters} pathOptions={{ color: '#0f766e', fillOpacity: 0.12 }} />
            <Marker
              draggable={!disabled}
              eventHandlers={{
                dragend(event) {
                  const position = event.target.getLatLng();
                  handleSelect(position);
                },
              }}
              icon={markerIcon}
              position={selectedPosition}
            />
          </>
        )}
      </MapContainer>
      <div className="service-area-map-meta">
        <span>{selectedPosition ? `${selectedPosition.lat.toFixed(4)}, ${selectedPosition.lng.toFixed(4)}` : 'Point non choisi'}</span>
        <strong>{Math.max(1, Number(radiusKm) || DEFAULT_RADIUS_KM)} km</strong>
      </div>
    </div>
  );
}
