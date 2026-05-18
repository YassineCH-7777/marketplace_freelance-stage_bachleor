import { useEffect, useRef } from 'react';
import { isGoogleMapsConfigured, loadGoogleMaps } from '@/utils/googleMaps';

export default function GoogleLocationInput({
  value,
  onTextChange,
  onPlaceSelect,
  placeholder = 'Ville, quartier ou adresse',
  className = 'form-input',
  ...props
}) {
  const inputRef = useRef(null);
  const callbacksRef = useRef({ onTextChange, onPlaceSelect });

  useEffect(() => {
    callbacksRef.current = { onTextChange, onPlaceSelect };
  }, [onTextChange, onPlaceSelect]);

  useEffect(() => {
    if (!isGoogleMapsConfigured() || !inputRef.current) {
      return undefined;
    }

    let autocomplete = null;
    let listener = null;
    let cancelled = false;

    loadGoogleMaps(['places', 'geometry'])
      .then((maps) => {
        if (cancelled || !inputRef.current || !maps?.places?.Autocomplete) {
          return;
        }

        autocomplete = new maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'ma' },
          fields: ['formatted_address', 'geometry', 'name', 'place_id'],
          types: ['geocode'],
        });

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          const label = place.formatted_address || place.name || inputRef.current.value;

          callbacksRef.current.onPlaceSelect?.({
            label,
            placeId: place.place_id || null,
            lat: location ? location.lat() : null,
            lng: location ? location.lng() : null,
          });
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      listener?.remove?.();
      autocomplete = null;
    };
  }, []);

  return (
    <input
      {...props}
      ref={inputRef}
      className={className}
      value={value}
      onChange={(event) => callbacksRef.current.onTextChange?.(event.target.value)}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}
