import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { productAlertsApi, newsletterApi } from '../../services/dajaPlatform.js';
import './ProductAlertModal.css';

const ALERT_LABELS = {
  back_in_stock: 'kada proizvod ponovo bude na stanju',
  price_change: 'kada se cena proizvoda promeni',
};

export default function ProductAlertModal({
  isOpen,
  onClose,
  product,
  type,
  onSubscribed,
}) {
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setAcceptedTerms(false);
    setSubscribeToNewsletter(false);
    setSubmitting(false);
    setError('');
  }, [isOpen, product?.id, type]);

  if (!isOpen || !product?.id || !product?.variantId || !type) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!acceptedTerms) {
      setError('Potvrdite saglasnost sa uslovima i politikom privatnosti.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await productAlertsApi.subscribe(product.id, {
        type,
        variantId: product.variantId,
        email,
        acceptedTerms: true,
      }, { auth: false });

      let newsletterWarning = false;
      if (subscribeToNewsletter) {
        try {
          await newsletterApi.subscribe(email, 'product_alert');
        } catch (newsletterError) {
          // A duplicate subscription is already the desired outcome.
          if (newsletterError?.status !== 409) newsletterWarning = true;
        }
      }

      onSubscribed?.({ type, newsletterWarning });
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Prijava za obaveštenje nije uspela.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="product-alert-modal__overlay" role="presentation">
      <div
        className="product-alert-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-alert-modal-title"
      >
        <button
          type="button"
          className="product-alert-modal__close"
          onClick={onClose}
          aria-label="Zatvori"
          disabled={submitting}
        >
          <X size={20} />
        </button>

        <div className="product-alert-modal__icon">
          <Bell size={22} />
        </div>
        <h2 id="product-alert-modal-title">Obavesti me</h2>
        <p>
          Unesite email adresu, a mi ćemo vam javiti {ALERT_LABELS[type]}.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="product-alert-subscription-email">Email adresa</label>
          <input
            id="product-alert-subscription-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vas@email.com"
            autoComplete="email"
            required
            disabled={submitting}
            autoFocus
          />

          <label className="product-alert-modal__check">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              disabled={submitting}
            />
            <span>
              Prihvatam <a href="/terms">uslove korišćenja</a> i{' '}
              <a href="/privacy">politiku privatnosti</a>.
            </span>
          </label>

          <label className="product-alert-modal__check">
            <input
              type="checkbox"
              checked={subscribeToNewsletter}
              onChange={(event) => setSubscribeToNewsletter(event.target.checked)}
              disabled={submitting}
            />
            <span>Želim da dobijam novosti, ponude i savete emailom.</span>
          </label>

          {error && <p className="product-alert-modal__error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Čuvamo…' : 'Uključi obaveštenje'}
          </button>
        </form>
      </div>
    </div>
  );
}
