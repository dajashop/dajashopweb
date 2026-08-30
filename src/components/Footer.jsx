import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  Check,
  Unlock,
} from 'lucide-react';
import './Footer.css';
import { useFlash } from '../hooks/useFlash';
import { newsletterApi } from '../services/dajaPlatform';

export default function Footer() {
  const year = new Date().getFullYear();
  const { flash } = useFlash();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      flash('Greška', 'Molimo unesite validnu email adresu.', 'error');
      return;
    }

    setLoading(true);
    try {
      await newsletterApi.subscribe(email);

      setSuccess(true);
      flash(
        'Uspeh',
        'Poslali smo link za potvrdu. Proverite email i aktivirajte prijavu.',
        'success',
      );
      setEmail('');

      setTimeout(() => setSuccess(false), 3500);
    } catch (error) {
      console.error('Newsletter error:', error);
      if (error?.status === 409) {
        flash(
          'Već ste prijavljeni',
          'Ova email adresa je već na newsletter listi.',
          'info',
        );
      } else {
        flash(
          'Greška',
          error.message || 'Prijava na newsletter nije uspela.',
          'error',
        );
      }
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="footer">
      {/* === NEWSLETTER TRAKA (Preimenovane klase) === */}
      <div className="footer-newsletter-strip">
        <div className="container footer-newsletter-content">
          <div className="footer-newsletter-text">
            <h3>Budite u toku</h3>
            <p>
              Prijavite se za ekskluzivne ponude, novitete i savete o satovima.
            </p>
            <p>
              {' '}
              Kao gest dobrodošlice, za Vas smo pripremili{' '}
              <strong>10% popusta</strong> koji možete iskoristiti na prvu
              kupovinu.
            </p>
            <p></p>
          </div>

          <form className="footer-newsletter-form" onSubmit={handleSubmit}>
            <div
              className={`footer-input-wrapper ${
                success ? 'border-green-500' : ''
              }`}
            >
              <Mail className="footer-input-icon" size={18} />
              <input
                type="email"
                placeholder="Vaša email adresa..."
                aria-label="Email adresa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                required
              />
              <button
                type="submit"
                className="footer-submit-btn"
                aria-label="Prijavi se"
                disabled={loading || success}
                style={
                  success
                    ? {
                        backgroundColor: '#10b981',
                        color: '#fff',
                        borderColor: '#10b981',
                      }
                    : {}
                }
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : success ? (
                  <>
                    <Check size={18} />
                    <span className="btn-text">Poslato</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    <span className="btn-text">Prijavi se</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* === GLAVNI FUTER === */}
      <div className="footer__glass">
        <div className="container footer__content">
          <div className="footer__col brand-col">
            <Link to="/" className="footer__brand">
              Daja Shop
            </Link>
            <p className="footer__desc">
              Vaša pouzdana destinacija za originalne satove od 2007. Kvalitet,
              tradicija i stil na jednom mestu.
            </p>
            <div className="footer__socials">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div className="footer__col">
            <h3 className="footer__title">Istraži</h3>
            <nav className="footer__nav">
              <Link to="/catalog">Muški satovi</Link>
              <Link to="/catalog">Ženski satovi</Link>
              <Link to="/about">O nama</Link>
              <Link to="/contact">Kontakt</Link>
            </nav>
          </div>

          <div className="footer__col">
            <h3 className="footer__title">Kontakt</h3>
            <ul className="footer__contact">
              <li>
                <Link
                  to="/contact"
                  className="footer__contact-link"
                  aria-label="Adresa"
                >
                  <MapPin size={18} />
                  <span>Niš, TPC Gorča lokal C31</span>
                </Link>
              </li>
              <li>
                <a
                  href="tel:+381641262425"
                  className="footer__contact-link"
                  aria-label="Telefonski broj"
                >
                  <Phone size={18} />
                  <span>064/126-2425</span>
                </a>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="footer__contact-link"
                  aria-label="Email adresa"
                >
                  <Mail size={18} />
                  <span>cvelenis42@yahoo.com</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <h3 className="footer__title">Radno vreme</h3>
            <ul className="footer__hours">
              <li>
                <span>Pon – Pet:</span> 10:00 – 20:00
              </li>
              <li>
                <span>Subota:</span> 10:00 – 15:00
              </li>
              <li>
                <span>Nedelja:</span> Zatvoreno
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="container footer__bottomWrap">
            <p>&copy; {year} Daja Shop. Sva prava zadržana.</p>
            <div className="footer__links">
              <Link to="/terms">Uslovi korišćenja</Link>
              <Link to="/privacy">Politika privatnosti</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
