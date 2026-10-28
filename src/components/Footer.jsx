import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  Check,
  Unlock,
} from 'lucide-react';
import './Footer.css';
import SocialLinks from './SocialLinks.jsx';
import { useFlash } from '../hooks/useFlash';
import { novostiApi } from '../services/dajaPlatform';
import { useConsent } from '../context/ConsentContext.jsx';

export default function Footer() {
  const { t: translateText } = useStorefront();

  const year = new Date().getFullYear();
  const { flash } = useFlash();
  const { policy, openSettings } = useConsent();

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
      const subscription = await novostiApi.subscribe(email, {
        source: 'footer',
        policyVersion: policy?.version,
        acceptedMarketing: true,
      });

      if (subscription?.alreadySubscribed) {
        setSuccess(false);
        flash(
          'Već ste prijavljeni',
          'Ova email adresa je već prijavljena na DajaShop novosti.',
          'info',
        );
        return;
      }

      setSuccess(true);
      flash(
        'Uspeh',
        subscription?.requiresConfirmation
          ? 'Proverite email i potvrdite prijavu. Novosti ćete primati tek nakon potvrde. Proverite i spam folder.'
          : subscription?.imaPravoNaKodDobrodoslice
          ? 'Uspešno ste prijavljeni. Proverite inbox i spam folder za poruku dobrodošlice i kod dobrodošlice.'
          : subscription?.poslatMailDobrodoslice
            ? 'Uspešno ste prijavljeni. Proverite inbox i spam folder za poruku dobrodošlice.'
            : 'Uspešno ste prijavljeni na DajaShop novosti.',
        'success',
      );
      setEmail('');

      setTimeout(() => setSuccess(false), 3500);
    } catch (error) {
      console.error('Greška pri prijavi na novosti:', error);
      if (error?.status === 409) {
        flash(
          'Već ste prijavljeni',
          'Ova email adresa je već prijavljena na DajaShop novosti.',
          'info',
        );
      } else {
        flash(
          'Greška',
          error.message || 'Prijava na novosti nije uspela.',
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
      {/* Traka za prijavu na novosti. */}
      <div className="footer-newsletter-strip">
        <div className="container footer-newsletter-content">
          <div className="footer-newsletter-text">
            <h3>{translateText("Budite u toku")}</h3>
            <p>{translateText("Prijavite se za novitete, informacije o dostupnosti i savete o satovima.")}</p>
            <p>
              {translateText(' ')}{translateText("Pratite ono što je novo u našoj ponudi.")}</p>
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
                placeholder={translateText("Vaša email adresa...")}
                aria-label={translateText("Email adresa")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                required
              />
              <button
                type="submit"
                className="footer-submit-btn"
                aria-label={translateText("Prijavi me")}
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
                {translateText(loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : success ? (
                  <>
                    <Check size={18} />
                    <span className="btn-text">{translateText("Poslato")}</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    <span className="btn-text">{translateText("Prijavi me")}</span>
                  </>
                ))}
              </button>
            </div>
            <p className="footer-newsletter-consent-notice">{translateText("Klikom na „Prijavi me” saglasni ste da vam DajaShop šalje email obaveštenja o akcijama i ponudama. Više u ")}<Link to="/privacy">{translateText("Politici privatnosti")}</Link>.
            </p>
          </form>
        </div>
      </div>

      {/* === GLAVNI FUTER === */}
      <div className="footer__glass">
        <div className="container footer__content">
          <div className="footer__col brand-col">
            <Link to="/" className="footer__brand">{translateText("Daja Shop")}</Link>
            <p className="footer__desc">{translateText("Vaša pouzdana destinacija za originalne satove od 2007. Kvalitet, tradicija i stil na jednom mestu.")}</p>
            <SocialLinks className="footer__socials" />
          </div>

          <div className="footer__col">
            <h3 className="footer__title">{translateText("Istraži")}</h3>
            <nav className="footer__nav">
              <Link to="/muski-satovi">{translateText("Muški satovi")}</Link>
              <Link to="/zenski-satovi">{translateText("Ženski satovi")}</Link>
              <Link to="/about">{translateText("O nama")}</Link>
              <Link to="/usluge">{translateText("Usluge")}</Link>
              <Link to="/contact">{translateText("Kontakt")}</Link>
            </nav>
          </div>

          <div className="footer__col">
            <h3 className="footer__title">{translateText("Kontakt")}</h3>
            <ul className="footer__contact">
              <li>
                <Link
                  to="/contact"
                  className="footer__contact-link"
                  aria-label={translateText("Adresa")}
                >
                  <MapPin size={18} />
                  <span>{translateText("Niš, TPC Gorča lokal C31")}</span>
                </Link>
              </li>
              <li>
                <a
                  href="tel:+381641262425"
                  className="footer__contact-link"
                  aria-label={translateText("Telefonski broj")}
                >
                  <Phone size={18} />
                  <span>064/126-2425</span>
                </a>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="footer__contact-link"
                  aria-label={translateText("Email adresa")}
                >
                  <Mail size={18} />
                  <span>{translateText("cvelenis42@yahoo.com")}</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <h3 className="footer__title">{translateText("Radno vreme")}</h3>
            <ul className="footer__hours">
              <li>
                <span>{translateText("Pon – Pet:")}</span> 10:00 – 20:00
              </li>
              <li>
                <span>{translateText("Subota:")}</span> 10:00 – 15:00
              </li>
              <li>
                <span>{translateText("Nedelja:")}</span>{translateText(" Zatvoreno")}</li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="container footer__bottomWrap">
            <p>&copy; {translateText(year)}{translateText(" Daja Shop. Sva prava zadržana.")}</p>
            <div className="footer__links">
              <Link to="/terms">{translateText("Uslovi korišćenja")}</Link>
              <Link to="/privacy">{translateText("Politika privatnosti")}</Link>
              <Link to="/cookies">{translateText("Kolačići")}</Link>
              <button type="button" className="footer__privacy-button" onClick={openSettings}>{translateText("Podešavanja privatnosti")}</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
