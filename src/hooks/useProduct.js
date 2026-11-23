// src/hooks/useProduct.js
import { useCallback, useEffect, useState } from "react";
import { fetchProductBySlug, cachedProductBySlug, productResourceKey } from "../services/products";
import { catalogAffected, catalogFallback, catalogInvalidationEvent, currentCatalogPrice, rememberResource, restoreCatalogResource, staleCatalog } from '../services/catalogResourceCache.js';
import { usePageData } from '../ssr/PageData.jsx';
import { useAuth, useStaffCatalogScope } from './useAuth.js';
import { isAdminEmail } from '../services/dajaPlatform.js';

export default function useProduct(slug) {
  const { user } = useAuth();
  const staffScope = useStaffCatalogScope();
  const includeHiddenForAdmin = Boolean(staffScope && isAdminEmail(user?.email));
  const page = usePageData();
  const resourceKey = productResourceKey(slug, staffScope);
  const initialProduct = page?.hydrating && page?.data?.product?.slug === slug ? page.data.product
    : cachedProductBySlug(slug, staffScope) || (staffScope ? cachedProductBySlug(slug) : null);
  const [result, setResult] = useState({
    slug, resourceKey, product: initialProduct, loading: Boolean(slug) && !initialProduct, error: null,
  });
  const promotedProduct = staffScope && result.slug === slug
    && result.resourceKey === productResourceKey(slug) ? result.product : null;
  // Route changes must hide the previous result in the render itself, before effects run.
  const current = result.slug === slug && result.resourceKey === resourceKey ? result : {
    slug, resourceKey, product: initialProduct || promotedProduct,
    loading: Boolean(slug) && !(initialProduct || promotedProduct), error: null,
  };
  const { product, loading, error } = current;

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    let controller;
    let sequence = 0;
    let timer;
    let known = initialProduct || promotedProduct || cachedProductBySlug(slug, staffScope);
    if (page?.hydrating && initialProduct && !staffScope) rememberResource(resourceKey, initialProduct);
    setResult({ slug, resourceKey, product: known, loading: !known, error: null });

    const show = (data, error = null) => {
      known = data;
      clearTimeout(timer);
      setResult({ slug, resourceKey, product: data, loading: false, error });
      if (staleCatalog(data)) {
        const delay = data._catalogCache.staleUntil - Date.now();
        timer = setTimeout(() => show(null, Object.assign(new Error('Provera cene i dostupnosti'), { status: 503 })), Math.max(0, delay));
        return;
      }
      const now = Date.now();
      const boundaries = [data?.saleValidUntil, data?.nextSaleStartsAt].map(Date.parse).filter(time => time > now);
      if (boundaries.length) {
        timer = setTimeout(() => {
          if (document.visibilityState === 'visible') void load(true);
        }, Math.min(Math.min(...boundaries) - now + 30, 2_147_483_647));
      }
    };
    const load = async (force = false, restore = false) => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      const requestSequence = ++sequence;
      const active = () => mounted && !signal.aborted && requestSequence === sequence;
      try {
        if (restore && !staffScope && !known) {
          known = await restoreCatalogResource(resourceKey);
          if (!active()) return;
          if (cachedProductBySlug(slug)) { show(known); return; }
        }
        const data = await fetchProductBySlug(slug, { staffScope, includeHiddenForAdmin, signal, force });
        if (!active()) return;
        show(data || null, data ? null : Object.assign(new Error('Proizvod nije pronađen u bazi.'), { status: 404 }));
      } catch (failure) {
        if (!active() || failure.name === 'AbortError') return;
        const fallback = !staffScope && catalogFallback(resourceKey, failure, known);
        if (fallback) show(fallback);
        else if (staffScope && known && failure.status !== 404) show(known);
        else show(null, failure);
      }
    };
    if (known && !staleCatalog(known) && (cachedProductBySlug(slug, staffScope) || page?.hydrating &&
        (!known._catalogCache || known._catalogCache.freshUntil > Date.now()))) show(known);
    else void load(false, true);

    const refresh = event => {
      if (!catalogAffected(resourceKey, known, event.detail)) return;
      // A known change supersedes the older offline copy, including a deletion.
      const hadStale = staleCatalog(known);
      known = null;
      clearTimeout(timer);
      if (hadStale || event.detail?.type === 'delete' || event.detail?.type === 'deleteBySlug') {
        setResult({ slug, resourceKey, product: null, loading: true, error: null });
      }
      void load(true);
    };
    const onFocus = () => {
      if (document.visibilityState === 'visible' && !cachedProductBySlug(slug, staffScope)) void load();
    };
    window.addEventListener(catalogInvalidationEvent, refresh);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      mounted = false;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener(catalogInvalidationEvent, refresh);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [slug, resourceKey, staffScope, includeHiddenForAdmin]);

  const updateProduct = useCallback((patch) => setResult((current) => current.slug === slug && current.product
    ? { ...current, product: { ...current.product, ...patch } } : current), [slug]);
  return { product: page?.hydrating ? product : currentCatalogPrice(product), loading, error, updateProduct };
}
