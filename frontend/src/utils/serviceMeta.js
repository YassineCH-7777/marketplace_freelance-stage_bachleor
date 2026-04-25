export const SERVICE_MODE_OPTIONS = [
  { value: '', label: 'Tous les modes' },
  { value: 'ON_SITE', label: 'Sur place' },
  { value: 'HYBRID', label: 'Hybride' },
  { value: 'REMOTE', label: 'A distance' },
];

export const DELIVERY_WINDOW_OPTIONS = [
  { value: '', label: 'Tous les delais' },
  { value: '1', label: 'Sous 24h' },
  { value: '3', label: 'Ce week-end' },
  { value: '7', label: 'Cette semaine' },
];

export function getExecutionModeLabel(mode) {
  switch (mode) {
    case 'ON_SITE':
      return 'Sur place';
    case 'HYBRID':
      return 'Hybride';
    case 'REMOTE':
      return 'A distance';
    default:
      return 'Mode flexible';
  }
}

export function getExecutionModeTone(mode) {
  switch (mode) {
    case 'ON_SITE':
      return 'is-local';
    case 'HYBRID':
      return 'is-hybrid';
    case 'REMOTE':
      return 'is-remote';
    default:
      return '';
  }
}

export function getDeliveryTimeLabel(days) {
  if (days === 0) {
    return 'Disponible aujourd hui';
  }

  if (days === 1) {
    return 'Sous 24h';
  }

  if (days && days <= 3) {
    return 'Ce week-end';
  }

  if (days && days <= 7) {
    return 'Cette semaine';
  }

  if (days) {
    return `Sous ${days} jours`;
  }

  return 'Delai a confirmer';
}

export function getServiceLocationLabel(service) {
  if (service?.serviceCity && service.serviceCity.toLowerCase() !== 'remote') {
    return service.serviceCity;
  }

  if (service?.freelancerCity) {
    return service.freelancerCity;
  }

  return 'A distance';
}
