// src/hooks/useProduct.js
import { useCallback, useEffect, useState } from "react";
import { fetchProductBySlug } from "../services/products";
import { usePageData } from '../ssr/PageData.jsx';

export default function useProduct(slug) {
  const page = usePageData();
  const initialProduct = page?.hydrating && page?.data?.product?.slug === slug ? page.data.product : null;
  const [result, setResult] = useState({
    slug, product: initialProduct, loading: Boolean(slug) && !initialProduct, error: null,
  });
  // Route changes must hide the previous result in the render itself, before effects run.
  const current = result.slug === slug ? result : {
    slug, product: initialProduct, loading: Boolean(slug) && !initialProduct, error: null,
  };
  const { product, loading, error } = current;

  useEffect(() => {
    if (!slug) return;

    let mounted = true;
    setResult({ slug, product: initialProduct, loading: !initialProduct, error: null });

    async function load() {
      try {
        const data = await fetchProductBySlug(slug);
        if (mounted) {
          setResult({
            slug, product: data || null, loading: false,
            error: data ? null : Object.assign(new Error("Proizvod nije pronađen u bazi."), { status: 404 }),
          });
        }
      } catch (err) {
        if (mounted) setResult({ slug, product: null, loading: false, error: err });
      }
    }

    if (!initialProduct) load();

    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    const updateCurrentProduct = (event) => {
      const change = event.detail;
      if (change?.type === 'upsert' && change.product) {
        setResult((current) => current.slug === slug && (
          change.product.slug === slug || (current.product && change.product.id === current.product.id)
        ) ? { ...current, product: { ...current.product, ...change.product }, loading: false, error: null } : current);
      }
      if (change?.type === 'deleteBySlug' && change.slug === slug) {
        setResult((current) => current.slug === slug ? { ...current, product: null, loading: false } : current);
      }
      if (change?.type === 'delete') {
        setResult((current) => current.slug === slug && current.product?.id === change.id
          ? { ...current, product: null, loading: false } : current);
      }
    };
    window.addEventListener('daja:products-changed', updateCurrentProduct);
    return () => window.removeEventListener('daja:products-changed', updateCurrentProduct);
  }, [slug]);

  useEffect(() => {
    if (!product?.salePrice || !product.saleValidUntil || !slug) return undefined;
    const delay = new Date(product.saleValidUntil).getTime() - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return undefined;
    let mounted = true;
    const timer = window.setTimeout(async () => {
      try {
        const fresh = await fetchProductBySlug(slug);
        if (mounted) setResult((current) => current.slug === slug
          ? { ...current, product: fresh } : current);
      } catch (err) {
        console.warn('Osvežavanje cene proizvoda nije uspelo:', err);
      }
    }, Math.min(delay + 50, 2_147_483_647));
    return () => { mounted = false; window.clearTimeout(timer); };
  }, [product?.salePrice, product?.saleValidUntil, slug]);

  const updateProduct = useCallback((patch) => setResult((current) => current.slug === slug && current.product
    ? { ...current, product: { ...current.product, ...patch } } : current), [slug]);
  return { product, loading, error, updateProduct };
}
