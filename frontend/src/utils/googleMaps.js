let googleMapsPromise = null;

const DEFAULT_LIBRARIES = ['places', 'geometry'];

export function isGoogleMapsConfigured() {
  return Boolean(getGoogleMapsApiKey());
}

export function loadGoogleMaps(libraries = DEFAULT_LIBRARIES) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps requires a browser environment.'));
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY.'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__proxiskillsGoogleMaps${Date.now()}`;
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: apiKey,
      libraries: libraries.join(','),
      language: 'fr',
      region: 'MA',
      v: 'weekly',
      callback: callbackName,
    });

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error('Google Maps failed to load.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
}
