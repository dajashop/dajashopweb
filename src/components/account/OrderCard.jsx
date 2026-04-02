// src/components/account/OrderCard.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ChevronDown,
  MapPin,
  Phone,
  CreditCard,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../../utils/currency';

export default function OrderCard({ order }) {
  const [isOpen, setIsOpen] = useState(false);
  const placeholderImage = '/placeholder.png';

  // Određivanje boje bedža na osnovu statusa
  const getStatusColor = (status) => {
    switch (status) {
      case 'Isporučeno':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Otkazano':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Poslato':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; // Na čekanju
    }
  };

  return (
    <motion.div
      className="order-card-modern card glass mb-4 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* HEADER KARTICE - Uvek vidljiv */}
      <div
        className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)]">
            <Package size={24} />
          </div>
          <div>
            {/* [ISPRAVKA]: Uklonjen fiksni '#' jer ID sada ima 'DAJA-' prefiks */}
            <h4 className="text-lg font-bold text-[var(--color-text)] m-0">
              {order.id}
            </h4>
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)] mt-1">
              <Clock size={14} />
              <span>{order.date}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
              order.status
            )}`}
          >
            {order.status}
          </span>
          <div className="text-right hidden sm:block">
            <span className="block text-xs text-[var(--color-muted)]">
              Ukupno
            </span>
            <span className="block font-bold text-[var(--color-primary)] text-lg">
              {money(order.finalTotal)}
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`text-[var(--color-muted)] transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* DETALJI - Expandable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]"
          >
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LISTA PROIZVODA */}
              <div>
                <h5 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">
                  Artikli
                </h5>
                <div className="space-y-3">
                  {order.items.map((item, idx) => {
                    const lineTotal = money((item.price || 0) * (item.qty || 1));
                    // Koristimo isti prioritet kao u korpi: image iz item-a, zatim prvi iz images niza, pa rezervni.
                    const imageSrc =
                      item.image ||
                      item.images?.[0]?.url ||
                      item.imageUrl ||
                      placeholderImage;
                    const nameNode = item.slug ? (
                      <Link
                        to={`/product/${item.slug}`}
                        className="text-[var(--color-text)] font-semibold hover:text-[var(--color-primary)] transition-colors line-clamp-2"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-text)] font-semibold line-clamp-2">
                        {item.name}
                      </span>
                    );

                    const imageNode = (
                      <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-[var(--color-border)] bg-white flex-shrink-0">
                        <img
                          src={imageSrc}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            if (e.target.dataset.fallback) return;
                            e.target.dataset.fallback = 'true';
                            e.target.src = placeholderImage;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 grid place-items-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white border border-white/30 px-2 py-1 rounded-full backdrop-blur-md">
                            Detalji
                          </span>
                        </div>
                      </div>
                    );

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 border-b border-[#b8b8b8] last:border-b-0"
                      >
                        {item.slug ? (
                          <Link to={`/product/${item.slug}`}>{imageNode}</Link>
                        ) : (
                          imageNode
                        )}

                        <div className="flex-1 min-w-0">
                          {nameNode}
                          {item.brand && (
                            <Link
                              to={`/catalog?brand=${encodeURIComponent(item.brand)}`}
                              className="inline-block text-xs text-[var(--color-muted)] mt-1 hover:text-[var(--color-primary)] transition-colors"
                            >
                              {item.brand}
                            </Link>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 text-sm">
                          <span className="text-[var(--color-text)] font-semibold">
                            {item.qty || 1}x
                          </span>
                          <span className="text-[var(--color-text)] font-bold">
                            {lineTotal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex justify-between items-center">
                  <span className="text-[var(--color-muted)]">Dostava:</span>
                  <span className="text-[var(--color-text)]">
                    {order.shippingCost === 0
                      ? 'Besplatna'
                      : money(order.shippingCost)}
                  </span>
                </div>
              </div>

              {/* INFO O DOSTAVI */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2">
                    Podaci za dostavu
                  </h5>
                  <div className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <MapPin
                      size={16}
                      className="mt-1 text-[var(--color-primary)] shrink-0"
                    />
                    <div>
                      <p className="font-bold">
                        {order.customer.name} {order.customer.surname}
                      </p>
                      {order.shippingMethod === 'pickup' ? (
                        <p className="text-[var(--color-muted)]">
                          Lično preuzimanje u radnji (Niš)
                        </p>
                      ) : (
                        <p className="text-[var(--color-muted)]">
                          {order.customer.address}, {order.customer.postalCode}{' '}
                          {order.customer.city}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2">
                    Plaćanje & Kontakt
                  </h5>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text)] mb-1">
                    <CreditCard
                      size={16}
                      className="text-[var(--color-primary)]"
                    />
                    <span>
                      {order.paymentMethod === 'cod' ? 'Pouzećem' : 'Karticom'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                    <Phone size={16} className="text-[var(--color-primary)]" />
                    <span>{order.customer.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
