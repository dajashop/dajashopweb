import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { seoConfig } from '../config/seo.js';
import brandLogo from '../assets/dajashop-logo.svg';
import {
  MapPin,
  Phone,
  Mail,
  FileText,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react';
import './Footer.css';
import SocialLinks from './SocialLinks.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { customerApi, novostiApi } from '../services/dajaPlatform';
import { useConsent } from '../context/ConsentContext.jsx';

export default function Footer() {
  const { t: translateText } = useStorefront();

  const year = new Date().getFullYear();
  const { openSettings } = useConsent();
  const { user } = useAuth();
  const [enteredEmail, setEnteredEmail] = useState(null);
  const [busy, setBusy] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState('');
  const accountEmail = user?.email || '';
  const email = enteredEmail ?? accountEmail;
  const emailVerified = subscription?.emailVerified ||
    (user?.emailVerified && subscription?.address.toLowerCase() === accountEmail.toLowerCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!e.currentTarget.elements.newsletterEmail.validity.valid) {
      setError('Unesite validnu email adresu.');
      return;
    }
    const address = email.trim();
    setBusy('subscribe');
    setError('');
    try {
      const result = await novostiApi.subscribe(address, {
        source: 'footer',
        acceptedMarketing: true,
        authenticated: accountEmail.toLowerCase() === address.toLowerCase(),
      });
      if (!result?.active) {
        setError('Prijava na novosti trenutno nije dostupna. Pokušajte ponovo.');
        return;
      }
      setSubscription({ ...result, address });
      setVerificationSent(false);
    } catch (requestError) {
      setError(requestError.message || 'Prijava na novosti nije uspela.');
    } finally {
      setBusy(null);
    }
  };

  const sendVerification = async () => {
    if (!subscription || busy) return;
    setBusy('verify');
    setError('');
    try {
      if (accountEmail.toLowerCase() === subscription.address.toLowerCase()) {
        const result = await customerApi.requestEmailVerification();
        if (result.status === 'already_verified') {
          setSubscription(current => ({ ...current, emailVerified: true }));
          return;
        }
      } else {
        await novostiApi.sendEmailVerification(subscription.address);
      }
      setVerificationSent(true);
    } catch (requestError) {
      setError(requestError.message || 'Slanje linka nije uspelo. Pokušajte ponovo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <footer className="footer">
      {/* Traka za prijavu na novosti. */}
      <div className="footer-newsletter-strip" id="novosti">
        <div className="container footer-newsletter-content">
          <div className="footer-newsletter-text">
            <h3>{translateText('Budite u toku')}</h3>
            <p>{translateText('Prijavite se za ekskluzivne ponude, novitete i savete o satovima.')}</p>
            <p className="footer-newsletter-offer"><strong>{translateText('10% na prvu porudžbinu')}</strong> {translateText('uz potvrđenu email adresu.')}</p>
          </div>

          <div className="footer-newsletter-form">
            {subscription ? (
              <div className="footer-newsletter-success">
                <div className="footer-newsletter-check" aria-hidden="true"><Check size={20} strokeWidth={2.8} /></div>
                <div>
                  <strong role="status">{translateText(subscription.alreadySubscribed ? 'Već ste prijavljeni na DajaShop novosti.' : 'Uspešno ste se prijavili na DajaShop novosti.')}</strong>
                  {!emailVerified ? (
                    <>
                      <p>{translateText('Još jedan korak do 10% na prvu porudžbinu. Potvrdite svoju email adresu.')}</p>
                      {verificationSent ? (
                        <p role="status">{translateText('Link za verifikaciju je zatražen. Proverite prijemno sanduče i neželjenu poštu.')}</p>
                      ) : (
                        <button type="button" className="footer-newsletter-action" disabled={Boolean(busy)} onClick={sendVerification}>
                          {translateText(busy === 'verify' ? 'Šaljemo link...' : 'Pošalji verifikacioni link')}
                        </button>
                      )}
                    </>
                  ) : subscription.kodDobrodoslice ? (
                    <p>{translateText('Email je potvrđen. Iskoristite 10% na prvu porudžbinu uz kod')} <b>{subscription.kodDobrodoslice}</b>.</p>
                  ) : <p>{translateText('Email adresa je potvrđena.')}</p>}
                  <button type="button" className="footer-newsletter-action footer-newsletter-action--secondary" disabled={Boolean(busy)} onClick={() => { setSubscription(null); setError(''); }}>
                    {translateText('Unesi drugu email adresu')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="footer-input-wrapper">
                  <Mail className="footer-input-icon" size={18} aria-hidden="true" />
                  <input
                    type="email"
                    name="newsletterEmail"
                    autoComplete="email"
                    placeholder={translateText('Vaša email adresa...')}
                    aria-label={translateText('Email adresa')}
                    aria-describedby="footer-newsletter-consent"
                    value={email}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => { if (enteredEmail === null) event.currentTarget.select(); }}
                    onChange={(event) => { setEnteredEmail(event.target.value); setError(''); }}
                    disabled={Boolean(busy)}
                    maxLength={254}
                    required
                  />
                  <button type="submit" className="footer-submit-btn" disabled={Boolean(busy)} aria-label={translateText('Prijavi me')}>
                    {busy === 'subscribe' ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                    <span className="btn-text">{translateText('Prijavi me')}</span>
                  </button>
                </div>
                <p id="footer-newsletter-consent" className="footer-newsletter-consent-notice">
                  {translateText('Klikom na „Prijavi me“ pristajete na novosti i ponude emailom. Možete se odjaviti iz svake poruke.')} <Link to="/privacy">{translateText('Politika privatnosti')}</Link>
                </p>
              </form>
            )}
            {error && <p className="footer-newsletter-error" role="alert">{translateText(error)}</p>}
          </div>
        </div>
      </div>

      {/* === GLAVNI FUTER === */}
      <div className="footer__glass">
        <div className="container footer__content">
          <div className="footer__col brand-col">
            <Link to="/" className="footer__brand">
              <img className="footer__brand-logo" src={brandLogo} alt="DajaShop" width="181" height="105" />
            </Link>
            <p className="footer__desc">{translateText("Vaša pouzdana destinacija za originalne satove od 2007. Kvalitet, tradicija i stil na jednom mestu.")}</p>
            <SocialLinks className="footer__socials" />
          </div>

          <div className="footer__col">
            <h3 className="footer__title">{translateText("Istraži")}</h3>
            <nav className="footer__nav">
              <Link to="/muski-satovi">{translateText("Muški satovi")}</Link>
              <Link to="/zenski-satovi">{translateText("Ženski satovi")}</Link>
              <Link to="/kolekcije-satova">{translateText("Brendovi i kolekcije")}</Link>
              <Link to="/about">{translateText("O nama")}</Link>
              <Link to="/usluge">{translateText("Usluge")}</Link>
            </nav>
          </div>

          <div className="footer__col">
            <h3 className="footer__title">{translateText("Kontakt")}</h3>
            <ul className="footer__contact">
              <li>
                <Link
                  to="/contact"
                  className="footer__contact-row"
                  aria-label={translateText("Adresa")}
                >
                  <MapPin size={18} />
                  <span>{translateText("Obrenovićeva bb, Podzemni prolaz, lokal C31, 18105 Niš")}</span>
                </Link>
              </li>
              <li>
                <a
                  href="tel:+381641262425"
                  className="footer__contact-row"
                  aria-label={translateText("Telefonski broj")}
                >
                  <Phone size={18} />
                  <span>064/126-2425</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${seoConfig.business.email}`}
                  className="footer__contact-row"
                  aria-label={translateText("Email adresa")}
                >
                  <Mail size={18} />
                  <span>{seoConfig.business.email}</span>
                </a>
              </li>
              <li className="footer__contact-row">
                <FileText size={18} aria-hidden="true" />
                <span>{translateText("PIB")}: 104852069</span>
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
              <Link to="/terms">{translateText("Uslovi kupovine i korišćenja")}</Link>
              <Link to="/withdrawal">{translateText("Obrazac za odustanak")}</Link>
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
