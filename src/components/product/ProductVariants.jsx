import React, { useEffect } from 'react';
import { Layers } from 'lucide-react';
import Link from '../ProductLink.jsx';
import { prepareProductVariant } from '../../services/products.js';
import './ProductVariants.css';

export default function ProductVariants({ product, relatedVariants, onSelect, pendingSlug }) {
  const members = [product, ...(relatedVariants || [])]
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'sr') || String(a.id).localeCompare(String(b.id)));
  const preloadSlugs = members.filter(item => item.slug !== product.slug).slice(0, 4).map(item => item.slug).join('|');
  useEffect(() => {
    const connection = navigator.connection;
    if (!preloadSlugs || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      for (const slug of preloadSlugs.split('|')) {
        if (controller.signal.aborted) break;
        try { await prepareProductVariant(slug, { signal: controller.signal }); } catch { /* Optional preloading. */ }
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [preloadSlugs]);

  if (!relatedVariants?.length) return null;
  return (
    <div className="product__variants" aria-busy={Boolean(pendingSlug)}>
      <h2 className="variants-title"><Layers size={16} /><span>Dostupne varijante</span></h2>
      <div className="variants-grid">
        {members.map(variant => (
          <Link key={variant.id} to={`/product/${variant.slug}`} replace prefetchImage
            className={`variant-card${variant.id === product.id ? ' active' : ''}${pendingSlug === variant.slug ? ' is-loading' : ''}`}
            title={variant.name} aria-current={variant.id === product.id ? 'page' : undefined}
            onClick={event => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (variant.id !== product.id) onSelect(variant);
            }}>
            <img src={variant.thumbnailUrl || variant.images?.[0]?.thumb || variant.images?.[0]?.url || variant.image}
              alt={variant.name} className="variant-img" loading="lazy" decoding="async" />
          </Link>
        ))}
      </div>
      <span className="sr-only" role="status">{pendingSlug ? 'Učitavanje izabrane varijante…' : ''}</span>
    </div>
  );
}
