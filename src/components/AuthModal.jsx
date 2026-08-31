import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  Facebook,
  Smartphone,
  ShieldCheck,
  ArrowRightToLine,
  AlertCircle,
  ChevronDown,
  Check,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import './AuthModal.css';
import FlashModal from './modals/FlashModal.jsx';

const getFlagUrl = (code) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const COUNTRY_CODES = [
  { code: 'RS', dial: '+381', label: 'Srbija' },
  { code: 'ME', dial: '+382', label: 'Crna Gora' },
  { code: 'BA', dial: '+387', label: 'BiH' },
  { code: 'HR', dial: '+385', label: 'Hrvatska' },
  { code: 'MK', dial: '+389', label: 'S. Makedonija' },
  { code: 'SI', dial: '+386', label: 'Slovenija' },
  { code: 'DE', dial: '+49', label: 'Nemačka' },
  { code: 'AT', dial: '+43', label: 'Austrija' },
  { code: 'CH', dial: '+41', label: 'Švajcarska' },
];

const POPULAR_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'yahoo.co.uk',
];

const REGEX = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(\+|0)[0-9\s]{8,20}$/,
  passwordStrong: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
};

const LAST_LOGIN_STORAGE_KEY = 'daja_last_login';
const LAST_LOGIN_PROVIDERS = ['password', 'google', 'facebook', 'passkey'];

function readLastLogin() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LAST_LOGIN_STORAGE_KEY) || 'null');
    const email = String(saved?.email || '').trim().toLowerCase();
    if (!saved || !LAST_LOGIN_PROVIDERS.includes(saved.provider)) {
      return null;
    }
    if (saved.provider === 'password' && !REGEX.email.test(email)) return null;
    return { provider: saved.provider, ...(REGEX.email.test(email) ? { email } : {}) };
  } catch {
    return null;
  }
}

function saveLastLogin(provider, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!LAST_LOGIN_PROVIDERS.includes(provider)) return null;
  if (provider === 'password' && !REGEX.email.test(normalizedEmail)) return null;
  const value = {
    provider,
    ...(REGEX.email.test(normalizedEmail) ? { email: normalizedEmail } : {}),
  };
  try {
    window.localStorage.setItem(LAST_LOGIN_STORAGE_KEY, JSON.stringify(value));
    return value;
  } catch {
    return null;
  }
}

const ErrorMessage = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
    animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 6 }}
    exit={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
    transition={{ duration: 0.25, type: 'spring', bounce: 0.3 }}
    className="custom-error-popout"
  >
    <AlertCircle size={14} className="error-icon-pop" />
    <span>{message}</span>
  </motion.div>
);

