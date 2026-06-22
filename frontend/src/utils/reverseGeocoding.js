import { isGoogleMapsConfigured, loadGoogleMaps } from '@/utils/googleMaps';

function joinLocationParts(city, district, fallback) {
  const parts = [city, district].filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)].join(', ') : fallback;
}

function findGoogleAddressPart(result, types) {
  return result?.address_components?.find((component) =>
    types.some((type) => component.types.includes(type)),
  )?.long_name;
}

async function reverseWithGoogle(latitude, longitude) {
  const maps = await loadGoogleMaps(['places', 'geometry']);
  const geocoder = new maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
  const result = response.results?.[0];
  if (!result) throw new Error('Adresse introuvable');

  const city = findGoogleAddressPart(result, [
    'locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1',
  ]);
  const district = findGoogleAddressPart(result, ['sublocality', 'neighborhood']);
  return joinLocationParts(city, district, result.formatted_address);
}

async function reverseWithOpenStreetMap(latitude, longitude, signal) {
  const params = new URLSearchParams({
    format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '14',
    addressdetails: '1', 'accept-language': 'fr',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: 'application/json' }, signal,
  });
  if (!response.ok) throw new Error('Service de localisation indisponible');

  const result = await response.json();
  const address = result.address || {};
  const city = address.city || address.town || address.village || address.municipality
    || address.county || address.state;
  const district = address.suburb || address.neighbourhood || address.city_district;
  return joinLocationParts(city, district, result.display_name);
}

export async function reverseGeocodeLocation(latitude, longitude, { signal } = {}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Coordonnees invalides');

  if (isGoogleMapsConfigured()) {
    try {
      return await reverseWithGoogle(lat, lng);
    } catch {
      // OpenStreetMap keeps map selection usable if Google geocoding is unavailable.
    }
  }
  return reverseWithOpenStreetMap(lat, lng, signal);
}
