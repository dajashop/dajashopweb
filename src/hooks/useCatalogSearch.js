import { useCallback, useEffect, useState } from 'react';
import { catalogApi } from '../services/dajaPlatform.js';

// Memory only: search history and personal recommendations are not collected.
const cache = new Map();
export default function useCatalogSearch({ q = '', mode = 'suggestions', department, sort = 'relevance', cursor, seed = 'catalog', enabled = true }) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const query = q.trim().slice(0, 120);
  const effectiveQuery = query.length >= 2 ? query : '';
  const key = JSON.stringify([effectiveQuery, mode, department, sort, cursor, seed]);
  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    const cached = cache.get(key);
    if (!attempt && cached && Date.now() - cached.at < 10_000) {
      setState({ key, data: cached.data, loading: false, error: null });
      return () => controller.abort();
    }
    setState({ key, data: null, loading: true, error: null });
    const timer = window.setTimeout(async () => {
      try {
        const data = await catalogApi.search({ q: effectiveQuery, mode, department, sort, cursor, seed }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (cache.size >= 80) cache.delete(cache.keys().next().value);
        cache.set(key, { at: Date.now(), data });
        setState({ key, data, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted || error.name === 'AbortError') return;
        setState({ key, data: null, loading: false, error });
      }
    }, mode === 'suggestions' && effectiveQuery ? 200 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [enabled, key, effectiveQuery, mode, department, sort, cursor, seed, attempt]);
  const current = enabled && state.key === key;
  return { data: current ? state.data : null, loading: enabled && (!current || state.loading), error: current ? state.error : null, retry };
}
