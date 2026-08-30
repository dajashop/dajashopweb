import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Hourglass,
  Loader2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { authApi, customerApi } from '../services/dajaPlatform';
import { useAuth } from '../hooks/useAuth.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import successDesktop from '../assets/verify-success-desktop.svg';
import successMobile from '../assets/verify-success-mobile.svg';
import expiredDesktop from '../assets/verify-expired-desktop.svg';
import expiredMobile from '../assets/verify-expired-mobile.svg';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { user, showAuth } = useAuth();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Proveravamo verifikacioni link...');
  const [resendState, setResendState] = useState('idle');
  const verificationToken = searchParams.get('token');

  useEffect(() => {
    if (!verificationToken) {
      setStatus('error');
      setMessage('Link nije potpun. Zatražite novi link za verifikaciju.');
      return;
    }

    authApi
      .verifyEmail(verificationToken)
      .then(() => {
        setStatus('success');
        setMessage('Vaša email adresa je uspešno potvrđena. Srećna kupovina!');
      })
      .catch((error) => {
        console.error(error);
        setStatus('error');
        setMessage('Verifikacioni link više nije važeći. Možda je već otvoren ili je istekao.');
      });
  }, [verificationToken]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const illustration = isSuccess
    ? { desktop: successDesktop, mobile: successMobile }
    : { desktop: expiredDesktop, mobile: expiredMobile };

  async function requestNewLink() {
    if (!user) {
      showAuth('login');
      return;
    }
    setResendState('loading');
    try {
      const response = await customerApi.requestEmailVerification();
      setResendState(response?.status === 'already_verified' ? 'verified' : 'sent');
    } catch (error) {
      console.error(error);
      setResendState('failed');
    }
  }

  return (
    <section className={`verify-email-page verify-email-page--${status}`} aria-live="polite">
      <SEOHead title="Potvrda email adrese" noIndex={true} />
      <div className="verify-email-page__waves" aria-hidden="true" />
      <div className="verify-email-page__dots verify-email-page__dots--left" aria-hidden="true" />
      <div className="verify-email-page__dots verify-email-page__dots--right" aria-hidden="true" />

      <div className="verify-email-page__content">
        <div className="verify-email-page__visual" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet={illustration.mobile} />
            <img src={illustration.desktop} alt="" />
          </picture>
        </div>
        <div className="verify-email-page__message">
          {isLoading ? (
            <p className="verify-email-page__eyebrow"><Loader2 size={14} className="animate-spin" /> Proveravamo link</p>
          ) : isSuccess ? (
            <p className="verify-email-page__eyebrow verify-email-page__eyebrow--success"><CheckCircle2 size={14} /> Verifikacija uspešna</p>
          ) : (
            <p className="verify-email-page__eyebrow verify-email-page__eyebrow--error"><Hourglass size={14} /> Link je istekao</p>
          )}
          <h1>{isLoading ? 'Potvrda je u toku' : isSuccess ? 'Vaša email adresa je uspešno verifikovana!' : 'Verifikacioni link je istekao'}</h1>
          <p className="verify-email-page__description">{message}</p>

          {!isLoading && (
            <div className="verify-email-page__actions">
              {isSuccess ? (
                <Link to="/catalog" className="verify-email-page__primary"><ShoppingBag size={18} /> U prodavnicu <ArrowRight size={17} /></Link>
              ) : (
                <button type="button" className="verify-email-page__primary" onClick={requestNewLink} disabled={resendState === 'loading' || resendState === 'sent' || resendState === 'verified'}>
                  {resendState === 'loading' ? <Loader2 size={18} className="animate-spin" /> : resendState === 'sent' || resendState === 'verified' ? <CheckCircle2 size={18} /> : <RefreshCw size={18} />}
                  {resendState === 'sent' ? 'Link je poslat' : resendState === 'verified' ? 'Email je već potvrđen' : 'Pošalji novi link'}
                </button>
              )}
              <Link to="/" className="verify-email-page__secondary">{isSuccess ? 'Srećna kupovina' : 'Idi na početnu stranu'} <ArrowRight size={17} /></Link>
              {resendState === 'failed' && <p className="verify-email-page__notice">Slanje nije uspelo. Pokušajte ponovo za trenutak.</p>}
              {resendState === 'verified' && <p className="verify-email-page__notice">Vaša email adresa je već verifikovana.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
