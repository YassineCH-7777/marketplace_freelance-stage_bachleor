export const SEARCH_RADIUS_OPTIONS = [5, 10, 20, 50];
export const DEFAULT_SEARCH_RADIUS_KM = 10;

const CITY_COORDINATES = {
  agadir: { lat: 30.4278, lng: -9.5981 },
  'beni mellal': { lat: 32.3373, lng: -6.3498 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  dakhla: { lat: 23.6848, lng: -15.958 },
  'el jadida': { lat: 33.2316, lng: -8.5007 },
  errachidia: { lat: 31.9314, lng: -4.4245 },
  essaouira: { lat: 31.5085, lng: -9.7595 },
  fes: { lat: 34.0181, lng: -5.0078 },
  ifrane: { lat: 33.5333, lng: -5.1167 },
  kenitra: { lat: 34.261, lng: -6.5802 },
  khouribga: { lat: 32.886, lng: -6.9092 },
  laayoune: { lat: 27.1536, lng: -13.2033 },
  marrakech: { lat: 31.6295, lng: -7.9811 },
  meknes: { lat: 33.8935, lng: -5.5473 },
  mohammedia: { lat: 33.6861, lng: -7.3829 },
  nador: { lat: 35.1681, lng: -2.9335 },
  ouarzazate: { lat: 30.9335, lng: -6.937 },
  oujda: { lat: 34.6814, lng: -1.9086 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  safi: { lat: 32.2994, lng: -9.2372 },
  sale: { lat: 34.0531, lng: -6.7985 },
  settat: { lat: 33.001, lng: -7.6166 },
  tangier: { lat: 35.7595, lng: -5.834 },
  tanger: { lat: 35.7595, lng: -5.834 },
  taroudant: { lat: 30.4703, lng: -8.8769 },
  taza: { lat: 34.21, lng: -4.01 },
  tetouan: { lat: 35.5785, lng: -5.3684 },
};

export function normalizeLocationKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveSearchRadius(value) {
  const radius = Number(value);
  return SEARCH_RADIUS_OPTIONS.includes(radius) ? radius : DEFAULT_SEARCH_RADIUS_KM;
}

export function getRadiusOptionIndex(value) {
  const index = SEARCH_RADIUS_OPTIONS.indexOf(resolveSearchRadius(value));
  return index >= 0 ? index : SEARCH_RADIUS_OPTIONS.indexOf(DEFAULT_SEARCH_RADIUS_KM);
}

export function getCityDistanceKm(fromCity, toCity) {
  const from = CITY_COORDINATES[normalizeLocationKey(fromCity)];
  const to = CITY_COORDINATES[normalizeLocationKey(toCity)];

  if (!from || !to) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getLocationCoordinates(location) {
  if (!location) {
    return null;
  }

  if (typeof location === 'object') {
    const lat = Number(location.lat ?? location.latitude);
    const lng = Number(location.lng ?? location.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return CITY_COORDINATES[normalizeLocationKey(location.label || location.city || location.name)] || null;
  }

  return CITY_COORDINATES[normalizeLocationKey(location)] || null;
}

export function getLocationLabel(location) {
  if (!location) {
    return '';
  }

  if (typeof location === 'object') {
    return location.label || location.city || location.name || '';
  }

  return location;
}

export function getLocationDistanceKm(fromLocation, toLocation) {
  const from = getLocationCoordinates(fromLocation);
  const to = getLocationCoordinates(toLocation);

  if (!from || !to) {
    return null;
  }

  const googleGeometry = window.google?.maps?.geometry?.spherical;
  if (googleGeometry?.computeDistanceBetween && window.google?.maps?.LatLng) {
    const fromLatLng = new window.google.maps.LatLng(from.lat, from.lng);
    const toLatLng = new window.google.maps.LatLng(to.lat, to.lng);
    return googleGeometry.computeDistanceBetween(fromLatLng, toLatLng) / 1000;
  }

  return getCoordinateDistanceKm(from, to);
}

export function matchesLocationWithinRadius(targetLocation, candidateLocations, radiusKm) {
  const targetLabel = normalizeLocationKey(getLocationLabel(targetLocation));

  if (!targetLabel && !getLocationCoordinates(targetLocation)) {
    return true;
  }

  const candidates = Array.isArray(candidateLocations) ? candidateLocations : [candidateLocations];
  return candidates.some((candidateLocation) => {
    const candidateLabel = normalizeLocationKey(getLocationLabel(candidateLocation));

    if (!candidateLabel || candidateLabel === 'remote' || candidateLabel === 'a distance') {
      return false;
    }

    if (
      targetLabel &&
      (candidateLabel === targetLabel ||
        candidateLabel.includes(targetLabel) ||
        targetLabel.includes(candidateLabel))
    ) {
      return true;
    }

    const distanceKm = getLocationDistanceKm(targetLocation, candidateLocation);
    return distanceKm !== null && distanceKm <= resolveSearchRadius(radiusKm);
  });
}

export function matchesCityWithinRadius(targetCity, candidateCities, radiusKm) {
  return matchesLocationWithinRadius(targetCity, candidateCities, radiusKm);
}

export function formatRadiusLabel(radiusKm) {
  return `${resolveSearchRadius(radiusKm)} km`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getCoordinateDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
