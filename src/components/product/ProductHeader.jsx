import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import Breadcrumbs from '../Breadcrumbs.jsx';

import { storefrontFeatures } from '../../config/storefrontFeatures.js';
import './ProductHeader.css'; // OBAVEZNO: Uvozi svoj CSS

export default function ProductHeader({ product, adminTools }) {
  const { t: translateText, money } = useStorefront();

  if (!product) return null;
  const legacyRegularPrice =
    product.regularPrice ??
    (product.salePrice !== null &&
    product.salePrice !== undefined &&
    product.salePrice < product.price
      ? product.price
      : null);
  const currentPrice =
    product.regularPrice !== null && product.regularPrice !== undefined
      ? product.price
      : (product.salePrice ?? product.price);
  const hasSale =
    legacyRegularPrice !== null &&
    legacyRegularPrice !== undefined &&
    Number(currentPrice) < Number(legacyRegularPrice);
  const inStock = product.availability?.inStock ?? product.inStock;
  const availableQuantity =
    product.availability?.availableQuantity ?? product.availableQuantity;
  const showStock =
    !adminTools && storefrontFeatures.customerStockVisibility;
  const articleCode = product.sku || product.mpn;
  const hasPublicIdentifiers = articleCode || product.barcode;

  return (
    <div className="product-header">
      {/* Mrvice (Navigacija) */}
      <Breadcrumbs
        trail={[
          { label: 'Katalog', href: '/catalog' },
          { label: product.brand },
        ]}
      />

      {/* Naslov i Brend */}
      <div className={adminTools ? 'product-header-summary has-admin-tools' : 'product-header-summary'}>
      <div className="product-header-main">
      <h1 className="header-title">
        <span className="brand-label">{translateText(product.brand)}</span>
        <span className="model-name">{translateText(product.name)}</span>
      </h1>

      <div className="price-tag">
        {translateText(hasSale ? (
          <>
            <span className="product-regular-price">
              {money(legacyRegularPrice)}
            </span>
            <span className="product-sale-price">{money(currentPrice)}</span>
          </>
        ) : (
          money(currentPrice)
        ))}
      </div>

      {showStock && (
        <p
          className={`product-stock ${inStock ? 'is-in-stock' : 'is-out-of-stock'}`}
        >
          {translateText(inStock
            ? `Na stanju${Number.isFinite(Number(availableQuantity)) ? `: ${availableQuantity} kom` : ''}`
            : 'Trenutno nije na stanju')}
        </p>
      )}

      {hasPublicIdentifiers && !adminTools && (
        <dl className="product-identifiers">
          {articleCode ? (
            <>
              <dt><span className="product-code-full">{translateText('Šifra artikla')}</span><span className="product-code-short">{translateText('Šifra')}</span></dt>
              <dd>{articleCode}</dd>
            </>
          ) : null}
          {product.barcode ? (
            <>
              <dt>{translateText("GTIN/EAN")}</dt>
              <dd>{product.barcode}</dd>
            </>
          ) : null}
          {product.mpn && product.mpn !== articleCode ? (
            <>
              <dt>{translateText("MPN")}</dt>
              <dd>{product.mpn}</dd>
            </>
          ) : null}
        </dl>
      )}
      </div>
      {translateText(adminTools)}
      </div>
    </div>
  );
}
