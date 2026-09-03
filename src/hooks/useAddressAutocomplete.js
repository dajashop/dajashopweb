import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGoogleMapsPlaces } from '../services/googleMaps.js';

const MINIMUM_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 220;

/**
 * Uses Google's current Place Autocomplete Data API while allowing the app to
 * keep its own accessible, theme-aware address field and result list.
 */
export function useAddressAutocomplete({ enabled, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionTokenRef = useRef(null);
  const timeoutRef = useRef(null);
  const latestRequestRef = useRef(0);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const clear = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    latestRequestRef.current += 1;
    setIsLoading(false);
    setSuggestions([]);
  }, []);

  useEffect(() => clear, [clear]);

  useEffect(() => {
    if (!enabled) {
      clear();
      sessionTokenRef.current = null;
    }
  }, [clear, enabled]);

  const search = useCallback(
    (value) => {
      window.clearTimeout(timeoutRef.current);
      const query = String(value ?? '').trim();
      const requestId = ++latestRequestRef.current;
      if (!enabled || query.length < MINIMUM_QUERY_LENGTH) {
        setIsLoading(false);
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      timeoutRef.current = window.setTimeout(async () => {
        try {
          await loadGoogleMapsPlaces();
          const { AutocompleteSessionToken, AutocompleteSuggestion } =
            await window.google.maps.importLibrary('places');
          sessionTokenRef.current ??= new AutocompleteSessionToken();
          const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ['rs'],
            language: 'sr',
            region: 'RS',
            sessionToken: sessionTokenRef.current,
          });
          if (requestId !== latestRequestRef.current) return;
          setSuggestions(
            (response.suggestions || [])
              .map((suggestion) => suggestion.placePrediction)
              .filter(Boolean)
              .slice(0, 5),
          );
        } catch (error) {
          if (requestId === latestRequestRef.current) {
            setSuggestions([]);
            console.warn('Google predlozi adrese nisu dostupni:', error);
          }
        } finally {
          if (requestId === latestRequestRef.current) setIsLoading(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [enabled],
  );

  const select = useCallback(async (placePrediction) => {
    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
      onSelectRef.current?.(googlePlaceToAddress(place));
    } finally {
      sessionTokenRef.current = null;
      clear();
    }
  }, [clear]);

  return { suggestions, isLoading, search, select, clear };
}

export function addressPredictionLabel(prediction) {
  return prediction?.text?.toString?.() || '';
}

export function addressPredictionPrimaryText(prediction) {
  return prediction?.mainText?.toString?.() || addressPredictionLabel(prediction);
}

export function addressPredictionSecondaryText(prediction) {
  return prediction?.secondaryText?.toString?.() || '';
}

function googlePlaceToAddress(place) {
  let street = '';
  let number = '';
  let city = '';
  let postalCode = '';

  for (const component of place.addressComponents || []) {
    const types = component.types || [];
    const value = component.longText || component.long_name || '';
    if (types.includes('route')) street = value;
    if (types.includes('street_number')) number = value;
    if (types.includes('locality')) city = value;
    if (!city && types.includes('administrative_area_level_2')) city = value;
    if (types.includes('postal_code')) postalCode = value;
  }

  return {
    address: number ? `${street} ${number}` : street || place.formattedAddress || '',
    city,
    postalCode,
  };
}
