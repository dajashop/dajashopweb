import { useEffect, useState } from 'react';
import { variantGroupsApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { useConsent } from '../context/ConsentContext.jsx';
import { usePageData } from '../ssr/PageData.jsx';

export default function useProductVariantGroup(slug) {
  const { hasDecision } = useConsent();
  const page = usePageData();
  const [result, setResult] = useState({ slug, items: page?.data?.product?.slug === slug ? page.data.relatedVariants || [] : [] });
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
    void load();
    const stop = hasDecision ? subscribePublicCatalogRealtime(event => {
      if (['catalog.variant-groups.updated', 'product.updated'].includes(event.event)) void load();
    }) : () => {};
    window.addEventListener('focus', load);
    window.addEventListener('daja:variant-groups-changed', load);
    window.addEventListener('daja:products-changed', load);
    return () => {
      mounted = false; controller?.abort(); stop();
      window.removeEventListener('focus', load);
      window.removeEventListener('daja:variant-groups-changed', load);
      window.removeEventListener('daja:products-changed', load);
    };
  }, [slug, hasDecision]);
  return result.slug === slug ? result.items : [];
}
