import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import './NewsletterModal.css';
import { novostiApi } from '../../services/dajaPlatform';
import { useConsent } from '../../context/ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../../services/consentStorage.js';

export default function NewsletterModal() {
  const { t: translateText, localizePath } = useStorefront();

  const { preferencesAllowed, policy } = useConsent();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const emailRef = useRef(null);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!preferencesAllowed) {
      setIsVisible(false);
      return undefined;
    }
    if (readStoredValue('dajashop_newsletter_seen', 'preferences')) return undefined;
    const timer = window.setTimeout(() => setIsVisible(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [preferencesAllowed]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    writeStoredValue('dajashop_newsletter_seen', 'true', 'preferences');
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && panel?.contains(document.activeElement)) {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // This is a non-modal corner dialog: Tab may leave it normally.
      // Do not pull focus back if the visitor already moved elsewhere.
      if ((panel?.contains(document.activeElement) || document.activeElement === document.body)
        && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isVisible, handleClose]);

  const announcement = {
    loading: 'Slanje...',
    confirmation: 'Otvorite poruku za potvrdu prijave. Novosti ćete primati tek kada potvrdite svoju email adresu. Proverite i spam folder.',
    'dobrodoslica-sa-kodom': 'Uspešno ste prijavljeni. Proverite inbox i spam folder za poruku dobrodošlice i kod dobrodošlice.',
    dobrodoslica: 'Proverite inbox i spam folder za poruku dobrodošlice.',
    success: 'Prijavljeni ste na DajaShop novosti. Uskoro ćete dobijati novitete i savete.',
    duplicate: 'Ova email adresa je već prijavljena na DajaShop novosti.',
  }[status] || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Molimo unesite validnu email adresu.');
      emailRef.current?.focus();
      return;
    }
    // Keep focus on a control that remains available during and after sending.
    if (panelRef.current?.contains(document.activeElement)) closeRef.current?.focus({ preventScroll: true });
    setStatus('loading');
    setErrorMsg('');
    try {
      const subscription = await novostiApi.subscribe(email, {
        source: 'prozor_novosti',
        policyVersion: policy?.version,
        acceptedMarketing: true,
      });
      if (subscription?.requiresConfirmation) {
        setStatus('confirmation');
      } else if (subscription?.alreadySubscribed) {
        setStatus('duplicate');
      } else {
        setStatus(
          subscription?.imaPravoNaKodDobrodoslice
            ? 'dobrodoslica-sa-kodom'
            : subscription?.poslatMailDobrodoslice
              ? 'dobrodoslica'
              : 'success',
        );
      }
    } catch (error) {
      if (error.status === 409) {
        setStatus('duplicate');
        return;
      }
      setStatus('error');
      setErrorMsg(error.message || 'Došlo je do neočekivane greške na serveru.');
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="newsletter-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            className="newsletter-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button
              ref={closeRef}
              type="button"
              className="newsletter-close-btn"
              onClick={handleClose}
              aria-label={translateText("Zatvori")}
            >
              <X size={24} />
            </button>
            <p className="newsletter-announcement" role="status" aria-live="polite" aria-atomic="true">{translateText(announcement)}</p>

            {status === 'dobrodoslica-sa-kodom' && (
              <div className="newsletter-success">
                <div className="success-icon"><Check size={32} /></div>
                <h2 id={titleId}>{translateText("Uspešno!")}</h2>
                <p>{translateText("Uspešno ste prijavljeni. Proverite inbox i spam folder za poruku dobrodošlice i kod dobrodošlice.")}</p>
              </div>
            )}

            {status === 'confirmation' && <div className="newsletter-success"><div className="success-icon"><Check size={32} /></div><h2 id={titleId}>{translateText("Proverite email")}</h2><p>{translateText("Otvorite poruku za potvrdu prijave. Novosti ćete primati tek kada potvrdite svoju email adresu. Proverite i spam folder.")}</p></div>}

            {status === 'dobrodoslica' && (
              <div className="newsletter-success">
                <div className="success-icon"><Check size={32} /></div>
                <h2 id={titleId}>{translateText("Dobro došli!")}</h2>
                <p>{translateText("Proverite inbox i spam folder za poruku dobrodošlice.")}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="newsletter-success">
                <div className="success-icon"><Check size={32} /></div>
                <h2 id={titleId}>{translateText("Uspešno!")}</h2>
                <p>{translateText("Prijavljeni ste na DajaShop novosti. Uskoro ćete dobijati novitete i savete.")}</p>
              </div>
            )}

            {status === 'duplicate' && (
              <div className="newsletter-error duplicate">
                <div className="success-icon"><Check size={32} /></div>
                <h2 id={titleId}>{translateText("Već ste prijavljeni!")}</h2>
                <p>{translateText("Ova email adresa je već prijavljena na DajaShop novosti.")}</p>
              </div>
            )}

            {(status === 'idle' || status === 'loading' || status === 'error') && (
              <div className="newsletter-content">
                <h2 id={titleId}>{translateText("Budite u toku")}</h2>
                <p>{translateText("Prijavite se na DajaShop novosti i primajte informacije o dostupnosti, novitetima i savetima o satovima.")}</p>
                <form className="newsletter-form" onSubmit={handleSubmit}>
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    aria-label={translateText("Vaša email adresa")}
                    aria-invalid={Boolean(errorMsg)}
                    aria-describedby={errorMsg ? errorId : undefined}
                    placeholder={translateText("Vaša email adresa")}
                    className="newsletter-input"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setErrorMsg(''); if (status === 'error') setStatus('idle'); }}
                    disabled={status === 'loading'}
                  />
                  <p className="newsletter-consent-notice">{translateText("Klikom na „Prijavi me” saglasni ste da vam DajaShop šalje email obaveštenja o akcijama i ponudama. Više u ")}<a href={localizePath('/privacy')}>{translateText("Politici privatnosti")}</a>.
                  </p>
                  {(errorMsg || status === 'error') && (
                    <span id={errorId} role="alert" className="newsletter-message error-message">
                      {translateText(errorMsg || 'Greška pri slanju. Pokušajte ponovo.')}
                    </span>
                  )}
                  <button type="submit" className="newsletter-submit" disabled={status === 'loading'}>
                    {translateText(status === 'loading' ? 'Slanje...' : 'Prijavi me')}
                  </button>
                </form>
                <p className="newsletter-disclaimer">{translateText("Odjava je moguća u bilo kom trenutku.")}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
