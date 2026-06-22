import { useEffect, useRef, useState } from 'react';
import { Check, Map, MapPin, X } from 'lucide-react';
import GoogleLocationInput from '@/components/common/GoogleLocationInput';
import ServiceAreaMap from '@/components/common/ServiceAreaMap';
import { getNearestCity } from '@/utils/localSearch';

function readCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export default function LocationFilterPicker({
  value,
  latitude,
  longitude,
  radiusKm,
  onTextChange,
  onPlaceSelect,
  onLocationChange,
  placeholder = 'Ville, quartier ou adresse',
  className = '',
}) {
  const pickerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftLatitude, setDraftLatitude] = useState(readCoordinate(latitude));
  const [draftLongitude, setDraftLongitude] = useState(readCoordinate(longitude));
  const hasSelectedPoint = readCoordinate(latitude) !== null && readCoordinate(longitude) !== null;
  const hasDraftPoint = draftLatitude !== null && draftLongitude !== null;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const openMap = () => {
    setDraftLatitude(readCoordinate(latitude));
    setDraftLongitude(readCoordinate(longitude));
    setIsOpen(true);
  };

  const applyPoint = () => {
    if (!hasDraftPoint) {
      return;
    }

    const nearestCity = getNearestCity(draftLatitude, draftLongitude);
    onLocationChange?.({
      latitude: draftLatitude,
      longitude: draftLongitude,
      label: nearestCity?.city || value,
    });
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className={`location-filter-picker ${className}`.trim()}>
      <div className="location-filter-control">
        <MapPin className="location-filter-leading-icon" size={17} aria-hidden="true" />
        <GoogleLocationInput
          value={value}
          onTextChange={onTextChange}
          onPlaceSelect={onPlaceSelect}
          className="form-input location-filter-input"
          placeholder={placeholder}
        />
        <button
          type="button"
          className={`location-filter-map-button${hasSelectedPoint ? ' is-selected' : ''}`}
          onClick={() => (isOpen ? setIsOpen(false) : openMap())}
          aria-label="Choisir un point sur la carte"
          aria-expanded={isOpen}
          title="Choisir sur la carte"
        >
          <Map size={17} />
        </button>
      </div>

      {isOpen && (
        <div className="location-filter-popover">
          <div className="location-filter-popover-head">
            <div>
              <strong>Choisir l'emplacement</strong>
              <span>Cliquez sur la carte ou deplacez le marqueur.</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Fermer la carte" title="Fermer">
              <X size={16} />
            </button>
          </div>

          <ServiceAreaMap
            city={value}
            latitude={draftLatitude}
            longitude={draftLongitude}
            radiusKm={radiusKm}
            onLocationChange={({ latitude: nextLatitude, longitude: nextLongitude }) => {
              setDraftLatitude(nextLatitude);
              setDraftLongitude(nextLongitude);
            }}
          />

          <div className="location-filter-popover-actions">
            <span>{hasDraftPoint ? 'Point pret a etre utilise' : 'Selectionnez un point'}</span>
            <button type="button" onClick={applyPoint} disabled={!hasDraftPoint}>
              <Check size={15} />
              Utiliser ce point
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
