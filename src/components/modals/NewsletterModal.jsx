import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import './NewsletterModal.css';
import { newsletterApi } from '../../services/dajaPlatform';
import { useConsent } from '../../context/ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../../services/consentStorage.js';

export default function NewsletterModal() {
  const { preferencesAllowed, policy } = useConsent();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!preferencesAllowed) {
      setIsVisible(false);
      return undefined;
    }
    if (readStoredValue('dajashop_newsletter_seen', 'preferences')) return undefined;
    const timer = window.setTimeout(() => setIsVisible(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [preferencesAllowed]);

  const handleClose = () => {
    setIsVisible(false);
    writeStoredValue('dajashop_newsletter_seen', 'true', 'preferences');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Molimo unesite validnu email adresu.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await newsletterApi.subscribe(email, {
        source: 'newsletter_corner_popup',
        policyVersion: policy?.version,
        acceptedMarketing: true,
      });
      setStatus('success');
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
            className="newsletter-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button
              className="newsletter-close-btn"
              onClick={handleClose}
              aria-label="Zatvori"
            >
              <X size={24} />
            </button>

            {status === 'success' && (
              <div className="newsletter-success">
                <div className="success-icon"><Check size={32} /></div>
                <h2>Uspešno!</h2>
                <p>Uspešno ste prijavljeni. Proverite inbox i spam folder za poruku dobrodošlice i kod za popust.</p>
              </div>
            )}

            {status === 'duplicate' && (
              <div className="newsletter-error duplicate">
                <div className="success-icon"><Check size={32} /></div>
                <h2>Već ste prijavljeni!</h2>
                <p>Ova email adresa je već prijavljena na naš newsletter.</p>
              </div>
            )}

            {(status === 'idle' || status === 'loading' || status === 'error') && (
              <div className="newsletter-content">
                <h2>10% Popusta</h2>
                <p>Prijavite se za 10% popusta na prvu porudžbinu. Kod stiže na email — proverite Inbox i Spam.</p>
                <form className="newsletter-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder="Vaša email adresa"
                    className="newsletter-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={status === 'loading'}
                  />
                  <p className="newsletter-consent-notice">
                    Klikom na „Prijavi me” saglasni ste da vam DajaShop šalje email obaveštenja o akcijama i ponudama. Više u <a href="/privacy">Politici privatnosti</a>.
                  </p>
                  {(errorMsg || status === 'error') && (
                    <span className="newsletter-message error-message">
                      {errorMsg || 'Greška pri slanju. Pokušajte ponovo.'}
                    </span>
                  )}
                  <button type="submit" className="newsletter-submit" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Slanje...' : 'Prijavi me'}
                  </button>
                </form>
                <p className="newsletter-disclaimer">Odjava je moguća u bilo kom trenutku.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
