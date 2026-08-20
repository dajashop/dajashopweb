// src/hooks/useProduct.js
import { useEffect, useState } from "react";
import { fetchProductBySlug } from "../services/products";

export default function useProduct(slug) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    let mounted = true;
    setLoading(true);

    async function load() {
      try {
        const data = await fetchProductBySlug(slug);
        if (mounted) {
          if (data) setProduct(data);
          else setError(new Error("Proizvod nije pronađen u bazi."));
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
      if (change?.type === 'upsert' && change.product?.slug === slug) {
        setProduct(change.product);
      }
      if (change?.type === 'deleteBySlug' && change.slug === slug) {
        setProduct(null);
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

  return { product, loading, error };
}
