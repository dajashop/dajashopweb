import { useCallback, useEffect, useState, useMemo } from 'react';
import { subscribeProducts } from '../services/products';

export default function useProducts(params = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stabilizujemo parametre da ne bi izazivali re-render petlju
  // Mentor napomena: Ovo je odlično rešeno sa JSON.stringify
  const memoizedParams = useMemo(() => params, [JSON.stringify(params)]);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const unsub = subscribeProducts({
      onData: (arr) => {
        setItems(arr);
        setLoading(false);
      },
      onError: (e) => {
        setErr(e);
        setLoading(false);
      },
      // Prosleđujemo SVE parametre servisu (limit, category, itd.), a ne samo order
      order: memoizedParams.order || 'name',
      limit: memoizedParams.limit || 32, // Default limit ako nije naveden
      ...memoizedParams,
    });

    return () => unsub?.();
  }, [memoizedParams, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  return { items, loading, err, refresh };
}
