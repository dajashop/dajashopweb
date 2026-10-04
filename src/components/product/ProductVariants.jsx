import React from 'react';
import { Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ProductVariants.css';
export default function ProductVariants({ product, relatedVariants }) {
  if (!relatedVariants || relatedVariants.length === 0) return null;

  return (
    <div className="product__variants">
      <div className="variants-title">
        <Layers size={16} />
        <span>Dostupne varijante</span>
      </div>
      <div className="variants-grid">
        {/* Trenutni model */}
        <div className="variant-card active" title="Trenutni model">
          <img
            src={product.images?.[0]?.url || product.image}
            alt={product.name}
            className="variant-img"
          />
        </div>
        {/* Ostale varijante */}
        {relatedVariants.map((variant) => (
          <Link
            key={variant.id}
            to={`/product/${variant.slug}`}
            replace
            className="variant-card"
            title={variant.name}
          >
            <img
              src={variant.images?.[0]?.url || variant.image}
              alt={variant.name}
              className="variant-img"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
