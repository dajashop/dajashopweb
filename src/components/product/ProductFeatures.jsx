import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import './ProductFeatures.css';
import { visibleProductFeatures } from '../../utils/catalogPresentation.js';

const ProductFeatures = ({ product }) => {
  const { t: translateText } = useStorefront();

  if (
    !product ||
    !product.features ||
    !Array.isArray(product.features) ||
    product.features.length === 0
  ) {
    return null;
  }

  const validFeatures = visibleProductFeatures(product.features);

  if (validFeatures.length === 0) return null;

  return (
    <div className="product-features">
      <h2 className="features-heading">{translateText("Napredne Funkcije")}</h2>

      <div className="features-list">
        {validFeatures.map((feature, index) => (
          <div className="feature-row" key={index}>
            <span className="feature-title">{translateText(feature.title)}</span>
            <span className="feature-subtitle">{translateText(feature.subtitle)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductFeatures;
