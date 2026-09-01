import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// [IZMENA] Dodata MessageSquareQuote ikonica
import {
  CheckCircle2,
  MapPin,
  ShoppingBag,
  Ticket,
  MessageSquareQuote,
} from 'lucide-react';
import GoogleMapEmbed from '../privacy/GoogleMapEmbed.jsx';

const MAP_API_KEY = 'AIzaSyCwDMD-56pwnAqgEDqNCT8uMxFy_mPbAe0';
const SHOP_ADDRESS_QUERY = 'Daja Shop, TPC Gorca lokal C31, Nis, Srbija';
const MAP_EMBED_URL = `https://www.google.com/maps/embed/v1/place?key=${MAP_API_KEY}&q=${encodeURIComponent(
  SHOP_ADDRESS_QUERY
)}`;

// --- [NOVO] Funkcija za gramatiku (Vokativ) ---
function toVocative(name) {
  if (!name) return 'Kupče';
  const n = name.trim();
  const lastChar = n.slice(-1).toLowerCase();

  if (lastChar === 'a') return n; // Vesna -> Vesna
  if (lastChar === 'k') return n.slice(0, -1) + 'če'; // Vuk -> Vuče
  if (lastChar === 'g') return n.slice(0, -1) + 'že'; // Predrag -> Predraže
  if (!['a', 'e', 'i', 'o', 'u'].includes(lastChar)) return n + 'e'; // Dejan -> Dejane

  return n;
}

function OrderConfirmationModal({ order, money, onClose }) {
  const initialFocusRef = useRef(null);
  const orderId = order.id;
  const [showMap, setShowMap] = useState(false);

  // [NOVO] Izračunavamo ime za prikaz
  const firstName = order.customer.name
    ? order.customer.name.split(' ')[0]
    : '';
  const vocativeName = toVocative(firstName);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(() => initialFocusRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const isPickup = order.shippingMethod === 'pickup';
  const shippingLabel = isPickup ? 'Preuzimanje' : 'Isporuka kurirskom službom';

  return (
    <motion.div
      className="order-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="order-card glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        data-lenis-prevent
      >
        <div className="order-header">
          <CheckCircle2 size={32} className="text-success-ico" />
          {/* [IZMENA] Koristimo vocativeName umesto order.customer.name */}
          <h2 id="order-title">Hvala na poverenju, {vocativeName}!</h2>
          <p className="order-lead">
            Vaša porudžbina <strong>#{orderId}</strong> je uspešno primljena.
            Potvrdu smo poslali na <strong>{order.customer.email}</strong>.
          </p>
        </div>

        <div className="receipt-details">
          <h3 className="details-title">Detalji porudžbine:</h3>
          <div className="item-list">
            {order.items.map((item) => (
              <div key={item.id} className="item-row">
                <div className="item-name">{item.name}</div>
                <div className="item-qty">x {item.qty}</div>
                <div className="item-price">{money(item.price * item.qty)}</div>
              </div>
            ))}
          </div>

          <div className="summary-section">
            <div className="summary-row">
              <span>Međuzbir:</span>
              <span>{money(order.subtotal)}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="summary-row" style={{ color: '#ef4444' }}>
                <span
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Ticket size={14} /> Popust ({order.promoCode}):
                </span>
                <span>-{money(order.discountAmount)}</span>
              </div>
            )}

            <div className="summary-row">
              <span>{shippingLabel}:</span>
              <span className="text-success">
                {order.shippingCost === 0
                  ? 'Besplatna'
                  : money(order.shippingCost)}
              </span>
            </div>

            <div className="hr"></div>

            <div className="summary-row total">
              <span>Ukupno za plaćanje:</span>
              <span className="total-price">{money(order.finalTotal)}</span>
            </div>
          </div>

          <div className="delivery-info">
            <h4>{isPickup ? 'Adresa preuzimanja:' : 'Adresa dostave:'}</h4>

            {isPickup ? (
              <>
                <p>Niš, TPC Gorča lokal C31</p>
                <p>
                  Vaš kontakt telefon: {order.customer.phone || 'Nije unet'}
                </p>

                <button
                  type="button"
                  className="btn-map-receipt"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMap(!showMap);
                  }}
                  style={{
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: '12px',
                  }}
                >
                  <MapPin size={16} />{' '}
                  {showMap ? 'Sakrij mapu' : 'Prikaži lokaciju na mapi'}
                </button>
                <AnimatePresence>
                  {showMap && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 250, marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="map-container rounded-xl overflow-hidden"
                      style={{ position: 'relative', width: '100%' }}
                    >
                      <GoogleMapEmbed
                        className="map-iframe"
                        title="Lokacija preuzimanja"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={MAP_EMBED_URL}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <p className="font-bold">
                  {order.customer.name} {order.customer.surname}
                </p>
                <p>
                  {order.customer.address}, {order.customer.city}{' '}
                  {order.customer.postalCode}
                </p>
                <p>Telefon: {order.customer.phone || 'Nije unet'}</p>
              </>
            )}
          </div>

          {/* --- [NOVO] PRIKAZ NAPOMENE --- */}
          {order.note && order.note.trim() !== '' && (
            <div
              className="order-note-display"
              style={{
                marginTop: '20px',
                padding: '12px 16px',
                backgroundColor: '#fffbeb', // Blago žuta
                borderLeft: '4px solid #fbbf24',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#92400e',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                }}
              >
                <MessageSquareQuote size={16} /> Vaša napomena
              </div>
              <p style={{ margin: 0, fontStyle: 'italic' }}>"{order.note}"</p>
            </div>
          )}
          {/* ----------------------------- */}
        </div>

        <div className="order-actions">
          <a
            href="/"
            className="btn-primary checkout-btn"
            ref={initialFocusRef}
            onClick={onClose}
          >
            Nastavi kupovinu <ShoppingBag size={18} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default OrderConfirmationModal;
