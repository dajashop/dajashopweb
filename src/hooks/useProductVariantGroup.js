import { useEffect, useState } from 'react';
import { variantGroupsApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { useConsent } from '../context/ConsentContext.jsx';
import { usePageData } from '../ssr/PageData.jsx';

export default function useProductVariantGroup(slug) {
  const { hasDecision } = useConsent();
  const page = usePageData();
  const hasSeed = page?.hydrating && page?.data?.product?.slug === slug && page.data.relatedVariantsLoaded;
  const initialItems = hasSeed ? page.data.relatedVariants || [] : [];
  const [result, setResult] = useState({ slug, items: initialItems });
  useEffect(() => {
    if (!slug) return undefined;
    let mounted = true;
    let controller;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const items = await variantGroupsApi.publicMembers(slug, signal);
        if (mounted && !signal.aborted) setResult({ slug, items });
      } catch (error) {
        if (mounted && !signal.aborted) setResult({ slug, items: [] });
      }
    };
    if (!hasSeed) void load();
    window.addEventListener('focus', load);
    window.addEventListener('daja:variant-groups-changed', load);
    window.addEventListener('daja:products-changed', load);
    return () => {
      mounted = false; controller?.abort();
      window.removeEventListener('focus', load);
      window.removeEventListener('daja:variant-groups-changed', load);
      window.removeEventListener('daja:products-changed', load);
    };
  }, [slug]);
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
