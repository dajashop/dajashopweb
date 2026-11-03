import { productSeoDescription } from '../../utils/productSeoDescription.js';
import React from 'react';
import JsonLd from './JsonLd.jsx';
import { commerceSeoConfig, seoConfig } from '../../config/seo.js';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { localizedSiteUrl } from '../../localization/paths.js';
import { productSeoImage } from '../../utils/productSeoImage.js';

function collectProductImages(product) {
  const url = productSeoImage(product);
  const first = product?.images?.[0];
  return url ? [{ url, altText: first?.altText || first?.alt_text || '' }] : [];
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
  const { language, t } = useStorefront();
  if (!product) {
    return null;
  }

  const imageUrls = collectProductImages(product);
  const seoImageAlt = (product.seo?.imageAltText || '').trim();
  const productName = `${product.brand || ''} ${product.name || ''}`.trim();
  const description = productSeoDescription(product, language);
  // Only the primary photo represents this SKU in search. Detail shots remain
  // in the gallery and merchant feed, rather than competing as its thumbnail.
  const image = imageUrls.slice(0, 1).map((imageItem) => ({
        '@type': 'ImageObject',
        url: imageItem.url,
        name: imageItem.altText || seoImageAlt || productName,
      }));
  const availability = product.availability?.inStock ?? product.inStock;
  const productUrl = localizedSiteUrl(`/product/${encodeURIComponent(product.slug)}`, language, seoConfig.siteUrl);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    url: productUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': productUrl,
      ...(image[0] ? { primaryImageOfPage: image[0] } : {}),
    },
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
      url: productUrl,
      priceCurrency: 'RSD',
      price: product.price != null && Number.isFinite(Number(product.price)) ? Number(product.price).toFixed(2) : '',
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
      name: [commonBrand, commonName.replace(/[\s\-_/]+$/, '')].filter(Boolean).join(' ') || t('Varijante proizvoda'),
      productGroupID: groupId,
      ...(commonBrand ? { brand: { '@type': 'Brand', name: commonBrand } } : {}),
      ...(variesBy.length ? { variesBy } : {}),
      hasVariant: [
        { '@id': `${productUrl}#product` },
        ...relatedVariants.map(variant => ({ '@type': 'Product',
          url: localizedSiteUrl(`/product/${encodeURIComponent(variant.slug)}`, language, seoConfig.siteUrl) })),
      ],
    };
  }

  const publishedReviews = reviews.filter(review =>
    (!review.status || review.status === 'published') &&
    Number(review.rating) >= 1 && Number(review.rating) <= 5);
  const avgRating = product.reviewSummary?.averageRating != null && Number.isFinite(Number(product.reviewSummary.averageRating))
    ? Number(product.reviewSummary.averageRating)
    : getAverageRating(publishedReviews);
  const reviewCount = Number(product.reviewSummary?.ratingCount ?? publishedReviews.length);
  if (avgRating >= 1 && avgRating <= 5 && Number.isInteger(reviewCount) && reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(avgRating),
      reviewCount: String(reviewCount),
      bestRating: '5',
      worstRating: '1',
    };
  }
  const reviewItems = publishedReviews.filter(review => review.userName?.trim() && review.comment?.trim()).map(review => {
    const date = new Date(review.createdAt?.seconds ? review.createdAt.seconds * 1000 : review.createdAt);
    return {
      '@type': 'Review',
      author: { '@type': 'Person', name: review.userName.trim() },
      reviewBody: review.comment.trim(),
      reviewRating: { '@type': 'Rating', ratingValue: String(review.rating), bestRating: '5', worstRating: '1' },
      ...(review.createdAt && !Number.isNaN(date.getTime()) ? { datePublished: date.toISOString() } : {}),
    };
  });
  if (reviewItems.length) schema.review = reviewItems;

  return <JsonLd data={schema} defer={false} />;
}
