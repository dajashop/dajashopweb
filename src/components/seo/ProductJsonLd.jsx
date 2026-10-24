import { productSeoDescription } from '../../utils/productSeoDescription.js';
import React from 'react';
import JsonLd from './JsonLd.jsx';
import { commerceSeoConfig, seoConfig } from '../../config/seo.js';

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

function variantTraits(product) {
  const specs = Object.fromEntries(Object.entries(product.specs || {}).map(([key, value]) => [
    key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s/-]+/g, '_'), value,
  ]));
  const combine = keys => [...new Set(keys.map(key => specs[key]).filter(value => typeof value === 'string' && value.trim()))].join(' / ');
  const color = combine(['color', 'boja', 'boja_brojcanika', 'boja_kucista', 'boja_narukvice', 'boja_okvira', 'boja_sociva']);
  const material = combine(['material', 'materijal', 'materijal_kucista', 'materijal_narukvice', 'materijal_okvira', 'materijal_sociva']);
  return { ...(color ? { color } : {}), ...(material ? { material } : {}) };
}

function getAverageRating(reviews) {
  const values = reviews
    .map((r) => Number(r?.rating ?? r?.stars ?? r?.score))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!values.length) return null;
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  return Number(avg.toFixed(1));
}

function shippingDetails(price) {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: String(Number(price) >= commerceSeoConfig.freeShippingThreshold ? 0 : commerceSeoConfig.shippingCost),
      currency: commerceSeoConfig.currency,
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: commerceSeoConfig.country,
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: 0,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: commerceSeoConfig.deliveryMinDays,
        maxValue: commerceSeoConfig.deliveryMaxDays,
        unitCode: 'DAY',
      },
    },
  };
}

export default function ProductJsonLd({ product, reviews = [], relatedVariants = [], groupId }) {
  if (!product) {
    return null;
  }

  const imageUrls = collectProductImages(product);
  const seoImageAlt = (product.seo?.imageAltText || '').trim();
  const productName = `${product.brand || ''} ${product.name || ''}`.trim();
  const description = productSeoDescription(product);
  const image = imageUrls.map((imageItem) => ({
        '@type': 'ImageObject',
        url: imageItem.url,
        name: imageItem.altText || seoImageAlt || productName,
      }));
  const availability = product.availability?.inStock ?? product.inStock;
  const productUrl = `${seoConfig.siteUrl.replace(/\/$/, '')}/product/${product.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    url: productUrl,
    name: productName,
    description,
    image,
    ...variantTraits(product),
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
      shippingDetails: shippingDetails(product.price),
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: commerceSeoConfig.country,
        returnPolicyCountry: commerceSeoConfig.country,
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        returnMethod: 'https://schema.org/ReturnByMail',
        merchantReturnDays: commerceSeoConfig.returnDays,
        returnFees: 'https://schema.org/ReturnShippingFees',
      },
    },
  };

  if (groupId && relatedVariants.length) {
    // Public grouping identity comes from the same resolver as the selector.
    // Manual group names and automatic matching rules are never exposed.
    schema.inProductGroupWithID = groupId;
    const members = [product, ...relatedVariants];
    let commonName = String(members[0].name || '');
    for (const member of members.slice(1)) {
      while (commonName && !String(member.name || '').startsWith(commonName)) commonName = commonName.slice(0, -1);
    }
    const traits = members.map(variantTraits);
    const variesBy = ['color', 'material'].filter(key => traits.every(item => item[key]) && new Set(traits.map(item => item[key])).size > 1)
      .map(key => `https://schema.org/${key}`);
    const commonBrand = members.every(item => item.brand === product.brand) ? product.brand : null;
    schema.isVariantOf = {
      '@type': 'ProductGroup',
      name: [commonBrand, commonName.replace(/[\s\-_/]+$/, '')].filter(Boolean).join(' ') || 'Varijante proizvoda',
      productGroupID: groupId,
      ...(commonBrand ? { brand: { '@type': 'Brand', name: commonBrand } } : {}),
      ...(variesBy.length ? { variesBy } : {}),
      hasVariant: [
        { '@id': `${productUrl}#product` },
        ...relatedVariants.map(variant => ({ '@type': 'Product',
          url: `${seoConfig.siteUrl.replace(/\/$/, '')}/product/${variant.slug}` })),
      ],
    };
  }

  const avgRating = Number.isFinite(Number(product.reviewSummary?.averageRating))
    ? Number(product.reviewSummary.averageRating)
    : Array.isArray(reviews)
      ? getAverageRating(reviews)
      : null;
  const reviewCount = Number(product.reviewSummary?.ratingCount || reviews.length);
  if (avgRating !== null && reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(avgRating),
      reviewCount: String(reviewCount),
    };
  }

  return <JsonLd data={schema} defer={false} />;
}
