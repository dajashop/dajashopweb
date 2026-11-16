import React from 'react';
import { Banknote, CheckCircle2 } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';

export default function PaymentSection({ shippingMethod }) {
  const { t } = useStorefront();
  const pickup = shippingMethod === 'pickup';
  return <section className="checkout-section checkout-payment">
    <h3>{t('Način plaćanja')}</h3>
    <label className="radio-card selected">
      <input type="radio" name="payment" value={pickup ? 'pickup' : 'cod'} checked readOnly className="checkout-choice-input" />
      <div className="radio-info"><Banknote size={24} /><div><span className="radio-title">{t(pickup ? 'Plaćanje u prodavnici' : 'Plaćanje pouzećem')}</span><span className="radio-desc">{t(pickup ? 'Platite prilikom preuzimanja porudžbine' : 'Platite kuriru prilikom preuzimanja')}</span></div></div>
      <div className="radio-check"><CheckCircle2 size={16} /></div>
    </label>
  </section>;
}
