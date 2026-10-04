import { isGoogleAllowed } from './consentStorage.js';
import { loadGoogleMapsPlaces } from './googleMaps.js';

// Place ID encoded by the feature ID in the owner's Google Maps profile URL.
export const SHOP_PLACE_ID = import.meta.env.VITE_GOOGLE_SHOP_PLACE_ID?.trim()
  || 'ChIJ4Sm7GROxVUcRBECM65JEmH8';
export const SHOP_GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=Daja+Shop&query_place_id=${encodeURIComponent(SHOP_PLACE_ID)}`;

let pendingRequest = null;

export function fetchGoogleShopRating() {
  if (!isGoogleAllowed()) return Promise.reject(new Error('Google usluge nisu dozvoljene.'));
  if (pendingRequest) return pendingRequest;

  // Only deduplicate requests in flight; never persist or cache Google ratings.
  pendingRequest = (async () => {
    await loadGoogleMapsPlaces();
    if (!isGoogleAllowed()) throw new Error('Google usluge nisu dozvoljene.');
    const { Place } = await window.google.maps.importLibrary('places');
    const place = new Place({ id: SHOP_PLACE_ID });
    await place.fetchFields({ fields: ['rating', 'userRatingCount'] });
    if (!Number.isFinite(place.rating) || place.rating < 1 || place.rating > 5
      || !Number.isInteger(place.userRatingCount) || place.userRatingCount < 1) {
      throw new Error('Google ocena nije dostupna.');
    }
    return {
      value: place.rating,
      count: place.userRatingCount,
      attributions: (place.attributions || []).map(({ provider, providerURI }) => ({ provider, providerURI })),
    };
  })().finally(() => { pendingRequest = null; });
  return pendingRequest;
}
