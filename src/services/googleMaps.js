const SCRIPT_ID = 'dajashop-google-maps-script';
const LEGACY_SCRIPT_ID = 'google-maps-script';

let mapsLoadPromise = null;

export function getGoogleMapsApiKey() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY?.trim();
  return apiKey && apiKey !== 'none' ? apiKey : '';
}

function mapsPlacesIsReady() {
  return Boolean(window.google?.maps?.places);
}

/**
 * Loads Google Maps/Places exactly once for the entire SPA.
 *
 * A previous implementation treated an existing <script> tag as loaded.
 * When a customer changed pages while that script was still downloading,
 * autocomplete was created too early and never retried.
 */
export function loadGoogleMapsPlaces() {
  if (mapsPlacesIsReady()) return Promise.resolve(window.google.maps);
  if (mapsLoadPromise) return mapsLoadPromise;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API ključ nije podešen.'));
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    let timeoutId;
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);

      if (error) {
        reject(error);
      } else if (mapsPlacesIsReady()) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Places biblioteka nije dostupna.'));
      }
    };

    const onLoad = () => finish();
    const onError = () => finish(new Error('Google Maps nije mogao da se učita.'));

    timeoutId = window.setTimeout(() => {
      finish(new Error('Google Maps je predugo čekao na učitavanje.'));
    }, 15000);

    const script =
      document.getElementById(SCRIPT_ID) ||
      document.getElementById(LEGACY_SCRIPT_ID);

    if (script) {
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (mapsPlacesIsReady()) finish();
    } else {
      const newScript = document.createElement('script');
      newScript.id = SCRIPT_ID;
      newScript.async = true;
      newScript.defer = true;
      newScript.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=sr&region=RS`;
      newScript.addEventListener('load', onLoad, { once: true });
      newScript.addEventListener('error', onError, { once: true });
      document.head.appendChild(newScript);
    }

  }).catch((error) => {
    // A failed request should not permanently prevent a later retry.
    mapsLoadPromise = null;
    throw error;
  });

  return mapsLoadPromise;
}
