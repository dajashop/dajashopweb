import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Loader2, ShoppingBag, X } from 'lucide-react';
import { authApi } from '../services/dajaPlatform';
import SEOHead from '../components/seo/SEOHead.jsx';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Proveravamo verifikacioni link...');
  const verificationToken = searchParams.get('token');

  useEffect(() => {
    if (!verificationToken) {
      setStatus('error');
      setMessage('Link nije potpun. Novi link možete zatražiti iz svog naloga.');
      return;
    }

    authApi
      .verifyEmail(verificationToken)
      .then(() => {
        setStatus('success');
        setMessage('Vaša email adresa je potvrđena. Srećna kupovina!');
      })
      .catch((error) => {
        console.error(error);
        setStatus('error');
        setMessage(
          'Ovaj link više ne može da se koristi. Možda je već otvoren ili je istekao.',
        );
      });
  }, [verificationToken]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <main className="verify-email-page">
      <SEOHead title="Potvrda email adrese" noIndex={true} />
      <section className="verify-email-card" aria-live="polite">
        <div
          className={`verify-email-icon verify-email-icon--${status}`}
          aria-hidden="true"
        >
          {isLoading && <Loader2 size={31} className="animate-spin" />}
          {isSuccess && <Check size={36} strokeWidth={2.8} />}
          {status === 'error' && <X size={36} strokeWidth={2.8} />}
        </div>

        <p className="verify-email-kicker">DAJASHOP NALOG</p>
        <h1>
          {isLoading
            ? 'Potvrda je u toku'
            : isSuccess
              ? 'Email je potvrđen'
              : 'Link nije dostupan'}
        </h1>
        <p className="verify-email-message">{message}</p>

        {!isLoading && (
          <div className="verify-email-actions">
            <Link to="/catalog" className="verify-email-primary">
              <ShoppingBag size={18} />
              U prodavnicu
              <ChevronRight size={17} />
            </Link>
            <Link to="/account/profile" className="verify-email-secondary">
              Moj nalog
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
