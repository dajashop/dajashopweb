// src/hooks/useProduct.js
import { useCallback, useEffect, useState } from "react";
import { fetchProductBySlug } from "../services/products";
import { usePageData } from '../ssr/PageData.jsx';

export default function useProduct(slug) {
  const page = usePageData();
  const initialProduct = page?.data?.product?.slug === slug ? page.data.product : null;
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(Boolean(slug) && !initialProduct);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    let mounted = true;
    setError(null);
    setLoading(!initialProduct);

    async function load() {
      try {
        const data = await fetchProductBySlug(slug);
        if (mounted) {
          if (data) setProduct(data);
          else setError(Object.assign(new Error("Proizvod nije pronađen u bazi."), { status: 404 }));
        }
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    const updateCurrentProduct = (event) => {
      const change = event.detail;
      if (change?.type === 'upsert' && change.product) {
        setProduct((current) => change.product.slug === slug || (current && change.product.id === current.id)
          ? { ...current, ...change.product }
          : current);
      }
      if (change?.type === 'deleteBySlug' && change.slug === slug) {
        setProduct(null);
      }
      if (change?.type === 'delete') {
        setProduct((current) => current?.id === change.id ? null : current);
      }
    };
    window.addEventListener('daja:products-changed', updateCurrentProduct);
    return () => window.removeEventListener('daja:products-changed', updateCurrentProduct);
  }, [slug]);

  useEffect(() => {
    if (!product?.salePrice || !product.saleValidUntil || !slug) return undefined;
    const delay = new Date(product.saleValidUntil).getTime() - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const fresh = await fetchProductBySlug(slug);
        setProduct(fresh);
      } catch (err) {
        console.warn('Osvežavanje cene proizvoda nije uspelo:', err);
      }
    }, Math.min(delay + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [product?.salePrice, product?.saleValidUntil, slug]);

  const updateProduct = useCallback((patch) => setProduct((current) => current ? { ...current, ...patch } : current), []);
  return { product, loading, error, updateProduct };
}
