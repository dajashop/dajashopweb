import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import { newsletterApi } from '../services/dajaPlatform.js';

export default function NewsletterConfirmation() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Potvrdjujemo vasu prijavu na newsletter...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Verifikacioni link nije ispravan.');
      return;
    }

    newsletterApi
      .confirm(token)
      .then(() => {
        setStatus('success');
        setMessage('Email je potvrdjen. Dobrodosli u DajaShop newsletter!');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error?.message || 'Link je nevazeci ili je istekao.');
      });
  }, [searchParams]);

  return (
    <main className="grid min-h-[60vh] place-items-center p-5">
      <SEOHead title="Potvrda newsletter prijave" noIndex={true} />
      <section className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl md:p-12">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto mb-5 animate-spin text-[var(--color-primary)]" />
            <h1 className="text-3xl font-extrabold">Potvrda je u toku</h1>
          </>
        )}
        {status === 'success' && (
          <CheckCircle2 size={56} className="mx-auto mb-5 text-emerald-500" />
        )}
        {status === 'error' && <XCircle size={56} className="mx-auto mb-5 text-red-500" />}

        {status !== 'loading' && (
          <h1 className="text-3xl font-extrabold">
            {status === 'success' ? 'Newsletter je aktiviran' : 'Potvrda nije uspela'}
          </h1>
        )}
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">{message}</p>
        {status !== 'loading' && (
          <Link
            to="/"
            className="mt-7 inline-flex rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white"
          >
            Nazad na pocetnu
          </Link>
        )}
      </section>
    </main>
  );
}
