import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import Breadcrumbs from '../Breadcrumbs.jsx';
import { batteryPackaging } from '../../utils/batteryPackaging.js';

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
  const pack = batteryPackaging(product);
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
              {money(legacyRegularPrice, pack ? { precision: 2 } : undefined)}
            </span>
            <span className="product-sale-price">{money(currentPrice, pack ? { precision: 2 } : undefined)}</span>
          </>
        ) : (
          money(currentPrice, pack ? { precision: 2 } : undefined)
        ))}
      </div>

      {pack && (
        <div className="battery-pack-price">
          <p>{translateText(pack.quantity === 1 ? 'Cena za jednu bateriju' : pack.box ? 'Cena za celu kutiju od {count} komada' : 'Cena za pakovanje od {count} komada', { count: pack.quantity })}</p>
          {pack.quantity > 1 && <p className="battery-pack-calculation">
            {pack.quantity} × {money(pack.listUnitPrice, { precision: 2 })}
            {' = '}{money(pack.regularPrice ?? pack.price, { precision: 2 })}
          </p>}
          {pack.discountPercent > 0 && <p className="battery-pack-discount">
            {translateText('Popust za celu kutiju: {percent}%', { percent: pack.discountPercent })}
            {' · '}{money(pack.price, { precision: 2 })}
          </p>}
          {pack.quantity > 1 && <small>{translateText('Cena po bateriji: {price}', { price: money(pack.unitPrice, { precision: 2 }) })}</small>}
        </div>
      )}

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
