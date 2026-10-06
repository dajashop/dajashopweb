import React, { useState } from 'react';
import ProductCard from './ProductCard.jsx';
import ProductModal from './modals/ProductModal.jsx';
import useProducts from '../hooks/useProducts';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import './ProductGrid.css';

export default function ProductGrid({ items }) {
  return items ? <ProductGridContent items={items} /> : <FetchedProductGrid />;
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

function ProductGridContent({ items }) {
  const [isModalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="product-grid">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>

      {/* Modal Komponenta */}
      <ProductModal open={isModalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
