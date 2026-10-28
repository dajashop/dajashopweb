import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/apiClient.js';

export const CHECKOUT_UNAVAILABLE_MESSAGE =
  'Trenutno nije moguće potvrditi porudžbinu. Kontaktirajte nas ili pokušajte kasnije.';

export function useCheckoutAvailability() {
  const [availability, setAvailability] = useState('checking');
  const [isChecking, setIsChecking] = useState(false);
  const mounted = useRef(false);
  const request = useRef(null);

  const markUnavailable = useCallback(() => {
    const previous = request.current;
    request.current = null;
    previous?.controller.abort();
    if (mounted.current) {
      setAvailability('unavailable');
      setIsChecking(false);
    }
  }, []);

  const checkAvailability = useCallback(() => {
    if (!mounted.current) return Promise.resolve(false);
    if (navigator.onLine === false) {
      markUnavailable();
      return Promise.resolve(false);
    }
    if (request.current) return request.current.promise;

    const current = { controller: new AbortController(), promise: null };
    request.current = current;
    const isCurrent = () => mounted.current && request.current === current;
    setIsChecking(true);
    const timer = window.setTimeout(() => current.controller.abort(), 8_000);

    current.promise = (async () => {
      try {
        const baseUrl = new URL(API_BASE_URL, window.location.origin);
        const response = await fetch(new URL('/health/ready', baseUrl), {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          credentials: 'omit',
          signal: current.controller.signal,
        });
        // A proxy startup/error HTML page is not a healthy API response.
        const body = response.ok && response.headers.get('content-type')?.includes('application/json')
          ? await response.json() : null;
        const available = (body?.data || body)?.status === 'ok' && navigator.onLine !== false;
        if (!isCurrent()) return false;
        setAvailability(available ? 'available' : 'unavailable');
        return available;
      } catch {
        if (isCurrent()) setAvailability('unavailable');
        return false;
      } finally {
        window.clearTimeout(timer);
        if (isCurrent()) {
          request.current = null;
          setIsChecking(false);
        }
      }
    })();
    return current.promise;
  }, [markUnavailable]);

  useEffect(() => {
    mounted.current = true;
    const checkWhenVisible = () => {
      if (document.visibilityState !== 'hidden') void checkAvailability();
    };
    void checkAvailability();
    const interval = window.setInterval(checkWhenVisible, 30_000);
    window.addEventListener('online', checkWhenVisible);
    window.addEventListener('offline', markUnavailable);
    window.addEventListener('focus', checkWhenVisible);
    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener('online', checkWhenVisible);
      window.removeEventListener('offline', markUnavailable);
      window.removeEventListener('focus', checkWhenVisible);
      document.removeEventListener('visibilitychange', checkWhenVisible);
      const previous = request.current;
      request.current = null;
      previous?.controller.abort();
    };
  }, [checkAvailability, markUnavailable]);

  return { availability, isChecking, checkAvailability, markUnavailable };
}
