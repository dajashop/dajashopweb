import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import { usePasskey } from '../../hooks/usePasskey.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ShieldCheck,
  Save,
  Loader2,
  Fingerprint,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Check,
} from 'lucide-react';

import { customerApi } from '../../services/dajaPlatform';

// Google Icon (Inline SVG)
const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function SecuritySection({ user }) {
  const { flash } = useFlash();
  const [loading, setLoading] = useState(false);

  // --- PASSKEY HOOK ---
  const { registerPasskey, loading: pkLoading, error: pkError } = usePasskey();
  const { linkPasskey, refreshUser } = useAuth();
  const [isPasskeyEnabled, setIsPasskeyEnabled] = useState(false); // Idealno povući sa servera

  // State za Lozinku
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passForm, setPassForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Google Linked Status
  const hasPassword = Boolean(user?.hasPassword);
  const isGoogleLinked = Boolean(user?.googleLinked);

  // --- HANDLER ZA GOOGLE ---
  const handleGoogleLink = async () => {
    try {
      customerApi.linkOAuth('google');
      flash('Info', 'Preusmeravamo vas na Google povezivanje naloga.', 'info');
    } catch (err) {
      console.error(err);
      flash('Greska', err.message, 'error');
    }
  };

  // --- HANDLER ZA PASSKEY ---
  const handleAddPasskey = async () => {
    try {
      await linkPasskey(user.email);
      setIsPasskeyEnabled(true);
      flash('Uspeh', 'Passkey uspešno dodat!', 'success');
    } catch (error) {
      console.error(error);
      flash('Greška', 'Dodavanje Passkey-a nije uspelo.', 'error');
    }
  };

  // --- HANDLERS ZA LOZINKU ---
  const handlePassChange = (e) => {
    setPassForm({ ...passForm, [e.target.name]: e.target.value });
  };

  const onUpdatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new.length < 8) {
      flash('Greška', 'Lozinka mora imati bar 8 karaktera.', 'error');
      return;
    }
    if (passForm.new !== passForm.confirm) {
      flash('Greška', 'Nove lozinke se ne poklapaju.', 'error');
      return;
    }

    setLoading(true);
    try {
      await customerApi.updatePassword({
        currentPassword: hasPassword ? passForm.current : undefined,
        newPassword: passForm.new,
      });
      await refreshUser();

      flash(
        'Uspeh',
        hasPassword
          ? 'Lozinka je uspešno promenjena.'
          : 'Lozinka je dodata. Sada se možete prijaviti i emailom i lozinkom.',
        'success',
      );
      setIsEditingPassword(false);
      setPassForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error(error);
      if (
        error.status === 401 ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        flash('Greška', 'Trenutna lozinka nije tačna.', 'error');
      } else {
        flash('Greška', 'Došlo je do greške. Pokušajte ponovo.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="section-content"
    >
      <div className="section-header-row mb-6">
        <h3>Bezbednost i prijava</h3>
      </div>

      {/* GRID SISTEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* KARTICA 1: LOZINKA */}
        <div className="card glass flex flex-col h-full relative overflow-hidden">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Lock size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text)] m-0">
                    Lozinka
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    {hasPassword
                      ? 'Prijava emailom i lozinkom'
                      : 'Dodajte alternativni način prijave'}
                  </p>
                </div>
              </div>

              {!isEditingPassword && (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text)] transition shadow-sm"
                >
                  {hasPassword ? 'Promeni lozinku' : 'Dodaj lozinku'}
                </button>
              )}
            </div>

            <div className="flex-1">
              <AnimatePresence mode="wait">
                {!isEditingPassword ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                      {hasPassword
                        ? 'Koristite jaku lozinku koju ne koristite na drugim sajtovima. Preporučujemo kombinaciju slova, brojeva i simbola.'
                        : 'Prijavljeni ste preko Google naloga. Dodajte lozinku ako želite da se ubuduće prijavite i emailom, kada vam Google prijava nije praktična.'}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg w-fit">
                      <CheckCircle2 size={14} />
                      <span>{hasPassword ? 'Lozinka je aktivna' : 'Google prijava je aktivna'}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={onUpdatePassword}
                    className="flex flex-col gap-3 mt-2"
                  >
                    {hasPassword && (
                      <div className="input-group">
                        <input
                          type="password"
                          name="current"
                          placeholder="Trenutna lozinka"
                          value={passForm.current}
                          onChange={handlePassChange}
                          required
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[1rem] focus:border-[var(--color-primary)] outline-none text-[var(--color-text)]"
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <input
                        type="password"
                        name="new"
                        placeholder="Nova lozinka (min. 8)"
                        value={passForm.new}
                        onChange={handlePassChange}
                        required
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[1rem] focus:border-[var(--color-primary)] outline-none text-[var(--color-text)]"
                      />
                    </div>
                    <div className="input-group">
                      <input
                        type="password"
                        name="confirm"
                        placeholder="Potvrdite novu lozinku"
                        value={passForm.confirm}
                        onChange={handlePassChange}
                        required
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[1rem] focus:border-[var(--color-primary)] outline-none text-[var(--color-text)]"
                      />
                    </div>

                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPassword(false);
                          setPassForm({ current: '', new: '', confirm: '' });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--color-text)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)] transition"
                      >
                        Otkaži
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--color-bg)] bg-[var(--color-primary)] hover:opacity-90 transition flex items-center gap-2"
                      >
                        {loading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Sačuvaj
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* KARTICA 2: BIOMETRIJA / PASSKEY */}
        <div className="card glass flex flex-col h-full relative overflow-hidden">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text)] m-0">
                    Biometrija
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Passkeys & Touch ID
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isPasskeyEnabled ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                  Prijavite se bez lozinke koristeći otisak prsta, prepoznavanje
                  lica ili PIN uređaja. Brže i sigurnije od klasične lozinke.
                </p>
                {pkError && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2 items-center text-xs text-red-500">
                    <AlertTriangle size={14} /> {pkError}
                  </div>
                )}
              </div>

              <div>
                {isPasskeyEnabled ? (
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center gap-3">
                    <ShieldCheck
                      size={18}
                      className="text-purple-500 shrink-0"
                    />
                    <div className="text-xs">
                      <span className="block font-bold text-[var(--color-text)]">
                        Zaštićeno
                      </span>
                      <span className="text-[var(--color-muted)]">
                        Uređaj je registrovan.
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full py-2.5 rounded-lg border border-dashed border-[var(--color-border)] hover:border-purple-500 hover:bg-purple-500/5 text-[var(--color-muted)] hover:text-purple-500 transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                    onClick={handleAddPasskey}
                    disabled={pkLoading}
                  >
                    {pkLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <KeyRound size={16} />
                    )}
                    {pkLoading ? 'Dodavanje...' : 'Dodaj Passkey'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- KARTICA 3: GOOGLE NALOG (Full Width) --- */}
      <div className="card glass p-4 flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100">
            <GoogleIcon />
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-text)] text-sm mb-0.5">
              Google Nalog
            </h4>
            <p className="text-xs text-[var(--color-muted)]">
              {isGoogleLinked
                ? 'Google nalog je povezan za brzu prijavu jednim klikom.'
                : 'Povežite Google nalog za brzu prijavu jednim klikom.'}
            </p>
          </div>
        </div>

        {isGoogleLinked ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold border border-green-500/20">
            <Check size={14} />
            <span>Povezano</span>
          </div>
        ) : (
          <button
            onClick={handleGoogleLink}
            className="px-4 py-2 bg-white text-gray-800 text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50 transition shadow-sm whitespace-nowrap"
          >
            Poveži nalog
          </button>
        )}
      </div>

      {/* INFO: ACTIVE SESSIONS */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-[var(--color-text)] text-sm mb-1">
            Aktivne sesije
          </h5>
          <p className="text-xs text-[var(--color-muted)]">
            Trenutno ste prijavljeni na ovom uređaju. Ako primetite sumnjivu
            aktivnost, promenite lozinku odmah.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
