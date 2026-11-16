import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShoppingBag, Ticket } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import ProgressiveImage from '../ui/ProgressiveImage.jsx';
import EngravingSummary from '../engraving/EngravingSummary';
import { CHECKOUT_UNAVAILABLE_MESSAGE } from '../../hooks/useCheckoutAvailability.js';
import { seoConfig } from '../../config/seo.js';

export default function OrderSummary({
  items, total, finalShipping, finalTotal, money, availability,
  isCheckingAvailability, onCheckAvailability, promoCode, discountAmount, confirmed,
}) {
  const { t, displayCurrency, moneyRsd } = useStorefront();
  const summaryMoney = amount => <>{moneyRsd(amount)}{displayCurrency !== 'RSD' && <small className="summary-foreign-amount">({money(amount)})</small>}</>;

  return <div className="summary-card">
    <div className="checkout-summary-heading"><h2>{t('Vaša porudžbina')}</h2>{!confirmed && <Link to="/cart">{t('Izmeni')}</Link>}</div>
    <details className="checkout-products" open>
      <summary>{t('Proizvodi')} <span>({items.reduce((count, item) => count + Number(item.qty || 1), 0)})</span></summary>
      <div className="checkout-product-list">{items.map(item => <div className="checkout-product" key={item.lineId || item.id}>
        <div className="checkout-product-image">{item.image || item.thumb ? <ProgressiveImage src={item.image || item.thumb} alt="" loading="lazy" /> : <ShoppingBag size={24} />}</div>
        <div className="checkout-product-info"><span>{item.brand}</span><strong>{item.name}</strong><small>{t('Količina')}: {item.qty}</small>{item.engraving && <EngravingSummary item={item} editable={!confirmed} />}</div>
        <strong className="checkout-product-price">{summaryMoney(item.price * item.qty)}</strong>
      </div>)}</div>
    </details>
    <div className="summary-rows">
      <div className="summary-row"><span>{t('Međuzbir')}</span><span className="summary-amount">{summaryMoney(total)}</span></div>
      {discountAmount > 0 && <div className="summary-row checkout-discount"><span><Ticket size={14} /> {t('Popust')}{promoCode ? ' (' + promoCode + ')' : ''}</span><span className="summary-amount">−{summaryMoney(discountAmount)}</span></div>}
      <div className="summary-row"><span>{t('Isporuka')}</span>{finalShipping === 0 ? <span className="checkout-free">{t('Besplatna')}</span> : <span className="summary-amount">{summaryMoney(finalShipping)}</span>}</div>
      <div className="summary-total" aria-live="polite"><span>{t('Ukupno za plaćanje')}</span><span className="total-price summary-amount">{summaryMoney(finalTotal)}</span></div>
    </div>
    <p className="checkout-currency-note">{t('Plaćanje se vrši u dinarima (RSD).')}{displayCurrency !== 'RSD' && <> {t('Iznos u zagradi je informativna protivvrednost u izabranoj valuti.')}</>}</p>
    {!confirmed && availability !== 'available' && <div id="checkout-availability" className="checkout-availability" role="status" aria-live="polite">
      <p>{t(availability === 'checking' ? 'Proveravamo da li je poručivanje dostupno…' : CHECKOUT_UNAVAILABLE_MESSAGE)}</p>
      {availability === 'unavailable' && <div className="checkout-availability-actions">
        <a href={'tel:' + seoConfig.business.phone.replace(/[^+\d]/g, '')}>{t('Pozovite nas')}</a>
        <a href={'mailto:' + seoConfig.business.email}>{t('Pišite nam')}</a>
        <button type="button" onClick={() => void onCheckAvailability()} disabled={isCheckingAvailability}>{t(isCheckingAvailability ? 'Proveravamo…' : 'Proveri ponovo')}</button>
      </div>}
    </div>}
    <div className="secure-badge"><ShieldCheck size={17} />{t(confirmed ? 'Porudžbina potvrđena' : 'Sigurna kupovina i garancija')}</div>
  </div>;
}
