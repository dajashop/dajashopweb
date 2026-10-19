import React, { useState } from 'react';
import ProductCard from './ProductCard.jsx';
import ProductModal from './modals/ProductModal.jsx';
import useProducts from '../hooks/useProducts';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import './ProductGrid.css';

export default function ProductGrid({ items, blankImages = false }) {
  return items ? <ProductGridContent items={items} blankImages={blankImages} /> : <FetchedProductGrid />;
}

function FetchedProductGrid() {
  const { items, loading, err } = useProducts();
  // Loading / Error stanja
  if (loading) {
    return (
      <div className="py-12 text-center font-medium text-neutral-500 animate-pulse">
        Učitavanje kataloga...
      </div>
    );
  }
  if (err) {
    return (
      <div className="py-12 text-center font-bold text-red-500">
        Greška: {String(err)}
      </div>
    );
  }

  return <ProductGridContent items={items} />;
}

function ProductGridContent({ items, blankImages = false }) {
  const [isModalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="product-grid">
        {items.map((p, index) => (
          <ProductCard key={p.id} p={p} priority={index < 4} blankImage={blankImages} />
        ))}
      </div>

      {/* Modal Komponenta */}
      <ProductModal open={isModalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
