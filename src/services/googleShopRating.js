import { isGoogleAllowed } from './consentStorage.js';
import { getGoogleMapsApiKey, loadGoogleMapsPlaces, SHOP_PLACE_ID } from './googleMaps.js';

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
    if (!isGoogleAllowed()) throw new Error('Google usluge nisu dozvoljene.');
    await place.fetchFields({ fields: ['rating', 'userRatingCount'] });
    if (!isGoogleAllowed()) throw new Error('Google usluge nisu dozvoljene.');
    if (!Number.isFinite(place.rating) || place.rating < 1 || place.rating > 5
      || !Number.isInteger(place.userRatingCount) || place.userRatingCount < 1) {
      throw new Error('Google ocena nije dostupna.');
    }
    return {
      value: place.rating,
      count: place.userRatingCount,
      attributions: (place.attributions || []).map(({ provider, providerURI }) => ({ provider, providerURI })),
    };
  })().catch((error) => {
    const key = getGoogleMapsApiKey();
    const message = String(error?.message || 'Nepoznata greška.');
    console.warn('Google ocena nije dostupna:', key ? message.split(key).join('[redacted]') : message);
    throw error;
  }).finally(() => { pendingRequest = null; });
  return pendingRequest;
}
