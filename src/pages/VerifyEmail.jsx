import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/dajaPlatform';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import SEOHead from '../components/seo/SEOHead.jsx';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { showAuth } = useAuth();

  // Stanja procesa: 'loading', 'success', 'error'
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState(
    'Proveravamo vaš verifikacioni link...',
  );

  const actionCode = searchParams.get('token');

  useEffect(() => {
    if (!actionCode) {
      setStatus('error');
      setMessage(
        'Verifikacioni kod nije pronađen. Proverite da li je link ispravan.',
      );
      return;
    }

    authApi.verifyEmail(actionCode)
      .then(() => {
        setStatus('success');
        setMessage(
          'Vaš email je uspešno potvrđen. Dobro došli u Daja Shop porodicu.',
        );
      })
      .catch((error) => {
        console.error(error);
        setStatus('error');
        if (error.code === 'auth/expired-action-code') {
          setMessage(
            'Verifikacioni link je istekao. Molimo vas, zatražite novi.',
          );
        } else if (error.code === 'auth/invalid-action-code') {
          setMessage('Verifikacioni link je neispravan ili je već iskorišćen.');
        } else {
          setMessage(
            'Došlo je do greške prilikom verifikacije. Pokušajte ponovo.',
          );
        }
      });
  }, [actionCode]);

  // Animacija kartice
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', duration: 0.6, bounce: 0.3 },
    },
  };

  return (
    <div className="grid place-items-center min-h-[60vh] p-5">
      <SEOHead title="Verifikacija email-a" noIndex={true} />
      <motion.div
        className="w-full max-w-lg p-8 md:p-12 text-center rounded-3xl relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-2xl"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* LOADING STANJE */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2
              size={48}
              className="animate-spin text-[var(--color-primary)] mb-2"
            />
            <h1 className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
              Verifikacija u toku
            </h1>
            <p className="text-lg text-[var(--color-muted)] leading-relaxed">
              {message}
            </p>
          </div>
        )}

        {/* SUCCESS STANJE */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 size={64} className="text-emerald-500 mb-2" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
              Email potvrđen!
            </h1>
            <p className="text-lg text-[var(--color-muted)] leading-relaxed max-w-md mx-auto">
              {message}
            </p>

            <div className="mt-6 w-full flex justify-center">
              <button
                onClick={() => showAuth('login')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-[var(--color-primary)]/20"
              >
                Prijavi se sada <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ERROR STANJE */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <XCircle size={64} className="text-red-500 mb-2" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
              Verifikacija neuspešna
            </h1>
            <p className="text-lg text-[var(--color-muted)] leading-relaxed max-w-md mx-auto">
              {message}
            </p>

            <div className="mt-6 w-full flex justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-black/5 transition-all duration-200"
              >
                Nazad na početnu
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
