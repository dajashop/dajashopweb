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
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);

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
    if (!acceptedMarketing) {
      setErrorMsg('Potvrdite da želite da primate novosti emailom.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      await newsletterApi.subscribe(email, {
        source: 'newsletter_modal',
        policyVersion: policy?.version,
        acceptedMarketing: true,
      });
      setStatus('success');
      writeStoredValue('dajashop_newsletter_seen', 'true', 'preferences');
      window.setTimeout(() => setIsVisible(false), 3500);
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
              disabled={status === 'success'}
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
                <button onClick={handleClose} className="newsletter-submit" style={{ backgroundColor: '#007bff' }}>
                  Zatvori
                </button>
              </div>
            )}

            {(status === 'idle' || status === 'loading' || status === 'error') && (
              <div className="newsletter-content">
                <h2>10% Popusta</h2>
                <p>Prijavite se na naš newsletter i ostvarite 10% popusta na prvu porudžbinu. Budite prvi koji saznaje za nove akcije.</p>
                <form className="newsletter-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder="Vaša email adresa"
                    className="newsletter-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={status === 'loading'}
                  />
                  <label className="newsletter-marketing-consent">
                    <input
                      type="checkbox"
                      checked={acceptedMarketing}
                      onChange={(event) => setAcceptedMarketing(event.target.checked)}
                      disabled={status === 'loading'}
                    />
                    <span>
                      Želim da primam novosti emailom i prihvatam{' '}
                      <a href="/privacy">politiku privatnosti</a>.
                    </span>
                  </label>
                  {(errorMsg || status === 'error') && (
                    <span className="newsletter-message error-message">
                      {errorMsg || 'Greška pri slanju. Pokušajte ponovo.'}
                    </span>
                  )}
                  <button type="submit" className="newsletter-submit" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Slanje...' : 'Preuzmi kod'}
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
