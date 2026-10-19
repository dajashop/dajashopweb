import { cachedResource, rememberResource, requestResource } from '../services/catalogResourceCache.js';
import { useEffect, useState } from 'react';
import { catalogApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { applyPublicProductRealtimeEvent } from '../services/products.js';
import { useConsent } from '../context/ConsentContext.jsx';
import { usePageData } from '../ssr/PageData.jsx';

export default function useRelatedProducts(slug, enabled = true) {
  const page = usePageData();
  const { hasDecision } = useConsent();
  const hasSeed = page?.hydrating && page?.data?.product?.slug === slug && page.data.relatedProductsLoaded;
  const initialItems = hasSeed ? page.data.relatedProducts || [] : cachedResource(`related:${slug}`) || [];
  const [result, setResult] = useState({ slug, items: initialItems });

  useEffect(() => {
    if (!slug || !enabled) return undefined;
    const resourceKey = `related:${slug}`;
    if (hasSeed) rememberResource(resourceKey, initialItems);
    const stored = cachedResource(resourceKey);
    if (stored) setResult({ slug, items: stored });
    let controller;
    let mounted = true;
    const load = async (force = false) => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const items = await requestResource(resourceKey, requestSignal => catalogApi.relatedProducts(slug, requestSignal), { signal, force });
        if (mounted && !signal.aborted) setResult({ slug, items });
      } catch {
        // Optional recommendations must never hide the main product page.
      }
    };
    if (!cachedResource(resourceKey, true)) void load();
    const refresh = () => { void load(true); };
    const events = ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => {
      mounted = false;
      controller?.abort();
      events.forEach(event => window.removeEventListener(event, refresh));
    };
  }, [slug, enabled]);

  useEffect(() => {
    if (!hasDecision) return undefined;
    // Preserve the product page's live updates without subscribing to a list.
    return subscribePublicCatalogRealtime(event => {
      void applyPublicProductRealtimeEvent(event);
    });
  }, [hasDecision]);

  return result.slug === slug ? result.items : initialItems;
}
