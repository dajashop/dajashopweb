import { cachedResource, rememberResource, requestResource } from '../services/catalogResourceCache.js';
import { useEffect, useState } from 'react';
import { variantGroupsApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { useConsent } from '../context/ConsentContext.jsx';
import { usePageData } from '../ssr/PageData.jsx';

export default function useProductVariantGroup(slug, enabled = true) {
  const { hasDecision } = useConsent();
  const page = usePageData();
  const hasSeed = page?.hydrating && page?.data?.product?.slug === slug && page.data.relatedVariantsLoaded;
  const initialItems = hasSeed ? page.data.relatedVariants || [] : cachedResource(`variants:${slug}`) || [];
  const [result, setResult] = useState({ slug, items: initialItems });
  useEffect(() => {
    if (!slug || !enabled) return undefined;
    const resourceKey = `variants:${slug}`;
    if (hasSeed) rememberResource(resourceKey, initialItems);
    const stored = cachedResource(resourceKey);
    if (stored) setResult({ slug, items: stored });
    let mounted = true;
    let controller;
    const load = async (force = false) => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const items = await requestResource(resourceKey, requestSignal => variantGroupsApi.publicMembers(slug, requestSignal), { signal, force });
        if (mounted && !signal.aborted) setResult({ slug, items });
      } catch (error) {
        if (mounted && !signal.aborted) setResult(current => current.slug === slug ? current : { slug, items: [] });
      }
    };
    if (!cachedResource(resourceKey, true)) void load();
    const refresh = () => { void load(true); };
    window.addEventListener('focus', refresh);
    window.addEventListener('daja:variant-groups-changed', refresh);
    window.addEventListener('daja:products-changed', refresh);
    window.addEventListener('daja:filters-changed', refresh);
    return () => {
      mounted = false; controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('daja:variant-groups-changed', refresh);
      window.removeEventListener('daja:products-changed', refresh);
      window.removeEventListener('daja:filters-changed', refresh);
    };
  }, [slug, enabled]);
  useEffect(() => {
    if (!hasDecision) return undefined;
    return subscribePublicCatalogRealtime(event => {
      if (['catalog.variant-groups.updated', 'product.updated'].includes(event.event)) {
        window.dispatchEvent(new Event('daja:variant-groups-changed'));
      }
    });
  }, [hasDecision]);
  return result.slug === slug ? result.items : initialItems;
}
