import React from 'react';
import './ProductFeatures.css';

const ProductFeatures = ({ product }) => {
  if (
    !product ||
    !product.features ||
    !Array.isArray(product.features) ||
    product.features.length === 0
  ) {
    return null;
  }

  const validFeatures = product.features.filter(
    (feature) =>
      feature.title &&
      feature.title.trim() !== '' &&
      !/^rfid\b/i.test(feature.title.trim())
  );

  if (validFeatures.length === 0) return null;

  return (
    <div className="product-features">
      <h3 className="features-heading">Napredne Funkcije</h3>

      <div className="features-list">
        {validFeatures.map((feature, index) => (
          <div className="feature-row" key={index}>
            <span className="feature-title">{feature.title}</span>
            <span className="feature-subtitle">{feature.subtitle}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductFeatures;
