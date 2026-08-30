import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import './NewsletterModal.css';
import { newsletterApi } from '../../services/dajaPlatform';

export default function NewsletterModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error, duplicate
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Proverava da li je korisnik već uspešno prijavljen ili je već video modal
    const hasSeenNewsletter = localStorage.getItem('dajashop_newsletter_seen');

    if (!hasSeenNewsletter) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000); // Otvara modal nakon 10 sekundi ako nije viđen

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Beleži da je korisnik video modal (i ako nije prijavljen)
    localStorage.setItem('dajashop_newsletter_seen', 'true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Molimo unesite validnu email adresu.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      await newsletterApi.subscribe(email);
      setStatus('success');
      localStorage.setItem('dajashop_newsletter_seen', 'true');

      setTimeout(() => {
        setIsVisible(false);
      }, 3500);
    } catch (err) {
      if (err.status === 409) {
        setStatus('duplicate');
        return;
      }
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Došlo je do neočekivane greške na serveru.');

      // Ako ne želite da se modal zatvori pri grešci, uklonite timeout.
      // Trenutno ostavljamo da se zatvori samo kod uspeha.

      // *** UKLONIO SAM FALLBACK ZA DEMO: Bolje je da se modal ne zatvori lažno. ***
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
              disabled={status === 'success'} // Onemogući zatvaranje dok se prikazuje uspeh
            >
              <X size={24} />
            </button>

            {/* STANJE: USPEŠNA PRIJAVA */}
            {status === 'success' && (
              <div className="newsletter-success">
                <div className="success-icon">
                  <Check size={32} />
                </div>
                <h2>Uspešno!</h2>
                <p>
                  Poslali smo vam link za potvrdu. Proverite inbox i spam, pa
                  potvrdite email adresu da biste aktivirali newsletter i popust.
                </p>
              </div>
            )}

            {/* STANJE: DUPLIKAT EMAIL-a */}
            {status === 'duplicate' && (
              <div className="newsletter-error duplicate">
                <div className="success-icon">
                  <Check size={32} />
                </div>
                <h2>Već ste prijavljeni!</h2>
                <p>Ova email adresa je već prijavljena na naš newsletter.</p>
                <button
                  onClick={handleClose}
                  className="newsletter-submit"
                  style={{ backgroundColor: '#007bff' }}
                >
                  Zatvori
                </button>
              </div>
            )}

            {/* STANJE: IDLE / ERROR / LOADING */}
            {(status === 'idle' ||
              status === 'loading' ||
              status === 'error') && (
              <div className="newsletter-content">
                <h2>10% Popusta</h2>
                <p>
                  Prijavite se na naš newsletter i ostvarite 10% popusta na vašu
                  prvu porudžbinu. Budite prvi koji će saznati za nove akcije!
                </p>

                <form className="newsletter-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder="Vaša email adresa"
                    className="newsletter-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                  />
                  {/* Prikazuje grešku validacije ili grešku sa servera */}
                  {(errorMsg || status === 'error') && (
                    <span className="newsletter-message error-message">
                      {errorMsg || 'Greška pri slanju. Pokušajte ponovo.'}
                    </span>
                  )}

                  <button
                    type="submit"
                    className="newsletter-submit"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Slanje...' : 'Preuzmi kod'}
                  </button>
                </form>

                <p className="newsletter-disclaimer">
                  Ne brinite, ne šaljemo spam. Odjava je moguća u bilo kom
                  trenutku.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
