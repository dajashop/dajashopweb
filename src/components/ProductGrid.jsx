import React, { useState } from 'react';
import ProductCard from './ProductCard.jsx';
import ProductModal from './modals/ProductModal.jsx';
import useProducts from '../hooks/useProducts';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import './ProductGrid.css';

export default function ProductGrid({ items: propItems }) {
  // Podaci
  const { items: hookItems, loading, err } = useProducts();
  const displayItems = propItems || hookItems;
  const [isModalOpen, setModalOpen] = useState(false);

  // Loading / Error stanja
  if (loading && !propItems) {
    return (
      <div className="py-12 text-center font-medium text-neutral-500 animate-pulse">
        Učitavanje kataloga...
      </div>
    );
  }
  if (err && !propItems) {
    return (
      <div className="py-12 text-center font-bold text-red-500">
        Greška: {String(err)}
      </div>
    );
  }

  return (
    <>
      <div className="product-grid">
        {displayItems.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>

      {/* Modal Komponenta */}
      <ProductModal open={isModalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
