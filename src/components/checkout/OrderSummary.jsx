import { useStorefront } from '../../localization/StorefrontContext.jsx';
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
  const { t: translateText, displayCurrency, moneyRsd } = useStorefront();

  const { items } = useCart();
  return (
    <div className="summary-card card glass">
      <h2>{translateText("Pregled porudžbine")}</h2>
      {items.filter((item) => item.engraving).map((item) => <div key={item.lineId || item.id}><b>{translateText(item.name)}</b><EngravingSummary item={item} editable /></div>)}
      <div className="summary-rows">
        <div className="summary-row">
          <span className="muted">{translateText("Međuzbir")}</span>
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
              <Ticket size={14} />{translateText(" Popust (")}{translateText(appliedPromo.code)})
            </span>
            <span>-{money(discountAmount)}</span>
          </div>
        )}

        <div className="summary-row">
          <span className="muted">{translateText("Isporuka")}</span>
          {finalShipping === 0 ? (
            <span className="text-success">{translateText("Besplatna")}</span>
          ) : (
            <span>{money(finalShipping)}</span>
          )}
        </div>

        <div className="hr"></div>

        <div className="summary-total">
          <span>{translateText("Ukupno")}</span>
          <span className="total-price">{money(finalTotal)}</span>
        </div>
      </div>

      {displayCurrency !== 'RSD' && <p className="summary-currency-note">
        {translateText('Cene u stranoj valuti su informativne. Plaćanje je u RSD.')}<br />
        <strong>{translateText('Konačan iznos za plaćanje')}: {moneyRsd(finalTotal)}</strong>
      </p>}

      {availability !== 'available' && (
        <div id="checkout-availability" className="checkout-availability" role="status" aria-live="polite">
          <p>{translateText(availability === 'checking' ? 'Proveravamo da li je poručivanje dostupno…' : CHECKOUT_UNAVAILABLE_MESSAGE)}</p>
          {availability === 'unavailable' && (
            <div className="checkout-availability-actions">
              <a href={`tel:${seoConfig.business.phone.replace(/[^+\d]/g, '')}`}>{translateText("Pozovite nas")}</a>
              <a href={`mailto:${seoConfig.business.email}`}>{translateText("Pišite nam")}</a>
              <button type="button" onClick={() => void onCheckAvailability()} disabled={isCheckingAvailability}>
                {translateText(isCheckingAvailability ? 'Proveravamo…' : 'Proveri ponovo')}
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
        {translateText(isLoading ? 'Obrada...' : availability === 'checking' ? 'Provera dostupnosti…' : availability === 'unavailable' ? 'Trenutno nije dostupno' : 'Potvrdi porudžbinu')}
        {!isLoading && availability === 'available' && <ArrowRight size={18} />}
      </button>

      <div className="secure-badge">
        <ShieldCheck size={16} />{translateText(" Sigurna kupovina")}</div>
    </div>
  );
}
