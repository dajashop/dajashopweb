import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';

function collectProductImages(product) {
  const list = [];

  if (product?.mainImageUrl) list.push(product.mainImageUrl);

  if (Array.isArray(product?.images)) {
    product.images.forEach((img) => {
      if (typeof img === 'string' && img) list.push(img);
      if (img && typeof img === 'object' && img.url) list.push(img.url);
    });
  }

  if (product?.image) list.push(product.image);

  return [...new Set(list.filter(Boolean))];
}

function getAverageRating(reviews) {
  const values = reviews
    .map((r) => Number(r?.rating ?? r?.stars ?? r?.score))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!values.length) return null;
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  return Number(avg.toFixed(1));
}

export default function ProductJsonLd({ product, reviews = [] }) {
  if (!product) return null;

  const image = collectProductImages(product);
  const productName = `${product.brand || ''} ${product.name || ''}`.trim();
  const description =
    product.description ||
    `Kupite ${productName} po ceni od ${product.price} RSD. Besplatna dostava.`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description,
    image,
    brand: {
      '@type': 'Brand',
      name: product.brand || seoConfig.siteName,
    },
    sku: product.slug,
    offers: {
      '@type': 'Offer',
      url: `${seoConfig.siteUrl.replace(/\/$/, '')}/product/${product.slug}`,
      priceCurrency: 'RSD',
      price: String(product.price ?? ''),
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: seoConfig.siteName,
      },
    },
  };

  const avgRating = Array.isArray(reviews) ? getAverageRating(reviews) : null;
  if (avgRating !== null && reviews.length > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(avgRating),
      reviewCount: String(reviews.length),
    };
  }

  return <JsonLd data={schema} />;
}
