import React from 'react';
import { useCart } from '../../hooks/useCart';
import EngravingSummary from '../engraving/EngravingSummary';
import { ArrowRight, ShieldCheck, Ticket } from 'lucide-react'; // Dodao Ticket ikonicu
import { CHECKOUT_UNAVAILABLE_MESSAGE } from '../../hooks/useCheckoutAvailability.js';
import { seoConfig } from '../../config/seo.js';

export default function OrderSummary({
  total,
  shippingMethod,
  finalShipping,
  finalTotal, // Ovo će sada biti total SA uračunatim popustom
  handlePlaceOrder,
  money,
  isLoading,
  availability,
  isCheckingAvailability,
  onCheckAvailability,
  appliedPromo, // NOVO: Primamo objekat promo koda
  discountAmount, // NOVO: Iznos popusta
}) {
  const { items } = useCart();
  return (
    <div className="summary-card card glass">
      <h2>Pregled porudžbine</h2>
      {items.filter((item) => item.engraving).map((item) => <div key={item.lineId || item.id}><b>{item.name}</b><EngravingSummary item={item} editable /></div>)}
      <div className="summary-rows">
        <div className="summary-row">
          <span className="muted">Međuzbir</span>
          <span>{money(total)}</span>
        </div>

        {/* --- NOVO: Prikaz popusta ako postoji --- */}
        {appliedPromo && (
          <div className="summary-row" style={{ color: '#ef4444' }}>
            <span
              className="muted"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ef4444',
              }}
            >
              <Ticket size={14} /> Popust ({appliedPromo.code})
            </span>
            <span>-{money(discountAmount)}</span>
          </div>
        )}

        <div className="summary-row">
          <span className="muted">Isporuka</span>
          {finalShipping === 0 ? (
            <span className="text-success">Besplatna</span>
          ) : (
            <span>{money(finalShipping)}</span>
          )}
        </div>

        <div className="hr"></div>

        <div className="summary-total">
          <span>Ukupno</span>
          <span className="total-price">{money(finalTotal)}</span>
        </div>
      </div>

      {availability !== 'available' && (
        <div id="checkout-availability" className="checkout-availability" role="status" aria-live="polite">
          <p>{availability === 'checking' ? 'Proveravamo da li je poručivanje dostupno…' : CHECKOUT_UNAVAILABLE_MESSAGE}</p>
          {availability === 'unavailable' && (
            <div className="checkout-availability-actions">
              <a href={`tel:${seoConfig.business.phone.replace(/[^+\d]/g, '')}`}>Pozovite nas</a>
              <a href={`mailto:${seoConfig.business.email}`}>Pišite nam</a>
              <button type="button" onClick={() => void onCheckAvailability()} disabled={isCheckingAvailability}>
                {isCheckingAvailability ? 'Proveravamo…' : 'Proveri ponovo'}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handlePlaceOrder}
        className="checkout-btn btn-primary"
        disabled={isLoading || availability !== 'available'}
        aria-describedby={availability !== 'available' ? 'checkout-availability' : undefined}
        aria-busy={isLoading || availability === 'checking'}
      >
        {isLoading ? 'Obrada...' : availability === 'checking' ? 'Provera dostupnosti…' : availability === 'unavailable' ? 'Trenutno nije dostupno' : 'Potvrdi porudžbinu'}
        {!isLoading && availability === 'available' && <ArrowRight size={18} />}
      </button>

      <div className="secure-badge">
        <ShieldCheck size={16} /> Sigurna kupovina
      </div>
    </div>
  );
}
