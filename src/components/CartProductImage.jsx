import { useEffect, useState } from 'react';
import { fetchProductBySlug } from '../services/products.js';
import ProgressiveImage from './ui/ProgressiveImage.jsx';

const placeholder = '/images/product-placeholder.svg';

function imageUrls(product) {
  const first = product?.images?.[0];
  const urls = [product?.thumb, product?.thumbnailUrl, first?.thumb, product?.image,
    product?.mainImageUrl, product?.primaryImageUrl, typeof first === 'string' ? first : first?.url];
  return [...new Set(urls.filter(url => typeof url === 'string').map(url => url.trim()))]
    .filter(url => url && url !== placeholder);
}

function CartImageSources({ slug, storedUrls, className, showPlaceholder }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const [catalogUrls, setCatalogUrls] = useState([]);
  const storedSource = storedUrls.find(url => !failedUrls.includes(url));
  const source = storedSource || catalogUrls.find(url => !failedUrls.includes(url));
  const refresh = storedUrls.length > 0;

  useEffect(() => {
    if (!slug || storedSource) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    fetchProductBySlug(slug, { signal, force: refresh }).then(product => {
      const canonicalSlug = product?.redirectTo?.split('/').filter(Boolean).pop();
      return canonicalSlug && canonicalSlug !== slug ? fetchProductBySlug(canonicalSlug, { signal }) : product;
    }).then(product => {
      if (!signal.aborted) setCatalogUrls(imageUrls(product));
    }).catch(() => {
      // The stored sources and the placeholder cover unavailable products.
    });
    return () => controller.abort();
  }, [slug, storedSource, refresh]);

  if (!source && !showPlaceholder) return null;
  return <ProgressiveImage
    key={source || placeholder}
    src={source || placeholder}
    alt=""
    className={className}
    onError={source ? () => setFailedUrls(urls => [...urls, source]) : undefined}
  />;
}

export default function CartProductImage({ item, className, showPlaceholder = false }) {
  const storedUrls = imageUrls(item);
  return <CartImageSources
    key={JSON.stringify([item.slug, ...storedUrls])}
    slug={item.slug}
    storedUrls={storedUrls}
    className={className}
    showPlaceholder={showPlaceholder}
  />;
}
