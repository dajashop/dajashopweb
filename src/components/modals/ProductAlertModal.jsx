import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import {
  productAlertSubscriptions,
  productAlertsApi,
  novostiApi,
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
  initialPhone = '',
  authenticated = false,
  onSubscribed,
}) {
  const { policy } = useConsent();
  const [deliveryChannel, setDeliveryChannel] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [managementToken, setManagementToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [useAnotherEmail, setUseAnotherEmail] = useState(false);
  const [subscribeToEmailMarketing, setSubscribeToEmailMarketing] = useState(false);
  const [subscribeToSmsMarketing, setSubscribeToSmsMarketing] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !product?.id || !product?.variantId || !type) return undefined;
    const storedContact = authenticated ? {} : productAlertSubscriptions.contact();
    const token = storedContact.managementToken || '';
    setDeliveryChannel('email');
    setEmail(String(initialEmail || '').trim());
    setPhone(String(initialPhone || '').trim());
    setManagementToken(token);
    setMaskedEmail(storedContact.maskedEmail || '');
    setUseAnotherEmail(false);
    setSubscribeToEmailMarketing(false);
    setSubscribeToSmsMarketing(false);
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
        setNewsletterSubscribed(status?.newsletterSubscribed === true);
        if (status?.maskedEmail) setMaskedEmail(status.maskedEmail);
      })
      .catch(() => {
        // The alert form remains available when the optional status lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, initialEmail, initialPhone, isOpen, product?.id, product?.variantId, type]);

  if (!isOpen || !product?.id || !product?.variantId || !type) return null;

  const isEmailChannel = deliveryChannel === 'email';
  const reusableGuestEmail = isEmailChannel && !authenticated && managementToken && !useAnotherEmail;
  const needsEmailInput = isEmailChannel && (authenticated || !reusableGuestEmail);
  const selectedEmail = String(email || '').trim();
  const selectedPhone = String(phone || '').trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (needsEmailInput && !selectedEmail) {
      setError('Unesite email adresu za obaveštenje.');
      return;
    }
    if (!isEmailChannel && !/^\+[1-9]\d{7,14}$/.test(selectedPhone.replace(/[\s()-]/g, ''))) {
      setError('Unesite broj telefona u međunarodnom formatu, npr. +381601234567.');
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
          deliveryChannel,
          ...(isEmailChannel
            ? (authenticated
              ? {}
              : (reusableGuestEmail ? { managementToken } : { email: selectedEmail }))
            : { phone: selectedPhone }),
          acceptedSmsMarketing: !isEmailChannel && subscribeToSmsMarketing,
          ...(policy?.version ? { policyVersion: policy.version } : {}),
        },
        { auth: authenticated },
      );

      let newsletterWarning = false;
      if (isEmailChannel && !newsletterSubscribed && subscribeToEmailMarketing) {
        try {
          await novostiApi.subscribe(
            reusableGuestEmail ? undefined : selectedEmail,
            {
              source: 'product_alert',
              acceptedMarketing: true,
              authenticated,
              ...(reusableGuestEmail ? { managementToken } : {}),
              ...(policy?.version ? { policyVersion: policy.version } : {}),
            },
          );
        } catch (newsletterError) {
          if (newsletterError?.status !== 409) newsletterWarning = true;
        }
      }

      onSubscribed?.({
        type,
        deliveryChannel,
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
          <fieldset className="product-alert-modal__channels">
            <legend>Način obaveštavanja</legend>
            <label>
              <input
                type="radio"
                name="product-alert-channel"
                value="email"
                checked={isEmailChannel}
                onChange={() => setDeliveryChannel('email')}
                disabled={submitting}
              />
              Email
            </label>
            <label>
              <input
                type="radio"
                name="product-alert-channel"
                value="sms"
                checked={!isEmailChannel}
                onChange={() => setDeliveryChannel('sms')}
                disabled={submitting}
              />
              SMS
            </label>
          </fieldset>

          {isEmailChannel && reusableGuestEmail ? (
            <div className="product-alert-modal__saved-contact">
              <strong>Email za obaveštenje</strong>
              <span>{maskedEmail || 'Sačuvana email adresa'}</span>
              <button type="button" onClick={() => setUseAnotherEmail(true)} disabled={submitting}>
                Koristi drugi email
              </button>
            </div>
          ) : isEmailChannel ? (
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
          ) : (
            <>
              <label htmlFor="product-alert-subscription-phone">Broj telefona</label>
              <input
                id="product-alert-subscription-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+381601234567"
                autoComplete="tel"
                inputMode="tel"
                required
                disabled={submitting}
                autoFocus
              />
            </>
          )}

          <p className="product-alert-modal__privacy-note">
            Potvrdom tražite ovo obaveštenje putem {isEmailChannel ? 'emaila' : 'SMS-a'}. Kontakt
            koristimo samo za tu svrhu; detalji su u <a href="/privacy">politici privatnosti</a>.
          </p>

          {isEmailChannel && !newsletterSubscribed && (
            <label className="product-alert-modal__check">
              <input
                type="checkbox"
                checked={subscribeToEmailMarketing}
                onChange={(event) => setSubscribeToEmailMarketing(event.target.checked)}
                disabled={submitting}
              />
              <span>Želim da dobijam novosti, ponude i savete putem emaila.</span>
            </label>
          )}

          {!isEmailChannel && (
            <label className="product-alert-modal__check">
              <input
                type="checkbox"
                checked={subscribeToSmsMarketing}
                onChange={(event) => setSubscribeToSmsMarketing(event.target.checked)}
                disabled={submitting}
              />
              <span>Želim da dobijam novosti i ponude putem SMS-a.</span>
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
