import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect } from 'react';
import { Layers } from 'lucide-react';
import Link from '../ProductLink.jsx';
import { prepareProductVariant } from '../../services/products.js';
import { batteryPackaging } from '../../utils/batteryPackaging.js';
import './ProductVariants.css';

export default function ProductVariants({ product, relatedVariants, onSelect, pendingSlug }) {
  const { t: translateText, money } = useStorefront();
  const packs = Boolean(batteryPackaging(product));

  const members = [product, ...(relatedVariants || [])]
    .sort((a, b) => (packs ? (batteryPackaging(a)?.quantity ?? 0) - (batteryPackaging(b)?.quantity ?? 0) : 0) || String(a.name).localeCompare(String(b.name), 'sr') || String(a.id).localeCompare(String(b.id)));
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
      <h2 className="variants-title"><Layers size={16} /><span>{translateText(packs ? 'Izaberite pakovanje' : 'Dostupne varijante')}</span></h2>
      <div className={`variants-grid${packs ? ' battery-pack-options' : ''}`}>
        {members.map(variant => (
          <Link key={variant.id} to={`/product/${variant.slug}`} replace prefetchImage
            className={`variant-card${variant.id === product.id ? ' active' : ''}${pendingSlug === variant.slug ? ' is-loading' : ''}`}
            title={translateText(variant.name)} aria-current={variant.id === product.id ? 'page' : undefined}
            onClick={event => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (variant.id !== product.id) onSelect(variant);
            }}>
            <img src={variant.thumbnailUrl || variant.images?.[0]?.thumb || variant.images?.[0]?.url || variant.image}
              alt={translateText(variant.name)} className="variant-img" loading="lazy" decoding="async" />
            {packs && batteryPackaging(variant) && <span className="battery-pack-option-copy">
              <strong>{translateText(batteryPackaging(variant).box ? 'Cela kutija — {count} komada' : '{count} komada', { count: batteryPackaging(variant).quantity })}</strong>
              {variant.attributes?.hemijski_sastav_baterije === 'Ni-MH' && <span>
                {variant.attributes.format_baterije}
                {' · '}{variant.attributes.kapacitet_baterije || translateText('Kapacitet potvrditi pre kupovine')}
              </span>}
              <span>{money(batteryPackaging(variant).price)}</span>
              {batteryPackaging(variant).discountPercent > 0 && <small>{translateText('Popust {percent}%', { percent: batteryPackaging(variant).discountPercent })}</small>}
            </span>}
          </Link>
        ))}
      </div>
      <span className="sr-only" role="status">{translateText(pendingSlug ? 'Učitavanje izabrane varijante…' : '')}</span>
    </div>
  );
}
