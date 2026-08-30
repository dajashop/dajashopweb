import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn, LockKeyhole } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import desktopIllustration from '../assets/logout-door-desktop.svg';
import mobileIllustration from '../assets/logout-door-mobile.svg';
import './Logout.css';

export default function Logout() {
  const { user, showAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If the user signs in from this screen, return them to the storefront
    // instead of leaving a signed-in user on a completed-logout message.
    if (user) navigate('/', { replace: true });
  }, [navigate, user]);

  return (
    <section className="logout-page">
      <SEOHead title="Odjava" noIndex={true} />
      <div className="logout-page__waves" aria-hidden="true" />
      <div className="logout-page__dots logout-page__dots--left" aria-hidden="true" />
      <div className="logout-page__dots logout-page__dots--right" aria-hidden="true" />

      <div className="logout-page__content">
        <div className="logout-page__visual" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet={mobileIllustration} />
            <img src={desktopIllustration} alt="" />
          </picture>
        </div>

        <div className="logout-page__message">
          <p className="logout-page__eyebrow">
            <LockKeyhole size={14} strokeWidth={2.2} />
            Sesija je završena
          </p>
          <h1>Uspešno ste se odjavili</h1>
          <p className="logout-page__description">
            Hvala na poseti! <strong>Prijavite se ponovo</strong> da biste
            nastavili tamo gde ste stali.
          </p>
          <div className="logout-page__actions">
            <button type="button" className="logout-page__login" onClick={() => showAuth('login')}>
              <LogIn size={18} />
              Prijavi se
            </button>
            <Link to="/catalog" className="logout-page__guest">
              Nastavi u gost modu
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
