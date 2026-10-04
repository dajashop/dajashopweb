import { useEffect, useState } from 'react';
import { catalogApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { applyPublicProductRealtimeEvent } from '../services/products.js';
import { useConsent } from '../context/ConsentContext.jsx';
import { usePageData } from '../ssr/PageData.jsx';

export default function useRelatedProducts(slug) {
  const page = usePageData();
  const { hasDecision } = useConsent();
  const initialItems = page?.data?.product?.slug === slug ? page.data.relatedProducts || [] : [];
  const [result, setResult] = useState({ slug, items: initialItems });

  useEffect(() => {
    if (!slug) return undefined;
    let controller;
    let mounted = true;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const items = await catalogApi.relatedProducts(slug, signal);
        if (mounted && !signal.aborted) setResult({ slug, items });
      } catch {
        // Optional recommendations must never hide the main product page.
      }
    };
    void load();
    window.addEventListener('daja:products-changed', load);
    return () => {
      mounted = false;
      controller?.abort();
      window.removeEventListener('daja:products-changed', load);
    };
  }, [slug]);

  useEffect(() => {
    if (!hasDecision) return undefined;
    // Preserve the product page's live updates without subscribing to a list.
    return subscribePublicCatalogRealtime(event => {
      void applyPublicProductRealtimeEvent(event);
    });
  }, [hasDecision]);

  return result.slug === slug ? result.items : initialItems;
}
