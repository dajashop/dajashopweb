import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellRing, Check, Image as ImageIcon, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import {
  productAlertSubscriptions,
  productAlertsApi,
  novostiApi,
} from '../../services/dajaPlatform.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import './ProductAlertModal.css';
import NotificationChannelPicker, { notificationChannelAvailable, notificationChannelNotice } from '../NotificationChannelPicker.jsx';

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
  const dialogRef = useRef(null);
  const { t: translateText, localizePath, money } = useStorefront();

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
      .catch((requestError) => {
        if (!cancelled && !authenticated && [400, 422].includes(requestError?.status)) {
          productAlertSubscriptions.clearContact();
          setManagementToken('');
          setMaskedEmail('');
          setUseAnotherEmail(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, initialEmail, initialPhone, isOpen, product?.id, product?.variantId, type]);

  useEffect(() => {
    if (!isOpen || !product?.id || !product?.variantId || !type) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const overlay = dialog.parentElement;
    const content = dialog.querySelector('.product-alert-modal__content');
    const viewport = window.visualViewport;
    let restingHeight = viewport?.height ?? window.innerHeight;
    let keyboardOpen = false;
    let settleTimer;
    let viewportFrame;
    const alignViewport = () => {
      // Safari may pan its visual viewport independently of the locked document.
      overlay.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    const revealFocusedField = () => {
      const active = document.activeElement;
      if (!keyboardOpen || !dialog.contains(active) || !active.matches('input[type="email"], input[type="tel"]')) return;
      const bounds = active.getBoundingClientRect();
      const panel = dialog.getBoundingClientRect();
      const visibleTop = Math.max(panel.top, viewport?.offsetTop ?? 0) + 18;
      const visibleBottom = Math.min(panel.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)) - 18;
      const formBottom = content.querySelector('form').getBoundingClientRect().bottom;
      // Show the email and confirmation together whenever they fit in the visible panel.
      const targetBottom = formBottom - bounds.top <= visibleBottom - visibleTop ? formBottom : bounds.bottom;
      if (targetBottom > visibleBottom) {
        content.scrollTo({
          top: content.scrollTop + targetBottom - visibleBottom,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      }
    };
    const updateViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      const active = document.activeElement;
      const editing = dialog.contains(active) && active.matches('input[type="email"], input[type="tel"]');
      const nextKeyboardOpen = restingHeight - height > 100 && (editing || keyboardOpen);
      if (!nextKeyboardOpen) {
        if (!editing) restingHeight = height;
        dialog.classList.remove('is-keyboard-open');
        dialog.style.maxHeight = `${Math.max(1, restingHeight - 16)}px`;
        dialog.classList.remove('is-height-constrained');
        dialog.classList.toggle('is-height-constrained', content.scrollHeight > restingHeight - 16);
        overlay.style.setProperty('--modal-gap', `${Math.max(8, (restingHeight - dialog.offsetHeight) / 2)}px`);
        if (keyboardOpen) content.scrollTop = 0;
      } else {
        dialog.style.maxHeight = '';
        dialog.classList.add('is-keyboard-open');
      }
      keyboardOpen = nextKeyboardOpen;
      overlay.style.height = `${restingHeight}px`;
      alignViewport();
      const panelTop = dialog.getBoundingClientRect().top;
      const viewportBottom = (viewport?.offsetTop ?? 0) + height;
      dialog.style.setProperty('--keyboard-panel-height', `${Math.max(1, viewportBottom - panelTop - 8)}px`);
      clearTimeout(settleTimer);
      // Wait for Safari's keyboard animation and native focus scrolling to settle.
      if (keyboardOpen) settleTimer = setTimeout(revealFocusedField, 180);
    };
    const handleViewportScroll = () => {
      cancelAnimationFrame(viewportFrame);
      viewportFrame = requestAnimationFrame(alignViewport);
    };
    dialog.addEventListener('focusin', updateViewport);
    dialog.addEventListener('focusout', updateViewport);
    window.addEventListener('resize', updateViewport);
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', handleViewportScroll);
    updateViewport();
    return () => {
      clearTimeout(settleTimer);
      cancelAnimationFrame(viewportFrame);
      dialog.removeEventListener('focusin', updateViewport);
      dialog.removeEventListener('focusout', updateViewport);
      window.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', handleViewportScroll);
    };
  }, [isOpen, product?.id, product?.variantId, type]);

  const closeFromKeyboard = useEffectEvent(() => {
    if (!submitting) onClose();
  });

  useEffect(() => {
    if (!isOpen || !product?.id || !product?.variantId || !type) return undefined;
    const previousFocus = document.activeElement;
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    const body = document.body;
    const properties = ['position', 'top', 'left', 'width', 'overflow'];
    const previousStyles = properties.map((property) => [property, body.style[property]]);
    body.style.position = 'fixed';
    body.style.top = `-${scrollPosition.y}px`;
    body.style.left = `-${scrollPosition.x}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    dialogRef.current?.focus({ preventScroll: true });
    const handleKey = (event) => {
      if (event.key === 'Escape') closeFromKeyboard();
      if (event.key !== 'Tab') return;
      const elements = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      previousStyles.forEach(([property, value]) => { body.style[property] = value; });
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'instant' });
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [isOpen, product?.id, product?.variantId, type]);

  if (!isOpen || !product?.id || !product?.variantId || !type) return null;

  const firstImage = product.images?.[0];
  const productImage = (typeof firstImage === 'string' ? firstImage : firstImage?.url) || product.image || product.thumbnailUrl;
  const currentPrice = product.salePrice ?? product.price;
  const isEmailChannel = deliveryChannel === 'email';
  const reusableGuestEmail = isEmailChannel && !authenticated && managementToken && !useAnotherEmail;
  const needsEmailInput = isEmailChannel && (authenticated || !reusableGuestEmail);
  const selectedEmail = String(email || '').trim();
  const selectedPhone = String(phone || '').trim();
  const useAccountContact = authenticated && (!isEmailChannel || selectedEmail.toLowerCase() === String(initialEmail).trim().toLowerCase());
  const emailAlreadySubscribed = newsletterSubscribed && (!authenticated || useAccountContact);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!notificationChannelAvailable(deliveryChannel)) { setError(notificationChannelNotice(deliveryChannel)); return; }
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
            ? (useAccountContact
              ? {}
              : (reusableGuestEmail ? { managementToken } : { email: selectedEmail }))
            : { phone: selectedPhone }),
          acceptedSmsMarketing: !isEmailChannel && subscribeToSmsMarketing,
          ...(policy?.version ? { policyVersion: policy.version } : {}),
        },
        { auth: useAccountContact },
      );

      let newsletterWarning = false;
      if (isEmailChannel && !emailAlreadySubscribed && subscribeToEmailMarketing) {
        try {
          await novostiApi.subscribe(
            reusableGuestEmail ? undefined : selectedEmail,
            {
              source: 'product_alert',
              acceptedMarketing: true,
              authenticated: useAccountContact,
              ...(reusableGuestEmail ? { managementToken } : {}),
              ...(policy?.version ? { policyVersion: policy.version } : {}),
            },
          );
        } catch (newsletterError) {
          if (newsletterError?.status !== 409) newsletterWarning = true;
        }
      }

      onSubscribed?.({
        requiresConfirmation: result?.requiresConfirmation === true,
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-alert-modal-title"
        aria-describedby="product-alert-modal-description"
      >
        <button
          type="button"
          className="product-alert-modal__close"
          onClick={onClose}
          aria-label={translateText("Zatvori")}
          disabled={submitting}
        >
          <X size={20} />
        </button>

        <div className="product-alert-modal__content">
        <div className="product-alert-modal__hero">
        <header className="product-alert-modal__header">
          <div className="product-alert-modal__icon"><BellRing size={25} aria-hidden="true" /></div>
          <h2 id="product-alert-modal-title">{translateText(type === 'price_change' ? 'Pratite cenu bez proveravanja' : 'Saznajte kada se vrati na stanje')}</h2>
          <p id="product-alert-modal-description">{translateText(type === 'price_change' ? 'Mi pratimo cenu. Vama stiže obaveštenje čim se promeni.' : 'Javićemo vam čim ovaj proizvod ponovo bude dostupan.')}</p>
        </header>
          <div className="product-alert-modal__photo">
            <ImageIcon size={30} aria-hidden="true" />
            {productImage && <img src={productImage} alt={product.name || ''} onError={(event) => { event.currentTarget.hidden = true; }} />}
          </div>
        <div className="product-alert-modal__product">
          <div className="product-alert-modal__product-info">
            {product.brand && <span>{product.brand}</span>}
            <strong>{product.name}</strong>
            {Number.isFinite(currentPrice) && <span className="product-alert-modal__price">{money(currentPrice)} <small>{translateText('Trenutna cena')}</small></span>}
          </div>
        </div>
        </div>
        <form onSubmit={handleSubmit}>
          <NotificationChannelPicker variant="cards" value={deliveryChannel} onChange={(channel) => { setDeliveryChannel(channel); setError(''); }} disabled={submitting} />

          {isEmailChannel && reusableGuestEmail ? (
            <div className="product-alert-modal__saved-contact">
              <strong>{translateText("Email za obaveštenje")}</strong>
              <span>{translateText(maskedEmail || 'Sačuvana email adresa')}</span>
              <button type="button" onClick={() => setUseAnotherEmail(true)} disabled={submitting}>{translateText("Koristi drugi email")}</button>
            </div>
          ) : isEmailChannel ? (
            <>
              <label htmlFor="product-alert-subscription-email">{translateText("Email adresa")}</label>
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
                placeholder={translateText("vas@email.com")}
                autoComplete="email"
                required={needsEmailInput}
                disabled={submitting}
              />
            </>
          ) : (
            <>
              <label htmlFor="product-alert-subscription-phone">{translateText("Broj telefona")}</label>
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
              />
            </>
          )}

          <p className="product-alert-modal__privacy-note"><ShieldCheck size={17} aria-hidden="true" /><span>{translateText("Potvrdom tražite ovo obaveštenje putem ")}{translateText(isEmailChannel ? 'emaila' : deliveryChannel === 'whatsapp' ? 'WhatsApp-a' : 'SMS-a')}{translateText(". Kontakt koristimo samo za tu svrhu; detalji su u ")}<a href={localizePath('/privacy')}>{translateText("politici privatnosti")}</a>.</span>
          </p>

          {isEmailChannel && !emailAlreadySubscribed && (
            <label className="product-alert-modal__check">
              <input
                type="checkbox"
                checked={subscribeToEmailMarketing}
                onChange={(event) => setSubscribeToEmailMarketing(event.target.checked)}
                disabled={submitting}
              />
              <span>{translateText("Želim da dobijam novosti, ponude i savete putem emaila.")}</span>
            </label>
          )}

          {deliveryChannel === 'sms' && (
            <label className="product-alert-modal__check">
              <input
                type="checkbox"
                checked={subscribeToSmsMarketing}
                onChange={(event) => setSubscribeToSmsMarketing(event.target.checked)}
                disabled={submitting}
              />
              <span>{translateText("Želim da dobijam novosti i ponude putem SMS-a.")}</span>
            </label>
          )}

          {error && <p role="alert" className="product-alert-modal__error">{translateText(error)}</p>}
          <button type="submit" disabled={submitting || !notificationChannelAvailable(deliveryChannel)}>
            {submitting ? <LoaderCircle size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}
            {translateText(submitting ? 'Čuvamo…' : 'Uključi obaveštenje')}
          </button>
          <p className="product-alert-modal__footnote"><Check size={14} aria-hidden="true" />{translateText('Novosti i ponude su opcione. Vi birate šta primate.')}</p>
        </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
