import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Loader2, ShoppingBag, X } from 'lucide-react';
import { authApi } from '../services/dajaPlatform';
import SEOHead from '../components/seo/SEOHead.jsx';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Proveravamo vaš verifikacioni link...');
  const verificationToken = searchParams.get('token');

  useEffect(() => {
    if (!verificationToken) {
      setStatus('error');
      setMessage('Verifikacioni link nije potpun. Zatražite novi iz svog naloga.');
      return;
    }

    authApi
      .verifyEmail(verificationToken)
      .then(() => {
        setStatus('success');
        setMessage('Vaša email adresa je uspešno potvrđena i nalog je spreman za kupovinu.');
      })
      .catch((error) => {
        console.error(error);
        setStatus('error');
        setMessage(
          error?.message ||
            'Link je neispravan, istekao je ili je već iskorišćen. Zatražite novi iz svog naloga.',
        );
      });
  }, [verificationToken]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <main className="relative isolate grid min-h-[72vh] place-items-center overflow-hidden bg-[#f7f7f4] px-5 py-16">
      <SEOHead title="Potvrda email adrese" noIndex={true} />
      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl" />

      <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-black/[0.07] bg-white px-7 py-9 text-center shadow-[0_24px_70px_rgba(20,24,20,0.13)] sm:px-12 sm:py-12">
        <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-black/[0.08] bg-black/[0.025] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-neutral-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          DajaShop nalog
        </div>

        <div
          className={`mx-auto mb-7 grid h-20 w-20 place-items-center rounded-full border transition-colors ${
            isLoading
              ? 'border-neutral-200 bg-neutral-50 text-neutral-700'
              : isSuccess
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : 'border-red-200 bg-red-50 text-red-500'
          }`}
        >
          {isLoading && <Loader2 size={34} className="animate-spin" />}
          {isSuccess && <Check size={39} strokeWidth={3} />}
          {status === 'error' && <X size={39} strokeWidth={3} />}
        </div>

        <h1 className="text-3xl font-black tracking-[-0.045em] text-neutral-950 sm:text-4xl">
          {isLoading
            ? 'Potvrda je u toku'
            : isSuccess
              ? 'Email je potvrđen'
              : 'Link više nije važeći'}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-neutral-600 sm:text-base">
          {message}
        </p>

        {!isLoading && (
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/catalog"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-6 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 sm:w-auto"
            >
              <ShoppingBag size={18} />
              U prodavnicu
              <ChevronRight size={17} />
            </Link>
            <Link
              to="/account/profile"
              className="inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-bold text-neutral-700 transition hover:bg-black/[0.04] sm:w-auto"
            >
              Moj nalog
            </Link>
          </div>
        )}

        {isSuccess && (
          <p className="mt-8 text-xs font-medium text-neutral-400">
            Srećna kupovina — dobro došli u DajaShop.
          </p>
        )}
      </section>
    </main>
  );
}
