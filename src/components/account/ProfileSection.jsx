// src/components/account/ProfileSection.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import { motion, AnimatePresence } from 'framer-motion';
import './ProfileSection.css';
import {
  User,
  Plus,
  Edit2,
  Loader2,
  Heart,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Save,
  ShieldCheck,
  Camera,
  CheckCircle2,
} from 'lucide-react';

import { customerApi, mediaApi } from '../../services/dajaPlatform';

import {
  COUNTRY_CODES,
  getFlagUrl,
  getInitials,
} from '../../utils/accountHelpers.jsx';
import PhoneCountryPicker from '../ui/PhoneCountryPicker.jsx';

// Ovo mora biti izvučeno iz ErrorMessage.jsx
import ErrorMessage from '../ui/ErrorMessage.jsx';

function ProfileSection({ user }) {
  const { flash } = useFlash();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.displayName || '');

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState('input');
  const [newPhone, setNewPhone] = useState(user.phoneNumber || '');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [localPhone, setLocalPhone] = useState('');

  const fileInputRef = useRef(null);

  const [verificationId, setVerificationId] = useState(null);
  const [smsCode, setSmsCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNewName(user.displayName || '');
    if (user.phoneNumber) {
      const foundCountry = COUNTRY_CODES.find((c) =>
        user.phoneNumber.startsWith(c.dial)
      );
      if (foundCountry) {
        setSelectedCountry(foundCountry);
        setLocalPhone(user.phoneNumber.replace(foundCountry.dial, ''));
      } else {
        setLocalPhone(user.phoneNumber);
      }
    } else {
      setLocalPhone('');
    }
  }, [user]);

  // --- E-MAIL VERIFIKACIJA HANDLER ---
  const handleSendVerification = async () => {
    setLoading(true);
    try {
      const response = await customerApi.requestEmailVerification();
      flash(
        'Uspeh',
        response?.status === 'already_verified'
          ? 'Ova email adresa je već verifikovana.'
          : 'Verifikacioni link je poslat na vaš email i važi 15 minuta.',
        'info',
      );
    } catch (error) {
      console.error(error);
      flash('Greška', 'Greška pri slanju linka. Pokušajte ponovo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      flash('Greška', 'Slika je prevelika (max 5MB).', 'error');
      return;
    }

    setLoading(true);
    try {
      const uploaded = await mediaApi.uploadProductImageFile('avatars', file, Date.now());
      const downloadUrl = uploaded.url || uploaded.original || uploaded.mainImageUrl;
      await customerApi.updateProfile({ photoURL: downloadUrl });

      flash('Uspeh', 'Profilna slika ažurirana.', 'success');
    } catch (error) {
      console.error(error);
      flash('Greška', 'Nismo uspeli da otpremimo sliku.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      flash('Greška', 'Ime ne može biti prazno.', 'error');
      return;
    }
    setLoading(true);
    try {
      await customerApi.updateProfile({ displayName: newName });
      flash('Uspeh', 'Ime je ažurirano.', 'success');
      setIsEditingName(false);
    } catch (error) {
      console.error(error);
      flash('Greška', 'Greška pri ažuriranju.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    const fullNumber = selectedCountry.dial + localPhone.replace(/^0+/, '');
    if (localPhone.length < 5) {
      flash('Greška', 'Unesite ispravan broj telefona.', 'error');
      return;
    }
    setLoading(true);
    try {
      await customerApi.requestPhoneLinkOtp(fullNumber);
      setVerificationId(fullNumber);
      setPhoneStep('verify');
      flash('SMS Poslat', `Kod poslat na ${fullNumber}`, 'info');
    } catch (error) {
      console.error(error);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      flash(
        'Greška',
        error.code === 'auth/invalid-phone-number'
          ? 'Nevažeći broj.'
          : 'Greška pri slanju SMS-a.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (smsCode.length < 6) {
      flash('Greška', 'Kod mora imati 6 cifara.', 'error');
      return;
    }
    setLoading(true);
    try {
      const fullNumber = selectedCountry.dial + localPhone.replace(/^0+/, '');
      await customerApi.verifyPhoneLinkOtp(fullNumber, smsCode);
      flash('Uspeh', 'Broj telefona povezan!', 'success');
      setIsEditingPhone(false);
      setPhoneStep('input');
      setSmsCode('');
      setVerificationId(null);
    } catch (error) {
      console.error(error);
      flash('Greška', 'Pogrešan kod.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelPhoneEdit = () => {
    setIsEditingPhone(false);
    setPhoneStep('input');
    setSmsCode('');
    setIsCountryDropdownOpen(false);
    if (user.phoneNumber) {
      const foundCountry = COUNTRY_CODES.find((c) =>
        user.phoneNumber.startsWith(c.dial)
      );
      if (foundCountry) {
        setSelectedCountry(foundCountry);
        setLocalPhone(user.phoneNumber.replace(foundCountry.dial, ''));
      }
    } else {
      setLocalPhone('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="section-content"
    >
      <div id="recaptcha-phone-container"></div>

      <div className="profile-header card glass">
        <div className="profile-avatar relative group cursor-pointer overflow-hidden">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(user)
          )}

          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={24} className="text-white" />
          </div>
        </div>

        <div className="profile-info">
          {isEditingName ? (
            <div style={{ maxWidth: '300px' }}>
              <h2
                style={{
                  opacity: 0.5,
                  fontSize: '1rem',
                  marginBottom: '8px',
                  color: 'var(--color-text)',
                }}
              >
                Izmeni ime:
              </h2>
            </div>
          ) : (
            <h2>{user.displayName || 'Korisnik'}</h2>
          )}
          <p className="muted">{user.email}</p>
        </div>
      </div>

      {/* VERIFIKACIJA E-MAILA - Status kartica se renderuje samo ako NIJE verifikovan */}
      {user.email && !user.emailVerified && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="card glass p-4 flex items-center justify-between gap-4"
            style={{ overflow: 'hidden' }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-yellow-500" />
              <div>
                <p className="font-bold text-[var(--color-text)]">
                  Status E-maila
                </p>
                <p className="text-sm muted">
                  Vaša e-mail adresa nije verifikovana. Pošaljite verifikacioni
                  link.
                </p>
              </div>
            </div>
            <button
              className="btn-primary small whitespace-nowrap"
              onClick={handleSendVerification}
              disabled={loading}
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin text-white" size={16} />
              ) : (
                'Pošalji link'
              )}
            </button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* RANIJE POSTOJEĆE INFORMACIJE (Ime, Email, Telefon) */}
      <div className="info-grid">
        <div className="card glass info-card relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="info-label">Ime i prezime</div>
            {!isEditingName && (
              <button
                className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition p-1 rounded-md hover:bg-[var(--color-surface)]"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          <AnimatePresence mode="wait">
            {isEditingName ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-1"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900  focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all outline-none placeholder:text-gray-400"
                  autoFocus
                  placeholder="Vaše ime"
                />
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setNewName(user.displayName || '');
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text)] hover:opacity-80 transition"
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={loading}
                    className="text-xs font-bold px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-[var(--color-bg)] hover:opacity-90 transition flex items-center gap-1"
                  >
                    {loading ? (
                      <Loader2
                        size={12}
                        className="animate-spin text-[var(--color-bg)]"
                      />
                    ) : (
                      <>
                        <Save size={12} /> Sačuvaj
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="info-value mt-1 truncate"
              >
                {user.displayName || 'Nije uneto'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- KARTICA: EMAIL SA BADŽOM --- */}
        <div className="card glass info-card">
          <div className="flex justify-between items-start mb-1">
            <div className="info-label">Email adresa</div>
            {user.emailVerified ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold uppercase tracking-wider cursor-default select-none">
                <CheckCircle2 size={12} />
                <span>Verifikovan</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider cursor-default select-none">
                <AlertCircle size={12} />
                <span>Nije verif.</span>
              </div>
            )}
          </div>
          <div className="info-value mt-1 truncate" title={user.email}>
            {user.email}
          </div>
        </div>

        <div
          className="card glass info-card relative overflow-visible"
          data-lenis-prevent
        >
          <div className="flex justify-between items-start">
            <div className="info-label">Telefon</div>
            {user.phoneNumber ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold uppercase tracking-wider cursor-default select-none">
                <ShieldCheck size={12} />
                <span>Verifikovan</span>
              </div>
            ) : (
              !isEditingPhone && (
                <button
                  className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition p-1 rounded-md hover:bg-[var(--color-surface)]"
                  onClick={() => setIsEditingPhone(true)}
                >
                  <Plus size={14} />
                </button>
              )
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditingPhone ? (
              <motion.div
                key="editing-phone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-1"
              >
                {phoneStep === 'input' ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <PhoneCountryPicker
                        className="relative"
                        country={selectedCountry}
                        onSelect={setSelectedCountry}
                        renderTrigger={({ isOpen, toggle }) => (
                          <button
                            type="button"
                            onClick={toggle}
                            className="h-full min-w-[100px] justify-between rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 outline-none transition-colors hover:bg-gray-50 flex items-center gap-2"
                          >
                            <span className="flex items-center gap-2">
                              <img src={getFlagUrl(selectedCountry.code)} alt={selectedCountry.code} className="w-6 h-4 shrink-0 rounded-sm object-cover shadow-sm" />
                              <span className="text-xs font-bold text-gray-600">{selectedCountry.dial}</span>
                            </span>
                            <span className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                          </button>
                        )}
                      />

                      <div className="relative flex-1 min-w-0">
                        <input
                          type="tel"
                          value={localPhone}
                          onChange={(e) => setLocalPhone(e.target.value)}
                          className="w-full h-full bg-white border border-gray-200 rounded-lg pl-3 pr-3 py-2 text-gray-900 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all outline-none placeholder:text-gray-400"
                          placeholder="64 123 4567"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelPhoneEdit}
                        className="text-xs font-bold px-3 py-1.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text)] hover:opacity-80 transition"
                      >
                        Otkaži
                      </button>
                      <button
                        onClick={handleSendCode}
                        disabled={loading}
                        className="text-xs font-bold px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-[var(--color-bg)] hover:opacity-90 transition flex items-center gap-1"
                      >
                        {loading ? (
                          <Loader2
                            size={16}
                            className="animate-spin text-[var(--color-bg)]"
                          />
                        ) : (
                          'Pošalji kod'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                      Kod poslat na {selectedCountry.dial} {localPhone}
                    </p>
                    <div className="relative">
                      <MessageSquare
                        size={14}
                        className="absolute left-3 top-3 text-gray-400"
                      />
                      <input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-gray-900 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all outline-none placeholder:text-gray-400"
                        placeholder="123456"
                        autoFocus
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2 mt-1 justify-end">
                      <button
                        onClick={cancelPhoneEdit}
                        className="text-xs font-bold px-3 py-1.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text)] hover:opacity-80 transition"
                      >
                        Otkaži
                      </button>
                      <button
                        onClick={handleVerifyCode}
                        disabled={loading}
                        className="text-xs font-bold px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-500 transition flex items-center gap-1"
                      >
                        {loading ? (
                          <Loader2
                            className="animate-spin text-white"
                            size={16}
                          />
                        ) : (
                          'Potvrdi'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="view-phone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="info-value mt-1 truncate"
              >
                {user.phoneNumber || 'Nije uneto'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default ProfileSection;
