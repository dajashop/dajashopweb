import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
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

  useLayoutEffect(() => {
    if (!isOpen || !product?.id || !product?.variantId || !type) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const overlay = dialog.parentElement;
    const content = dialog.querySelector('.product-alert-modal__content');
    const viewport = window.visualViewport;
    let restingHeight = viewport?.height ?? window.innerHeight;
    let restingWidth = window.innerWidth;
    let panelHeight = 0;
    let keyboardOpen = false;
    let frame;
    const measureRestingPanel = () => {
      // Only opening/orientation changes may change the frame geometry.
      dialog.style.height = '';
      dialog.style.maxHeight = `${Math.max(1, restingHeight - 16)}px`;
      dialog.classList.remove('is-keyboard-open', 'is-height-constrained');
      dialog.classList.toggle('is-height-constrained', content.scrollHeight > restingHeight - 16);
      panelHeight = dialog.offsetHeight;
      dialog.style.height = `${panelHeight}px`;
      dialog.style.setProperty('--resting-panel-height', `${panelHeight}px`);
      overlay.style.setProperty('--modal-gap', `${Math.max(8, (restingHeight - panelHeight) / 2)}px`);
      overlay.style.height = `${restingHeight}px`;
    };
    const updateContent = () => {
      const height = viewport?.height ?? window.innerHeight;
      const active = document.activeElement;
      const editing = dialog.contains(active) && active.matches('input[type="email"], input[type="tel"]');
      if (Math.abs(window.innerWidth - restingWidth) > 1) {
        restingWidth = window.innerWidth;
        restingHeight = height;
        keyboardOpen = false;
        measureRestingPanel();
      }
      const wasOpen = keyboardOpen;
      keyboardOpen = restingHeight - height > (wasOpen ? 20 : 100) && (editing || wasOpen);
      // Never write the overlay top, panel height, or top gap during keyboard animation.
      const viewportBottom = (viewport?.offsetTop ?? 0) + height;
      const available = Math.min(panelHeight, Math.max(0, viewportBottom - dialog.getBoundingClientRect().top - 8));
      dialog.style.setProperty('--keyboard-content-height', `${keyboardOpen ? available : panelHeight}px`);
      dialog.classList.toggle('is-keyboard-open', keyboardOpen);
      if (wasOpen && !keyboardOpen) content.scrollTop = 0;
      if (!keyboardOpen || !editing) return;
      const field = active.getBoundingClientRect();
      const area = content.getBoundingClientRect();
      const note = content.querySelector('.product-alert-modal__footnote').getBoundingClientRect();
      const target = note.bottom - field.top + 20 <= content.clientHeight ? note.bottom : field.bottom;
      const delta = target - area.bottom + 8;
      if (delta > 0) content.scrollTop += delta;
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateContent);
    };
    measureRestingPanel();
    updateContent();
    dialog.addEventListener('focusin', scheduleUpdate);
    dialog.addEventListener('focusout', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('scroll', scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener('focusin', scheduleUpdate);
      dialog.removeEventListener('focusout', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('scroll', scheduleUpdate);
    };
  }, [isOpen, product?.id, product?.variantId, type]);

  const closeFromKeyboard = useEffectEvent(() => {
    if (!submitting) onClose();
  });

  useLayoutEffect(() => {
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

        <div className="product-alert-modal__body">
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
        <form id="product-alert-subscription-form" onSubmit={handleSubmit}>
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
        </form>
        <div className="product-alert-modal__footer">
          <button type="submit" form="product-alert-subscription-form" disabled={submitting || !notificationChannelAvailable(deliveryChannel)}>
            {submitting ? <LoaderCircle size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}
            {translateText(submitting ? 'Čuvamo…' : 'Uključi obaveštenje')}
          </button>
          <p className="product-alert-modal__footnote"><Check size={14} aria-hidden="true" />{translateText('Novosti i ponude su opcione. Vi birate šta primate.')}</p>
        </div>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
