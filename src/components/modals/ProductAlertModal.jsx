import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import {
  productAlertPreferences,
  productAlertsApi,
  newsletterApi,
} from '../../services/dajaPlatform.js';
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
  initialEmail = '',
  onSubscribed,
}) {
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsPreviouslyAccepted, setTermsPreviouslyAccepted] = useState(false);
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextEmail = String(initialEmail || '').trim();
    const preferences = productAlertPreferences.forEmail(nextEmail);
    setEmail(nextEmail);
    setAcceptedTerms(preferences.acceptedTerms);
    setTermsPreviouslyAccepted(preferences.acceptedTerms);
    setSubscribeToNewsletter(false);
    setNewsletterSubscribed(preferences.newsletterSubscribed);
    setSubmitting(false);
    setError('');
  }, [initialEmail, isOpen, product?.id, type]);

  if (!isOpen || !product?.id || !product?.variantId || !type) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!termsPreviouslyAccepted && !acceptedTerms) {
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

      if (!termsPreviouslyAccepted) {
        productAlertPreferences.markAcceptedTerms(email);
      }

      let newsletterWarning = false;
      if (!newsletterSubscribed && subscribeToNewsletter) {
        try {
          await newsletterApi.subscribe(email, 'product_alert');
          productAlertPreferences.markNewsletterSubscribed(email);
        } catch (newsletterError) {
          // A duplicate subscription is already the desired outcome.
          if (newsletterError?.status === 409) {
            productAlertPreferences.markNewsletterSubscribed(email);
          } else {
            newsletterWarning = true;
          }
        }
      }

      onSubscribed?.({ type, email, newsletterWarning });
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Prijava za obaveštenje nije uspela.');
    } finally {
      setSubmitting(false);
    }
  };

  // A wishlist card is animated with a CSS transform. Rendering the overlay
  // inside it makes a `position: fixed` layer use the card as its viewport,
  // which caused the modal to flash on card hover. A portal keeps it at the
  // document root, centered over the complete screen.
  return createPortal(
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
            onChange={(event) => {
              const nextEmail = event.target.value;
              const preferences = productAlertPreferences.forEmail(nextEmail);
              setEmail(nextEmail);
              setAcceptedTerms(preferences.acceptedTerms);
              setTermsPreviouslyAccepted(preferences.acceptedTerms);
              setNewsletterSubscribed(preferences.newsletterSubscribed);
              setSubscribeToNewsletter(false);
            }}
            placeholder="vas@email.com"
            autoComplete="email"
            required
            disabled={submitting}
            autoFocus
          />

          {!termsPreviouslyAccepted && (
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
          )}

          {!newsletterSubscribed && (
            <label className="product-alert-modal__check">
              <input
                type="checkbox"
                checked={subscribeToNewsletter}
                onChange={(event) => setSubscribeToNewsletter(event.target.checked)}
                disabled={submitting}
              />
              <span>Želim da dobijam novosti, ponude i savete emailom.</span>
            </label>
          )}

          {error && <p className="product-alert-modal__error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Čuvamo…' : 'Potvrdi obaveštenje'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
