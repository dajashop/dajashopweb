import { cachedResource, rememberResource, requestResource } from '../services/catalogResourceCache.js';
import { useEffect, useState } from 'react';
import { variantGroupsApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { useConsent } from '../context/ConsentContext.jsx';
import { usePageData } from '../ssr/PageData.jsx';

export default function useProductVariantGroup(slug, product) {
  const enabled = Boolean(product?.id);
  const { hasDecision } = useConsent();
  const page = usePageData();
  const hasSeed = page?.hydrating && page?.data?.product?.slug === slug && page.data.relatedVariantsLoaded;
  const initialGroup = hasSeed ? { items: page.data.relatedVariants || [], groupId: page.data.variantGroupId || null }
    : cachedResource(`variants:${slug}`) || { items: [], groupId: null };
  const [result, setResult] = useState({ slug, source: product, ...initialGroup });
  useEffect(() => {
    if (!slug || !enabled) return undefined;
    const resourceKey = `variants:${slug}`;
    if (hasSeed) rememberResource(resourceKey, initialGroup);
    const stored = cachedResource(resourceKey);
    if (stored) setResult({ slug, source: product, ...stored });
    let mounted = true;
    let controller;
    const load = async (force = false) => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const group = await requestResource(resourceKey, requestSignal => variantGroupsApi.publicMembers(slug, requestSignal), { signal, force });
        if (mounted && !signal.aborted) setResult({ slug, source: product, ...group });
      } catch (error) {
        if (mounted && !signal.aborted) setResult(current => current.slug === slug ? current : { slug, source: product, items: [], groupId: null });
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
  if (result.slug === slug) return result;
  // Keep the last server-resolved group visible during a switch. The request
  // above still resolves this slug independently, including manual changes.
  if (result.source && result.items.some(item => item.slug === slug)) {
    return { groupId: result.groupId, items: [result.source, ...result.items].filter(item => item.slug !== slug) };
  }
  return initialGroup;
}
