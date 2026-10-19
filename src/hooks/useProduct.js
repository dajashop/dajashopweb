// src/hooks/useProduct.js
import { useCallback, useEffect, useState } from "react";
import { fetchProductBySlug, cachedProductBySlug, productResourceKey } from "../services/products";
import { cachedResource, rememberResource } from '../services/catalogResourceCache.js';
import { usePageData } from '../ssr/PageData.jsx';
import { useAuth } from './useAuth.js';
import { isAdminEmail } from '../services/dajaPlatform.js';

export default function useProduct(slug) {
  const { user, staffReady } = useAuth();
  const includeHiddenForAdmin = Boolean(staffReady && isAdminEmail(user?.email));
  const page = usePageData();
  const resourceKey = productResourceKey(slug, includeHiddenForAdmin);
  const initialProduct = page?.hydrating && page?.data?.product?.slug === slug ? page.data.product : cachedProductBySlug(slug, includeHiddenForAdmin);
  const [result, setResult] = useState({
    slug, resourceKey, product: initialProduct, loading: Boolean(slug) && !initialProduct, error: null,
  });
  const promotedProduct = includeHiddenForAdmin && result.slug === slug
    && result.resourceKey === productResourceKey(slug, false) ? result.product : null;
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
    const stored = initialProduct || promotedProduct || cachedProductBySlug(slug, includeHiddenForAdmin);
    if (page?.hydrating && initialProduct) rememberResource(resourceKey, initialProduct);
    setResult({ slug, resourceKey, product: stored, loading: !stored, error: null });
    const load = (force = false) => {
      controller?.abort();
      controller = new AbortController();
      const requestSequence = ++sequence;
      void fetchProductBySlug(slug, { includeHiddenForAdmin, signal: controller.signal, force }).then(data => {
        if (mounted && requestSequence === sequence) setResult({ slug, resourceKey, product: data || null, loading: false,
          error: data ? null : Object.assign(new Error('Proizvod nije pronađen u bazi.'), { status: 404 }) });
      }).catch(error => {
        if (mounted && requestSequence === sequence && error.name !== 'AbortError') setResult(current => ({ ...current, loading: false,
          product: error.status === 404 ? null : current.product, error: current.product && error.status !== 404 ? null : error }));
      });
    };
    if (!cachedResource(resourceKey, true)) load();
    const refresh = () => load(true);
    const onFocus = () => { if (document.visibilityState === 'visible' && !cachedResource(resourceKey, true)) load(); };
    const events = ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false; controller?.abort();
      events.forEach(event => window.removeEventListener(event, refresh));
      window.removeEventListener('focus', onFocus);
    };
  }, [slug, resourceKey, includeHiddenForAdmin]);

  useEffect(() => {
    const updateCurrentProduct = (event) => {
      const change = event.detail;
      if (change?.type === 'upsert' && change.product) {
        setResult((current) => current.slug === slug && current.product && (
          change.product.slug === slug || (current.product && change.product.id === current.product.id)
        ) ? { ...current, product: { ...current.product, ...change.product }, loading: false, error: null } : current);
      }
      if (change?.type === 'deleteBySlug' && change.slug === slug && !includeHiddenForAdmin) {
        setResult(current => current.slug === slug ? { ...current, product: null, loading: true } : current);
      }
      if (change?.type === 'delete') {
        setResult((current) => current.slug === slug && current.product?.id === change.id
          ? { ...current, product: null, loading: false } : current);
      }
    };
    window.addEventListener('daja:products-changed', updateCurrentProduct);
    return () => window.removeEventListener('daja:products-changed', updateCurrentProduct);
  }, [slug, includeHiddenForAdmin]);

  useEffect(() => {
    if (!product?.salePrice || !product.saleValidUntil || !slug) return undefined;
    const delay = new Date(product.saleValidUntil).getTime() - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return undefined;
    let mounted = true;
    const timer = window.setTimeout(async () => {
      try {
        const fresh = await fetchProductBySlug(slug, { includeHiddenForAdmin, force: true });
        if (mounted) setResult((current) => current.slug === slug
          ? { ...current, product: fresh } : current);
      } catch (err) {
        console.warn('Osvežavanje cene proizvoda nije uspelo:', err);
      }
    }, Math.min(delay + 50, 2_147_483_647));
    return () => { mounted = false; window.clearTimeout(timer); };
  }, [product?.salePrice, product?.saleValidUntil, slug, includeHiddenForAdmin]);

  const updateProduct = useCallback((patch) => setResult((current) => current.slug === slug && current.product
    ? { ...current, product: { ...current.product, ...patch } } : current), [slug]);
  return { product, loading, error, updateProduct };
}