export default function AuthModal() {
  const {
    user,
    authOpen,
    hideAuth,
    mode,
    setMode,
    login,
    register,
    confirmPhoneCode,
    oauth,
    oauthJustSucceeded,
    dismissOauthSuccess,
    pendingEmailVerify,
    detectIdentity,
    passkeyLogin,
    passkeyRegister,
  } = useAuth();

  const isLogin = mode === 'login';

  function go(next) {
    setMode(next);
  }

  // State
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [lastLogin, setLastLogin] = useState(readLastLogin);
  const [isSuggestedEmail, setIsSuggestedEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthWaking, setOauthWaking] = useState(false);
  const [oauthWakeupAttempt, setOauthWakeupAttempt] = useState(0);
  const [oauthProvider, setOauthProvider] = useState('');
  const [errors, setErrors] = useState({});
  const [submitCount, setSubmitCount] = useState(0);

  const [awaitPhoneCode, setAwaitPhoneCode] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [sentTo, setSentTo] = useState('');

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [prediction, setPrediction] = useState('');

  // Dropdown States & Refs
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const loginWrapperRef = useRef(null);
  const regWrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  const [flashOpen, setFlashOpen] = useState(false);
  const [flashTitle, setFlashTitle] = useState('');
  const [flashSub, setFlashSub] = useState('');

  const idType = useMemo(() => {
    if (/[a-zA-Z@]/.test(identity)) return 'email';
    if (/^(\+|[0-9]{2,})/.test(identity)) return 'phone';
    return 'email';
  }, [identity]);

  const currentCountry = useMemo(() => {
    if (idType !== 'phone') return null;
    const found = COUNTRY_CODES.find((c) => identity.startsWith(c.dial));
    if (found) return found;
    return COUNTRY_CODES.find((c) => c.code === 'RS');
  }, [identity, idType]);

  useEffect(() => {
    if (!authOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [authOpen]);

  useEffect(() => {
    const savedLogin = readLastLogin();
    const shouldSuggestEmail = Boolean(
      authOpen && mode === 'login' && savedLogin?.provider === 'password',
    );

    setLastLogin(savedLogin);
    setIdentity(shouldSuggestEmail ? savedLogin.email : '');
    setIsSuggestedEmail(shouldSuggestEmail);
    setPassword('');
    setName('');
    setShowPass(false);
    setSmsCode('');
    setAwaitPhoneCode(false);
    setSentTo('');
    setSuggestions([]);
    setShowSuggestions(false);
    setPrediction('');
    setErrors({});
    setSubmitCount(0);
    setIsCountryDropdownOpen(false);
    setOauthWaking(false);
    setOauthWakeupAttempt(0);
    setOauthProvider('');
  }, [authOpen, mode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inLogin =
        loginWrapperRef.current &&
        loginWrapperRef.current.contains(event.target);
      const inReg =
        regWrapperRef.current && regWrapperRef.current.contains(event.target);

      if (!inLogin && !inReg) {
        setShowSuggestions(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isPhone = idType === 'phone';
  const showPassword = !isPhone;

  // --- HANDLERS ---

  const handleCountrySelect = (country) => {
    let raw = identity.replace(/\s/g, '');
    let localPart = raw;

    if (currentCountry && raw.startsWith(currentCountry.dial)) {
      localPart = raw.substring(currentCountry.dial.length);
    } else if (raw.startsWith('0')) {
      localPart = raw.substring(1);
    }

    localPart = localPart.replace(/^0+/, '');

    // Formiramo novi string
    const newValue = `${country.dial} ${localPart}`;
    setIdentity(newValue);

    setIsCountryDropdownOpen(false);
    setErrors((prev) => ({ ...prev, identity: null }));

    const activeRef = isLogin ? loginWrapperRef : regWrapperRef;
    const inputEl = activeRef.current?.querySelector('input');

    if (inputEl) {
      setTimeout(() => {
        inputEl.focus();
        // --- FIX: Pomeri kursor na KRAJ teksta ---
        const len = newValue.length;
        inputEl.setSelectionRange(len, len);
      }, 10);
    }
  };

  const handleIdentityChange = (e) => {
    let val = e.target.value;
    setIsSuggestedEmail(false);

    if (/[a-zA-Z@]/.test(val)) {
      const detectedPrefix = COUNTRY_CODES.find((c) => val.startsWith(c.dial));
      if (detectedPrefix) {
        let stripped = val.replace(detectedPrefix.dial, '').trim();
        val = '0' + stripped;
      }
    } else {
      if (/^06/.test(val)) {
        val = '+381 ' + val.substring(1);
      } else if (/^[1-9][0-9]+/.test(val) && !val.startsWith('+')) {
        val = '+381 ' + val;
      }
    }

    setIdentity(val);
    setPrediction('');
    if (errors.identity) setErrors((prev) => ({ ...prev, identity: null }));

    const isPhoneStart = /^(\+?[\d]{2,})/.test(val) && !/[a-zA-Z@]/.test(val);

    if (isPhoneStart) {
      setShowSuggestions(false);
      return;
    }

    if (val.includes('@')) {
      const [prefix, suffix] = val.split('@');
      if (suffix === undefined || suffix === '') {
        const list = POPULAR_DOMAINS.map((d) => `${prefix}@${d}`);
        setSuggestions(list);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        const match = POPULAR_DOMAINS.find((d) => d.startsWith(suffix));
        if (match) setPrediction(match.slice(suffix.length));
      }
    } else {
      if (val.length > 1) {
        const list = POPULAR_DOMAINS.map((d) => `${val}@${d}`);
        setSuggestions(list);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const validateField = (fieldName, value) => {
    const cleanVal = value ? value.trim() : '';
    switch (fieldName) {
      case 'identity':
        if (!cleanVal) return 'Unesite email ili broj telefona.';
        const cleanIdentity = cleanVal.replace(/\s/g, '');
        if (isPhone) {
          if (!REGEX.phone.test(cleanIdentity))
            return 'Neispravan format telefona.';
        } else {
          if (!REGEX.email.test(cleanIdentity))
            return 'Neispravan format email-a.';
        }
        return null;
      case 'name':
        if (!isLogin) {
          if (!cleanVal) return 'Ovo polje je obavezno.';
          if (cleanVal.length < 2) return 'Ime mora imati bar 2 slova.';
        }
        return null;
      case 'password':
        if (isLogin) {
          if (!isPhone && !cleanVal) return 'Unesite lozinku.';
        } else {
          if (!isPhone && !REGEX.passwordStrong.test(cleanVal))
            return 'Min. 8 karaktera, 1 veliko slovo i 1 broj.';
        }
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (e) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget)) {
      return;
    }

    const { name, value } = e.target;
    let valToValidate = value;

    if (name === 'identity') {
      if (prediction) {
        valToValidate = value + prediction;
        setIdentity(valToValidate);
        setPrediction('');
      }
      if (isPhone) return;
    }

    const error = validateField(name, valToValidate);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
  };

  const handleNameChange = (e) => {
    const val = e.target.value.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
    setName(val);
    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && prediction) {
      e.preventDefault();
      setIdentity(identity + prediction);
      setPrediction('');
    }
  };

  const handleSuggestedEmailFocus = (e) => {
    if (!isSuggestedEmail) return;
    window.requestAnimationFrame(() => e.currentTarget.select());
    setIsSuggestedEmail(false);
  };

  const selectSuggestion = (val) => {
    setIdentity(val);
    setShowSuggestions(false);
    setPrediction('');
    if (errors.identity) setErrors((prev) => ({ ...prev, identity: null }));
  };

  const validateForm = () => {
    const identityErr = validateField('identity', identity);
    const nameErr = validateField('name', name);
    const passErr = validateField('password', password);
    const newErrors = {};
    if (identityErr) newErrors.identity = identityErr;
    if (nameErr && !isLogin) newErrors.name = nameErr;
    if (passErr && showPassword) newErrors.password = passErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  function openFlash(msg, sub = '') {
    setFlashTitle(msg);
    setFlashSub(sub);
    setFlashOpen(true);
  }

  useEffect(() => {
    if (!oauthJustSucceeded || !user?.email) return;

    const savedLogin = saveLastLogin('google', user.email);
    if (savedLogin) setLastLogin(savedLogin);

    openFlash('Google prijava uspešna', 'Uspešno ste prijavljeni putem Google naloga.');
    dismissOauthSuccess();
  }, [oauthJustSucceeded, user?.email, dismissOauthSuccess]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      setSubmitCount((prev) => prev + 1);
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const r = await login({ identity, password });
        if (r === 'phone-code') {
          setAwaitPhoneCode(true);
          setSentTo(identity);
        } else {
          const savedLogin = saveLastLogin('password', r?.email || identity);
          if (savedLogin) setLastLogin(savedLogin);
          hideAuth();
          openFlash('Prijava uspešna', 'Dobro došli nazad! ⌚');
        }
      } else {
        const r = await register({ identity, password, name });
        if (r === 'phone-code') {
          setAwaitPhoneCode(true);
          setSentTo(identity);
        } else if (pendingEmailVerify) {
        } else {
          hideAuth();
          openFlash('Registracija uspešna', 'Srećna kupovina! 🛍️');
        }
      }
    } catch (err) {
      console.error(err);
      setSubmitCount((prev) => prev + 1);
      const newErrors = {};
      if (
        err.code === 'auth/invalid-credential' ||
        err.message.includes('invalid-credential')
      )
        newErrors.password = 'Pogrešni podaci za prijavu.';
      else if (err.code === 'auth/email-already-in-use')
        newErrors.identity = 'Ovaj email je već registrovan.';
      else if (err.code === 'auth/user-not-found')
        newErrors.identity = 'Korisnik nije pronađen.';
      else alert(err.message || 'Došlo je do greške.');
      setErrors(newErrors);
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmPhoneCode(smsCode);
      hideAuth();
      openFlash(
        isLogin ? 'Prijava uspešna' : 'Registracija uspešna',
        'Broj telefona verifikovan ✅'
      );
    } catch (err) {
      alert('Nevažeći kod.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOauth(provider) {
    try {
      if (isLogin) {
        const savedLogin = saveLastLogin(
          provider,
          lastLogin?.provider === provider ? lastLogin.email : undefined,
        );
        if (savedLogin) setLastLogin(savedLogin);
      }
      setLoading(true);
      setOauthProvider(provider);
      setOauthWakeupAttempt(1);
      setOauthWaking(true);
      await oauth(provider, ({ attempt }) => setOauthWakeupAttempt(attempt));
    } catch (err) {
      alert(err?.message || 'Greška pri OAuth prijavi.');
    } finally {
      setLoading(false);
      setOauthWaking(false);
      setOauthWakeupAttempt(0);
      setOauthProvider('');
    }
  }

  async function handlePasskey() {
    setLoading(true);
    try {
      if (isLogin) {
        const savedLogin = saveLastLogin('passkey');
        if (savedLogin) setLastLogin(savedLogin);
        await passkeyLogin();
        hideAuth();
        openFlash('Uspeh', 'Prijavljeni ste putem Passkey-a! 🔑');
      } else {
        // Za registraciju nam treba ime. Ako je polje prazno, tražimo ga.
        if (!name && idType !== 'username') {
          alert('Molimo unesite ime pre kreiranja Passkey-a.');
          setLoading(false);
          return;
        }
        await passkeyRegister({ name, identity }); // Kreira nalog i passkey
        hideAuth();
        openFlash('Uspeh', 'Passkey kreiran! 🛡️');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <FlashModal
        open={flashOpen}
        title={flashTitle}
        subtitle={flashSub}
        onClose={() => setFlashOpen(false)}
        duration={2000}
      />

      <AnimatePresence>
        {authOpen && (
          <motion.div
            className="auth-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-lenis-prevent
          >
            <motion.div
              className="auth-card glass"
              role="dialog"
              aria-modal="true"
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              data-lenis-prevent
            >
              <button
                className="icon-btn close"
                onClick={hideAuth}
                aria-label="Zatvori"
                disabled={oauthWaking}
              >
                <X size={20} />
              </button>

              <AnimatePresence>
                {oauthWaking && (
                  <motion.div
                    className="oauth-wakeup"
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="oauth-wakeup-spinner" aria-hidden="true" />
                    <h2>
                      Pripremamo {oauthProvider === 'google' ? 'Google' : 'Facebook'} prijavu
                    </h2>
                    <p>
                      DajaShop bezbedno uspostavlja vezu. Samo trenutak, zatim
                      nastavljate na prijavu.
                    </p>
                    {oauthWakeupAttempt > 1 && (
                      <span>Server se pokreće, molimo sačekajte…</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="tabs">
                <motion.button
                  className={`tab ${isLogin ? 'active' : ''}`}
                  onClick={() => go('login')}
                  whileTap={{ scale: 0.96 }}
                >
                  <span className="tab-label">Prijava</span>
                  {isLogin && (
                    <motion.span
                      layoutId="tabPill"
                      className="tab-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 700,
                        damping: 40,
                      }}
                    />
                  )}
                </motion.button>
                <motion.button
                  className={`tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => go('register')}
                  whileTap={{ scale: 0.96 }}
                  transition={{
                    type: 'spring',
                    stiffness: 800,

                    damping: 35,

                    mass: 0.35,
                  }}
                >
                  <span className="tab-label">Registracija</span>
                  {!isLogin && (
                    <motion.span
                      layoutId="tabPill"
                      className="tab-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 700,
                        damping: 40,
                      }}
                    />
                  )}
                </motion.button>
              </div>

              <div className="form-slider">
                <motion.div
                  className="track"
                  animate={{ x: isLogin ? '0%' : '-100%' }}
                  transition={{
                    type: 'spring',
                    stiffness: 520,
                    damping: 38,
                    bounce: 0.25,
                  }}
                >
                  {[true, false].map((loginPane) => (
                    <div
                      key={loginPane ? 'log' : 'reg'}
                      className={`pane ${
                        isLogin === loginPane ? 'active' : 'inactive'
                      }`}
                      aria-hidden={isLogin !== loginPane}
                    >
                      <div className="pane-inner">
                        {!awaitPhoneCode &&
                        (!pendingEmailVerify || loginPane) ? (
                          <form className="form" onSubmit={onSubmit} noValidate>
                            {!loginPane && (
                              <label className="field">
                                <span>Ime i prezime</span>
                                <div
                                  className={`input ${
                                    errors.name ? 'input-error' : ''
                                  }`}
                                >
                                  <User className="ico" size={18} />
                                  <input
                                    name="name"
                                    type="text"
                                    placeholder="npr. Marko Marković"
                                    value={name}
                                    onChange={handleNameChange}
                                    onBlur={handleBlur}
                                    required
                                  />
                                </div>
                                <AnimatePresence mode="wait">
                                  {errors.name && (
                                    <ErrorMessage
                                      key={`nm-${submitCount}`}
                                      message={errors.name}
                                    />
                                  )}
                                </AnimatePresence>
                              </label>
                            )}

                            <label
                              className="field"
                              ref={loginPane ? loginWrapperRef : regWrapperRef}
                            >
                              <span>
                                Email ili telefon
                                {loginPane && lastLogin?.provider === 'password' && (
                                  <small className="last-used-field-note">
                                    Poslednje korišćeno
                                  </small>
                                )}
                              </span>
                              <div
                                className={`input ghost-container ${
                                  errors.identity ? 'input-error' : ''
                                }`}
                              >
                                <div
                                  className="ghost-overlay"
                                  style={{
                                    paddingLeft: isPhone ? '90px' : '42px',
                                  }}
                                >
                                  <span className="invisible-text">
                                    {identity}
                                  </span>
                                  <span className="prediction-text">
                                    {prediction}
                                  </span>
                                  {prediction && (
                                    <span className="tab-hint-inline">
                                      <ArrowRightToLine size={10} /> Tab
                                    </span>
                                  )}
                                </div>

                                {isPhone && currentCountry ? (
                                  <div
                                    className="flag-trigger-wrapper"
                                    ref={dropdownRef}
                                  >
                                    <button
                                      type="button"
                                      className="flag-btn"
                                      onClick={() =>
                                        setIsCountryDropdownOpen(
                                          !isCountryDropdownOpen
                                        )
                                      }
                                    >
                                      <img
                                        src={getFlagUrl(currentCountry.code)}
                                        alt={currentCountry.code}
                                        className="w-5 h-auto rounded-[2px]"
                                      />
                                      <ChevronDown
                                        size={12}
                                        className={`transition-transform ${
                                          isCountryDropdownOpen
                                            ? 'rotate-180'
                                            : ''
                                        }`}
                                      />
                                    </button>

                                    <AnimatePresence>
                                      {isCountryDropdownOpen && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 5 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: 5 }}
                                          className="flag-dropdown country-dropdown-scroll"
                                          data-lenis-prevent
                                        >
                                          {COUNTRY_CODES.map((country) => (
                                            <button
                                              key={country.code}
                                              type="button"
                                              className="flag-item"
                                              onClick={() =>
                                                handleCountrySelect(country)
                                              }
                                            >
                                              <img
                                                src={getFlagUrl(country.code)}
                                                alt={country.code}
                                                className="w-5"
                                              />
                                              <div className="flag-text">
                                                <span className="font-bold text-gray-900">
                                                  {country.label}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {country.dial}
                                                </span>
                                              </div>
                                              {currentCountry.code ===
                                                country.code && (
                                                <Check
                                                  size={14}
                                                  className="text-green-600 ml-auto"
                                                />
                                              )}
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ) : (
                                  <Mail className="ico" size={18} />
                                )}

                                <input
                                  name="identity"
                                  type="text"
                                  placeholder="Email ili Broj telefona"
                                  value={identity}
                                  onChange={handleIdentityChange}
                                  onKeyDown={handleKeyDown}
                                  onFocus={handleSuggestedEmailFocus}
                                  onBlur={handleBlur}
                                  required
                                  autoComplete="username"
                                  className="real-input"
                                  style={{
                                    paddingLeft: isPhone ? '55px' : '0',
                                  }}
                                />
                              </div>
                              <AnimatePresence mode="wait">
                                {errors.identity && (
                                  <ErrorMessage
                                    key={`id-${submitCount}`}
                                    message={errors.identity}
                                  />
                                )}
                              </AnimatePresence>
                              <AnimatePresence>
                                {showSuggestions && (
                                  <motion.ul
                                    className="auth-dropdown"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    data-lenis-prevent
                                  >
                                    {suggestions.map((s) => (
                                      <li
                                        key={s}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectSuggestion(s);
                                        }}
                                      >
                                        {s.split('@')[0]}
                                        <span className="domain">
                                          @{s.split('@')[1]}
                                        </span>
                                      </li>
                                    ))}
                                  </motion.ul>
                                )}
                              </AnimatePresence>
                            </label>

                            {showPassword && (
                              <label className="field">
                                <span>Lozinka</span>
                                <div
                                  className={`input ${
                                    errors.password ? 'input-error' : ''
                                  }`}
                                >
                                  <Lock className="ico" size={18} />
                                  <input
                                    name="password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    onBlur={handleBlur}
                                    required
                                    minLength={6}
                                    autoComplete={
                                      loginPane
                                        ? 'current-password'
                                        : 'new-password'
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => setShowPass((p) => !p)}
                                  >
                                    {showPass ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </button>
                                </div>
                                <AnimatePresence mode="wait">
                                  {errors.password ? (
                                    <ErrorMessage
                                      key={`ps-${submitCount}`}
                                      message={errors.password}
                                    />
                                  ) : (
                                    !loginPane && (
                                      <div
                                        style={{
                                          fontSize: '11px',
                                          marginTop: '4px',
                                          color: 'var(--color-muted)',
                                          lineHeight: '1.3',
                                        }}
                                      >
                                        Min 8 karaktera, 1 veliko slovo, 1 broj
                                      </div>
                                    )
                                  )}
                                </AnimatePresence>
                              </label>
                            )}
                            <motion.button
                              className="btn-primary w-full"
                              disabled={loading}
                              whileTap={{ scale: 0.97 }}
                            >
                              {loading
                                ? loginPane
                                  ? 'Prijavljivanje...'
                                  : 'Kreiranje naloga...'
                                : loginPane
                                ? 'Prijavi se'
                                : 'Napravi nalog'}
                            </motion.button>
                            <div className="oauth-row">
                              <button
                                type="button"
                                className={`btn-oauth ${
                                  loginPane && lastLogin?.provider === 'google'
                                    ? 'btn-oauth--last-used'
                                    : ''
                                }`}
                                onClick={() => handleOauth('google')}
                                disabled={loading}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="18"
                                  height="18"
                                  aria-hidden="true"
                                >
                                  <path
                                    fill="#EA4335"
                                    d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.6C16.9 3.1 14.7 2 12 2 6.9 2 3 5.9 3 11s3.9 9 9 9c5.2 0 8.6-3.7 8.6-8.9 0-.6-.1-1-.1-1.4H12z"
                                  />
                                </svg>
                                <span>Google</span>
                                {loginPane && lastLogin?.provider === 'google' && (
                                  <small className="last-used-badge">
                                    Poslednje korišćeno
                                  </small>
                                )}
                              </button>
                              <button
                                type="button"
                                className={`btn-oauth ${
                                  loginPane && lastLogin?.provider === 'facebook'
                                    ? 'btn-oauth--last-used'
                                    : ''
                                }`}
                                onClick={() => handleOauth('facebook')}
                                disabled={loading}
                              >
                                <Facebook size={18} />
                                <span>Facebook</span>
                                {loginPane && lastLogin?.provider === 'facebook' && (
                                  <small className="last-used-badge">
                                    Poslednje korišćeno
                                  </small>
                                )}
                              </button>
                              <button
                                type="button"
                                className={`btn-oauth ${
                                  loginPane && lastLogin?.provider === 'passkey'
                                    ? 'btn-oauth--last-used'
                                    : ''
                                }`}
                                onClick={handlePasskey}
                                disabled={loading}
                                style={{
                                  width: '100%',
                                  justifyContent: 'center',
                                  gap: '10px',
                                }}
                              >
                                <Fingerprint
                                  size={20}
                                  className="text-primary"
                                />
                                <span>
                                  {isLogin
                                    ? 'Prijavi se Passkey-om'
                                    : 'Registruj se Passkey-om'}
                                </span>
                                {loginPane && lastLogin?.provider === 'passkey' && (
                                  <small className="last-used-badge">
                                    Poslednje korišćeno
                                  </small>
                                )}
                              </button>
                            </div>
                          </form>
                        ) : pendingEmailVerify && !loginPane ? (
                          <div className="verify-box">
                            <h3>Proveri email 📬</h3>
                            <p>Poslali smo link za verifikaciju.</p>
                          </div>
                        ) : (
                          <form className="form" onSubmit={onConfirmCode}>
                            <div className="verify-box">
                              Na broj {sentTo || 'telefona'} poslali smo SMS
                              kod.
                            </div>
                            <label className="field">
                              <span>SMS kod</span>
                              <div className="input">
                                <ShieldCheck className="ico" size={18} />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="123456"
                                  value={smsCode}
                                  onChange={(e) => setSmsCode(e.target.value)}
                                  required
                                  minLength={6}
                                  maxLength={6}
                                />
                              </div>
                            </label>
                            <motion.button
                              className="btn-primary w-full"
                              disabled={loading}
                              whileTap={{ scale: 0.97 }}
                            >
                              Potvrdi kod
                            </motion.button>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
              <div id="recaptcha-container" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
