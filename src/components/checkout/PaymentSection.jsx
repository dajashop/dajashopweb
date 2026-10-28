import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSection({ payMethod, setPayMethod }) {
  const { t: translateText } = useStorefront();

  return (
    <section className="checkout-section card glass">
      <div className="section-header">
        <div className="step-badge">3</div>
        <h2>{translateText("Način plaćanja")}</h2>
      </div>
      <div className="payment-options">
        <label
          className={`radio-card ${payMethod === 'cod' ? 'selected' : ''}`}
        >
          <div className="radio-info">
            <div className="icon-box">💵</div>
            <div>
              <span className="radio-title">{translateText("Plaćanje pouzećem")}</span>
              <span className="radio-desc">{translateText("Platite kuriru prilikom preuzimanja")}</span>
            </div>
          </div>
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={payMethod === 'cod'}
            onChange={() => setPayMethod('cod')}
            hidden
          />
          <div className="radio-check">
            <CheckCircle2 size={16} />
          </div>
        </label>
      </div>
    </section>
  );
}
