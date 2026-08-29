import React from 'react';
import Breadcrumbs from '../Breadcrumbs.jsx';
import { money } from '../../utils/currency.js';
import './ProductHeader.css'; // OBAVEZNO: Uvozi svoj CSS

export default function ProductHeader({ product }) {
  if (!product) return null;
  const legacyRegularPrice =
    product.regularPrice ??
    (product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price
      ? product.price
      : null);
  const currentPrice = product.regularPrice !== null && product.regularPrice !== undefined
    ? product.price
    : product.salePrice ?? product.price;
  const hasSale =
    legacyRegularPrice !== null &&
    legacyRegularPrice !== undefined &&
    Number(currentPrice) < Number(legacyRegularPrice);
  const inStock = product.availability?.inStock ?? product.inStock;
  const availableQuantity = product.availability?.availableQuantity ?? product.availableQuantity;
  const conditionLabel = {
    new: 'Novo',
    used: 'Polovno',
    refurbished: 'Obnovljeno',
  }[product.itemCondition] || 'Novo';

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
      <h1 className="header-title">
        <span className="brand-label">{product.brand}</span>
        <span className="model-name">{product.name}</span>
      </h1>

      <div className="price-tag">
        {hasSale ? (
          <>
            <span className="product-regular-price">{money(legacyRegularPrice)}</span>
            <span className="product-sale-price">{money(currentPrice)}</span>
          </>
        ) : (
          money(currentPrice)
        )}
      </div>

      <p className={`product-stock ${inStock ? 'is-in-stock' : 'is-out-of-stock'}`}>
        {inStock
          ? `Na stanju${Number.isFinite(Number(availableQuantity)) ? `: ${availableQuantity} kom` : ''}`
          : 'Trenutno nije na stanju'}
      </p>

      <dl className="product-identifiers">
        {product.sku ? <><dt>SKU</dt><dd>{product.sku}</dd></> : null}
        {product.barcode ? <><dt>GTIN/EAN</dt><dd>{product.barcode}</dd></> : null}
        {product.mpn ? <><dt>MPN</dt><dd>{product.mpn}</dd></> : null}
        <dt>Stanje</dt><dd>{conditionLabel}</dd>
      </dl>
    </div>
  );
}
