import React from 'react';
import Breadcrumbs from '../Breadcrumbs.jsx';
import { money } from '../../utils/currency.js';
import './ProductHeader.css'; // OBAVEZNO: Uvozi svoj CSS

export default function ProductHeader({ product }) {
  if (!product) return null;

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

      {/* Cena */}
      <div className="price-tag">{product.salePrice ? <><span className="text-sm line-through opacity-50 mr-2">{money(product.price)}</span><span className="text-red-600">{money(product.salePrice)}</span></> : money(product.price)}</div>
    </div>
  );
}
