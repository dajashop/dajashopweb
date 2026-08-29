import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';

function collectProductImages(product) {
  const list = [];

  if (product?.mainImageUrl) {
    list.push({ url: product.mainImageUrl, altText: product.seo?.imageAltText || '' });
  }

  if (Array.isArray(product?.images)) {
    product.images.forEach((img) => {
      if (typeof img === 'string' && img) list.push({ url: img, altText: '' });
      if (img && typeof img === 'object' && img.url) {
        list.push({ url: img.url, altText: img.altText || img.alt_text || '' });
      }
    });
  }

  if (product?.image) list.push({ url: product.image, altText: '' });

  return [...new Map(list.filter((image) => image.url).map((image) => [image.url, image])).values()];
}

function gtinProperty(barcode) {
  const value = String(barcode || '').replace(/[\s-]/g, '');
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return {};
  const digits = [...value].map(Number);
  const sum = digits
    .slice(0, -1)
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  if ((10 - (sum % 10)) % 10 !== digits.at(-1)) return {};
  return { [`gtin${value.length}`]: value };
}

function schemaCondition(condition) {
  const known = {
    new: 'NewCondition',
    used: 'UsedCondition',
    refurbished: 'RefurbishedCondition',
  };
  return `https://schema.org/${known[condition] || known.new}`;
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
  if (
    !product ||
    (typeof window !== 'undefined' && window.__DAJASHOP_SERVER_PRODUCT_SCHEMA__)
  ) {
    return null;
  }

  const imageUrls = collectProductImages(product);
  const seoImageAlt = (product.seo?.imageAltText || '').trim();
  const productName = `${product.brand || ''} ${product.name || ''}`.trim();
  const description =
    product.seo?.metaDescription ||
    product.description ||
    [
      productName,
      product.category ? `iz kategorije ${product.category}` : '',
      product.mpn ? `model ${product.mpn}` : '',
      ...Object.entries(product.specs || {})
        .slice(0, 2)
        .map(([key, value]) => `${key}: ${value}`),
      `Kupite u DajaShop prodavnici po ceni od ${product.price} RSD.`,
    ]
      .filter(Boolean)
      .join('. ')
      .slice(0, 160);
  const image = imageUrls.map((imageItem) => ({
        '@type': 'ImageObject',
        url: imageItem.url,
        name: imageItem.altText || seoImageAlt || productName,
      }));
  const availability = product.availability?.inStock ?? product.inStock;

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
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...gtinProperty(product.barcode),
    offers: {
      '@type': 'Offer',
      url: `${seoConfig.siteUrl.replace(/\/$/, '')}/product/${product.slug}`,
      priceCurrency: 'RSD',
      price: String(product.price ?? ''),
      availability: `https://schema.org/${availability ? 'InStock' : 'OutOfStock'}`,
      itemCondition: schemaCondition(product.itemCondition),
      ...(product.salePrice && product.saleValidUntil
        ? { priceValidUntil: String(product.saleValidUntil).slice(0, 10) }
        : {}),
      seller: {
        '@type': 'Organization',
        name: seoConfig.siteName,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'RS',
        returnPolicyCountry: 'RS',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        returnMethod: 'https://schema.org/ReturnByMail',
        merchantReturnDays: 14,
        returnFees: 'https://schema.org/ReturnShippingFees',
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
