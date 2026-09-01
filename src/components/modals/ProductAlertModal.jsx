import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import {
  productAlertSubscriptions,
  productAlertsApi,
  newsletterApi,
} from '../../services/dajaPlatform.js';
import { useConsent } from '../../context/ConsentContext.jsx';
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
  authenticated = false,
  onSubscribed,
}) {
  const { policy } = useConsent();
  const [email, setEmail] = useState('');
  const [managementToken, setManagementToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [useAnotherEmail, setUseAnotherEmail] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsPreviouslyAccepted, setTermsPreviouslyAccepted] = useState(false);
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !product?.id || !product?.variantId || !type) return undefined;
    const storedContact = authenticated ? {} : productAlertSubscriptions.contact();
    const token = storedContact.managementToken || '';
    setEmail(String(initialEmail || '').trim());
    setManagementToken(token);
    setMaskedEmail(storedContact.maskedEmail || '');
    setUseAnotherEmail(false);
    setAcceptedTerms(false);
    setTermsPreviouslyAccepted(false);
    setSubscribeToNewsletter(false);
    setNewsletterSubscribed(false);
    setSubmitting(false);
    setError('');

    if (!authenticated && !token) return undefined;
    let cancelled = false;
    productAlertsApi
      .status(
        product.id,
        { variantId: product.variantId, ...(token ? { managementToken: token } : {}) },
        { auth: authenticated },
      )
      .then((status) => {
        if (cancelled) return;
        setTermsPreviouslyAccepted(status?.termsAccepted === true);
        setNewsletterSubscribed(status?.newsletterSubscribed === true);
        if (status?.maskedEmail) setMaskedEmail(status.maskedEmail);
      })
      .catch(() => {
        // A failed lookup never assumes consent or a newsletter subscription.
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, initialEmail, isOpen, product?.id, product?.variantId, type]);

  if (!isOpen || !product?.id || !product?.variantId || !type) return null;

  const reusableGuestContact = !authenticated && managementToken && !useAnotherEmail;
  const needsEmailInput = authenticated || !reusableGuestContact;
  const selectedEmail = String(email || '').trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!termsPreviouslyAccepted && !acceptedTerms) {
      setError('Potvrdite saglasnost sa uslovima i politikom privatnosti.');
      return;
    }
    if (needsEmailInput && !selectedEmail) {
      setError('Unesite email adresu za obaveštenje.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await productAlertsApi.subscribe(
        product.id,
        {
          type,
          variantId: product.variantId,
          ...(authenticated ? {} : {
            ...(reusableGuestContact ? { managementToken } : { email: selectedEmail }),
          }),
          acceptedTerms: true,
          ...(policy?.version ? { policyVersion: policy.version } : {}),
        },
        { auth: authenticated },
      );

      let newsletterWarning = false;
      if (!newsletterSubscribed && subscribeToNewsletter) {
        try {
          await newsletterApi.subscribe(
            reusableGuestContact ? undefined : selectedEmail,
            {
              source: 'product_alert',
              acceptedMarketing: true,
              authenticated,
              ...(reusableGuestContact ? { managementToken } : {}),
              ...(policy?.version ? { policyVersion: policy.version } : {}),
            },
          );
        } catch (newsletterError) {
          if (newsletterError?.status !== 409) newsletterWarning = true;
        }
      }

      onSubscribed?.({
        type,
        newsletterWarning,
        contact: {
          managementToken: result?.managementToken || managementToken,
          maskedEmail: result?.maskedEmail || maskedEmail,
        },
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Prijava za obaveštenje nije uspela.');
    } finally {
      setSubmitting(false);
    }
  };

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

        <div className="product-alert-modal__icon"><Bell size={22} /></div>
        <h2 id="product-alert-modal-title">Obavesti me</h2>
        <p>Javićemo vam {ALERT_LABELS[type]}.</p>

        <form onSubmit={handleSubmit}>
          {reusableGuestContact ? (
            <div className="product-alert-modal__saved-contact">
              <strong>Email za obaveštenje</strong>
              <span>{maskedEmail || 'Sačuvana email adresa'}</span>
              <button type="button" onClick={() => setUseAnotherEmail(true)} disabled={submitting}>
                Koristi drugi email
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="product-alert-subscription-email">Email adresa</label>
              <input
                id="product-alert-subscription-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (!authenticated) {
                    setManagementToken('');
                    setMaskedEmail('');
                    setTermsPreviouslyAccepted(false);
                    setNewsletterSubscribed(false);
                  }
                }}
                placeholder="vas@email.com"
                autoComplete="email"
                required={needsEmailInput}
                readOnly={authenticated}
                disabled={submitting}
                autoFocus
              />
            </>
          )}

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
