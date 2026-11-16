import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User,
  Mail,
  ArrowRightToLine,
  MapPin,
  Loader2,
  ChevronDown,
  Check,
  Phone,
  Plus,
} from 'lucide-react';
import ErrorMessage from './ErrorMessage';

import { customerApi } from '../../services/dajaPlatform';
import { loadGoogleMapsPlaces } from '../../services/googleMaps';
import {
  addressPredictionLabel,
  addressPredictionPrimaryText,
  addressPredictionSecondaryText,
  useAddressAutocomplete,
} from '../../hooks/useAddressAutocomplete.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { getFlagUrl } from '../../utils/flags.js';
import { PHONE_COUNTRIES as COUNTRY_CODES } from '../../data/phoneCountries.js';
import PhoneCountryPicker from '../ui/PhoneCountryPicker.jsx';
import { ADDRESS_ICONS } from '../../utils/accountHelpers';

const POPULAR_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'yahoo.co.uk',
];

export default function DeliveryForm({
  formData,
  setFormData,
  errors,
  handleChange,
  handleBlur,
  user,
  getInputClass,
  requiredForCourier,
  section = "contact",
}) {
  const { t: translateText, language } = useStorefront();

  const reduceMotion = useReducedMotion();
  const countryNames = useMemo(() => new Intl.DisplayNames([language === 'en' ? 'en' : 'sr-Latn'], { type: 'region' }), [language]);
  const emailInputRef = useRef(null);
  const addressSelectorRef = useRef(null);
  const { googleAllowed, requestGooglePermission } = useConsent();

  // --- REF ZA PRAĆENJE AUTOMATSKE SELEKCIJE ---

  const [mapsReady, setMapsReady] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [prediction, setPrediction] = useState('');

  // --- STATE ZA ADRESE ---
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressAccount, setAddressAccount] = useState(null);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressPrediction, setAddressPrediction] = useState('');
  const [countryCode, setCountryCode] = useState('RS');

  // --- TELEFON LOGIKA ---
  const { phonePrefix, localPhone } = useMemo(() => {
    const fullNumber = formData.phone || '';
    const sortedCodes = [...COUNTRY_CODES].sort(
      (a, b) => b.dial.length - a.dial.length
    );
    const found = sortedCodes.find((c) => fullNumber.startsWith(c.dial));

    if (found) {
      return {
        phonePrefix: found.dial,
        localPhone: fullNumber.replace(found.dial, '').trim(),
      };
    }
    return { phonePrefix: '+381', localPhone: fullNumber };
  }, [formData.phone]);

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === countryCode && c.dial === phonePrefix) ||
    COUNTRY_CODES.find((c) => c.dial === phonePrefix) ||
    COUNTRY_CODES.find((c) => c.code === 'RS');

  // --- LOGIKA POPUNJAVANJA POLJA (AUTOFILL) ---
  const selectAddress = (addr) => {
    setAddressPrediction('');
    if (!addr) {
      setSelectedAddressId('new');
      if (setFormData) {
        setFormData((prev) => ({
          ...prev,
          address: '',
          addressDetails: '',
          city: '',
          postalCode: '',
        }));
      }
    } else {
      setSelectedAddressId(addr.id);

      const fullName = addr.name || '';
      const parts = fullName.trim().split(/\s+/);
      const fName = parts[0] || '';
      const lName = parts.slice(1).join(' ') || '';

      if (setFormData) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || fName,
          surname: prev.surname || lName,
          phone: prev.phone || addr.phone,
          address: addr.address || '',
          addressDetails: '',
          city: addr.city || '',
          postalCode: addr.zip || '',
          email: prev.email || user?.email || '',
        }));
      }
    }
    setIsAddressSelectorOpen(false);
  };

  const [profileName = '', ...profileSurname] = (user?.displayName || '').trim().split(/\s+/);
  const profileLastName = profileSurname.join(' ');
  const profileEmail = user?.email || '';
  const profilePhone = user?.phoneNumber || '';
  const accountId = user?.id || user?.uid;

  useEffect(() => {
    if (!accountId || !setFormData) return;
    setFormData(prev => ({
      ...prev,
      name: prev.name || profileName,
      surname: prev.surname || profileLastName,
      email: prev.email || profileEmail,
      phone: prev.phone || profilePhone,
    }));
  }, [accountId, profileName, profileLastName, profileEmail, profilePhone, setFormData]);

  useEffect(() => {
    setSavedAddresses([]);
    setSelectedAddressId('new');
    if (!accountId) return undefined;

    let cancelled = false;
    customerApi.listAddresses().then(addresses => {
      if (!cancelled) {
        setSavedAddresses(addresses);
        setAddressAccount(accountId);
      }
    }).catch(err => {
      if (!cancelled) console.error('Error fetching addresses', err);
    });
    return () => { cancelled = true; };
  }, [accountId]);

  const defaultAddress = addressAccount === accountId ? savedAddresses[0] : undefined;
  const [autoAddressUsed, setAutoAddressUsed] = useState(false);

  useEffect(() => {
    setAutoAddressUsed(false);
  }, [accountId]);

  useEffect(() => {
    if (!accountId || !defaultAddress || autoAddressUsed || !setFormData) return;
    const [name = '', ...surname] = (defaultAddress.name || '').trim().split(/\s+/);
    const canFillAddress = requiredForCourier && !formData.address && !formData.addressDetails &&
      !formData.city && !formData.postalCode;
    if (canFillAddress) setSelectedAddressId(defaultAddress.id);
    if (requiredForCourier) setAutoAddressUsed(true);
    setFormData(prev => ({
      ...prev,
      name: prev.name || name,
      surname: prev.surname || surname.join(' '),
      phone: prev.phone || defaultAddress.phone || '',
      ...(canFillAddress ? {
        address: defaultAddress.address || '',
        city: defaultAddress.city || '',
        postalCode: defaultAddress.zip || '',
      } : {}),
    }));
  }, [accountId, autoAddressUsed, defaultAddress, requiredForCourier, formData.address,
    formData.addressDetails, formData.city, formData.postalCode, setFormData]);

  // --- HELPER: ODABIR IKONICE ---
  const getAddressIcon = (addr, size = 18) => {
    if (!addr)
      return <Plus size={size} className="text-[var(--color-primary)]" />;

    const normalizedLabel = (addr.label || '').trim().toLowerCase();

    const iconKeyFromLabel = Object.keys(ADDRESS_ICONS).find(
      (key) =>
        ADDRESS_ICONS[key].label?.trim().toLowerCase() === normalizedLabel
    );

    const iconKey = addr.icon || iconKeyFromLabel;
    const IconComp = ADDRESS_ICONS[iconKey]?.icon || MapPin;

    return <IconComp size={size} className="text-[var(--color-primary)]" />;
  };

  const getSelectedAddressLabel = () => {
    if (selectedAddressId === 'new') return translateText('Nova adresa (Ručni unos)');
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    return addr ? `${addr.label || translateText('Adresa')} - ${addr.address}` : translateText('Nova adresa');
  };

  const getSelectedAddressIcon = () => {
    if (selectedAddressId === 'new')
      return <Plus size={18} className="text-[var(--color-primary)]" />;
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    return getAddressIcon(addr, 18);
  };

  // --- ADDRESS HELPERS ---
  function normalizeAddress(val = '') {
    return val.trim().toLowerCase();
  }

  const buildAddressSuggestions = useCallback(
    (value) => {
      const rawValue = value || '';
      const norm = normalizeAddress(value);
      if (norm.length < 2) {
        setAddressSuggestions([]);
        setAddressPrediction('');
        return;
      }
      const matches = savedAddresses.filter((a) =>
        normalizeAddress(a.address).startsWith(norm)
      );
      setAddressSuggestions(matches);
      if (matches.length > 0) {
        const suggestion = matches[0].address || '';
        const typed = rawValue.trimEnd();
        if (
          suggestion
            .toLowerCase()
            .startsWith(typed.toLowerCase()) &&
          suggestion.length > typed.length
        ) {
          setAddressPrediction(
            suggestion
              .slice(typed.length)
              .replace(/^\s+/, '')
              .toLowerCase()
          );
        } else {
          setAddressPrediction('');
        }
      } else {
        setAddressPrediction('');
      }
    },
    [savedAddresses]
  );

  const applyGoogleAddress = useCallback(
    (address) => {
      if (setFormData) {
        setFormData((prev) => ({
          ...prev,
          address: address.address || prev.address,
          city: address.city || prev.city,
          postalCode: address.postalCode || prev.postalCode,
        }));
      } else {
        if (address.address)
          handleChange({ target: { name: 'address', value: address.address } });
        if (address.city)
          handleChange({ target: { name: 'city', value: address.city } });
        if (address.postalCode)
          handleChange({ target: { name: 'postalCode', value: address.postalCode } });
      }
      buildAddressSuggestions(address.address || '');
    },
    [buildAddressSuggestions, handleChange, setFormData],
  );
  const {
    suggestions: googleAddressSuggestions,
    isLoading: googleAddressLoading,
    search: searchGoogleAddress,
    select: selectGoogleAddress,
    clear: clearGoogleAddressSuggestions,
  } = useAddressAutocomplete({ enabled: mapsReady && section === 'address', onSelect: applyGoogleAddress });

  // --- GOOGLE MAPS INIT ---
  useEffect(() => {
    if (!googleAllowed || section !== 'address') {
      setMapsReady(false);
      setMapsLoadError(false);
      return undefined;
    }
    let cancelled = false;

    loadGoogleMapsPlaces()
      .then(() => {
        if (cancelled) return;
        setMapsReady(true);
      })
      .catch((error) => {
        console.error('Google Places nije dostupan:', error);
        if (!cancelled) {
          setMapsReady(false);
          setMapsLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleAllowed, section]);

  // --- CLICK OUTSIDE ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        emailInputRef.current &&
        !emailInputRef.current.contains(e.target) &&
        !e.target.closest('.email-dropdown')
      )
        setShowEmailSuggestions(false);
      if (
        addressSelectorRef.current &&
        !addressSelectorRef.current.contains(e.target)
      )
        setIsAddressSelectorOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleEmailInput = (e) => {
    handleChange(e);
    const val = e.target.value;
    if (!val) {
      setShowEmailSuggestions(false);
      setPrediction('');
      return;
    }
    let newPrediction = '';
    if (val.includes('@')) {
      const [prefix, suffix] = val.split('@');
      if (suffix !== undefined) {
        const match = POPULAR_DOMAINS.find((d) => d.startsWith(suffix));
        if (match && match !== suffix)
          newPrediction = match.slice(suffix.length);
      }
      if (!suffix && suffix !== '') {
        const suggestions = POPULAR_DOMAINS.map((d) => `${prefix}@${d}`);
        setEmailSuggestions(suggestions);
        setShowEmailSuggestions(true);
      } else {
        const matches = POPULAR_DOMAINS.filter((d) => d.startsWith(suffix));
        if (matches.length > 0 && matches[0] !== suffix) {
          const suggestions = matches.map((d) => `${prefix}@${d}`);
          setEmailSuggestions(suggestions);
          setShowEmailSuggestions(true);
        } else {
          setShowEmailSuggestions(false);
        }
      }
    } else {
      if (val.length > 1) {
        const suggestions = POPULAR_DOMAINS.map((d) => `${val}@${d}`);
        setEmailSuggestions(suggestions);
        setShowEmailSuggestions(true);
      } else {
        setShowEmailSuggestions(false);
      }
    }
    setPrediction(newPrediction);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && prediction) {
      e.preventDefault();
      handleChange({
        target: { name: 'email', value: formData.email + prediction },
      });
      setPrediction('');
      setShowEmailSuggestions(false);
    }
  };
  const selectEmail = (email) => {
    handleChange({ target: { name: 'email', value: email } });
    setShowEmailSuggestions(false);
    setPrediction('');
    emailInputRef.current?.focus();
  };
  const handleCountrySelect = (country) => {
    setCountryCode(country.code);
    const full = `${country.dial} ${localPhone}`;
    handleChange({ target: { name: 'phone', value: full } });
  };
  const handleLocalPhoneChange = (e) => {
    const val = e.target.value;
    const full = val.startsWith('+') || val.startsWith('00') ? val.replace(/^00/, '+') : `${phonePrefix} ${val.replace(/^0+/, '')}`;
    handleChange({ target: { name: 'phone', value: full } });
  };
  const handleAddressInput = (e) => {
    handleChange(e);
    buildAddressSuggestions(e.target.value);
    searchGoogleAddress(e.target.value);
  };
  const handleAddressKeyDown = (e) => {
    if (e.key === 'Tab' && googleAddressSuggestions.length > 0) {
      e.preventDefault();
      void selectGoogleAddress(googleAddressSuggestions[0]);
      return;
    }
    if (e.key === 'Tab' && addressPrediction && addressSuggestions.length > 0) {
      e.preventDefault();
      selectAddress(addressSuggestions[0]);
    }
  };

  return (
    <section
      className="checkout-section checkout-delivery-form"
    >
      {/* STILOVI SA TEMATSKIM VARIJABLAMA */}
      <style>{`
        .address-selector-wrapper { position: relative; margin-bottom: 24px; z-index: 40; }
        
        .address-selector-btn {
            width: 100%; display: flex; align-items: center; justify-content: space-between;
            background: var(--color-surface); /* TEMA */
            border: 1px solid var(--color-border); /* TEMA */
            padding: 14px 16px; border-radius: 12px;
            color: var(--color-text); /* TEMA */
            font-weight: 600;
            cursor: pointer; transition: all 0.2s;
        }
        .address-selector-btn:hover { 
            background: var(--color-bg-subtle); /* TEMA */
            border-color: var(--color-primary); /* TEMA */
        }
        
        .address-dropdown-list {
            position: absolute; top: 100%; left: 0; width: 100%;
            background: var(--color-surface); /* TEMA - nije više hardcoded #18181b */
            border: 1px solid var(--color-border); /* TEMA */
            border-radius: 12px; margin-top: 8px; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            overflow: hidden; z-index: 100;
        }
        
        .addr-option {
            width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 16px;
            text-align: left; border: none; background: transparent;
            color: var(--color-muted); /* TEMA */
            cursor: pointer; 
            border-bottom: 1px solid var(--color-border); /* TEMA */
            transition: all 0.2s;
        }
        .addr-option:last-child { border-bottom: none; }
        
        .addr-option:hover { 
            background: var(--color-bg-subtle); /* TEMA */
            color: var(--color-text); /* TEMA */
        }
        .addr-option.active { 
            background: var(--color-bg-subtle); 
            color: var(--color-primary); 
        }

      `}</style>

      {section === "address" && <h3 className="checkout-address-heading">{translateText("Adresa za isporuku")}</h3>}

      {/* --- ADDRESS SELECTOR --- */}
      {section === "address" && user && savedAddresses.length > 0 && (
        <div className="address-selector-wrapper" ref={addressSelectorRef}>
          <button
            type="button"
            className="address-selector-btn"
            onClick={() => setIsAddressSelectorOpen(!isAddressSelectorOpen)}
          >
            <div className="flex items-center gap-3">
              {getSelectedAddressIcon()}
              <span>{getSelectedAddressLabel()}</span>
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform ${
                isAddressSelectorOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isAddressSelectorOpen && (
              <motion.div
                className="address-dropdown-list"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    className={`addr-option ${
                      selectedAddressId === addr.id ? 'active' : ''
                    }`}
                    onClick={() => selectAddress(addr)}
                  >
                    {getAddressIcon(addr)}
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-[var(--color-text)]">
                        {addr.label || translateText('Adresa')}
                      </span>
                      <span className="text-xs opacity-70">
                        {addr.address}, {addr.city}
                      </span>
                    </div>
                    {selectedAddressId === addr.id && (
                      <Check
                        size={16}
                        className="ml-auto text-[var(--color-primary)]"
                      />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  className={`addr-option ${
                    selectedAddressId === 'new' ? 'active' : ''
                  }`}
                  onClick={() => selectAddress(null)}
                >
                  <Plus size={16} />
                  <span className="font-bold text-sm">{translateText("Nova adresa (Ručni unos)")}</span>
                  {selectedAddressId === 'new' && (
                    <Check
                      size={16}
                      className="ml-auto text-[var(--color-primary)]"
                    />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* --- FORMA --- */}
      <div className="form-grid">
        <div className="checkout-contact-fields form-grid full-width" hidden={section !== "contact"}>
        <div className="input-wrapper-col">
          <div className={`input-group ${getInputClass('name')}`}>
            <User className="input-icon" size={18} />
            <label className="checkout-field-label" htmlFor="checkout-name">{translateText("Ime")}</label>
            <input
              type="text"
              name="name"
              id="checkout-name"
              autoComplete="given-name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "checkout-name-error" : undefined}
              placeholder={translateText("Ime")}
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
          </div>
          <AnimatePresence mode="wait">
            {errors.name && <div id="checkout-name-error"><ErrorMessage message={errors.name} /></div>}
          </AnimatePresence>
        </div>
        <div className="input-wrapper-col">
          <div className={`input-group ${getInputClass('surname')}`}>
            <User className="input-icon" size={18} />
            <label className="checkout-field-label" htmlFor="checkout-surname">{translateText("Prezime")}</label>
            <input
              type="text"
              name="surname"
              id="checkout-surname"
              autoComplete="family-name"
              aria-invalid={!!errors.surname}
              aria-describedby={errors.surname ? "checkout-surname-error" : undefined}
              placeholder={translateText("Prezime")}
              value={formData.surname}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
          </div>
          <AnimatePresence mode="wait">
            {errors.surname && <div id="checkout-surname-error"><ErrorMessage message={errors.surname} /></div>}
          </AnimatePresence>
        </div>

        {/* EMAIL */}
        <div className="input-wrapper-col full-width relative-wrapper email-input-container">
          <div
            className={`input-group ghost-container ${getInputClass('email')}`}
          >
            <div className="ghost-overlay" style={{ paddingLeft: '42px' }}>
              <span className="invisible-text">{formData.email}</span>
              <span className="prediction-text">{prediction}</span>
              {prediction && (
                <span className="tab-hint-inline">
                  <ArrowRightToLine size={10} />{translateText(" Tab")}</span>
              )}
            </div>
            <Mail className="input-icon z-index-fix" size={18} />
            <label className="checkout-field-label" htmlFor="checkout-email">{translateText("E-mail adresa")}</label>
            <input
              ref={emailInputRef}
              type="email"
              name="email"
              id="checkout-email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "checkout-email-error" : undefined}
              placeholder={translateText("E-mail adresa")}
              value={formData.email}
              onChange={handleEmailInput}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              required
              className="real-input"
            />
            {showEmailSuggestions && (
              <ul className="email-dropdown">
                {emailSuggestions.map((s) => (
                  <li key={s}><button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => selectEmail(s)}
                  >
                    {s.split('@')[0]}
                    <span className="domain">@{s.split('@')[1]}</span>
                  </button></li>
                ))}
              </ul>
            )}
          </div>
          <AnimatePresence mode="wait">
            {errors.email && <div id="checkout-email-error"><ErrorMessage message={errors.email} /></div>}
          </AnimatePresence>
        </div>

        {/* TELEFON */}
        <div className="input-wrapper-col full-width">
          <div className="flex gap-2">
            <select className="checkout-native-country" aria-label={translateText('Pozivni broj države')} value={selectedCountry.code} onChange={event => handleCountrySelect(COUNTRY_CODES.find(country => country.code === event.target.value))}>
              {COUNTRY_CODES.map(country => <option key={country.code} value={country.code}>{country.dial} — {countryNames.of(country.code)}</option>)}
            </select>
            <PhoneCountryPicker
              className="checkout-desktop-country relative w-[110px] shrink-0"
              country={selectedCountry}
              onSelect={handleCountrySelect}
              renderTrigger={({ isOpen, toggle }) => (
                <button
                  type="button"
                  className="flex h-full w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:border-[var(--color-primary)]"
                  onClick={toggle}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img src={getFlagUrl(selectedCountry.code)} alt={selectedCountry.code} className="w-5 h-auto rounded-[2px]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">{selectedCountry.dial}</span>
                  </div>
                  <ChevronDown size={14} className={`text-[var(--color-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            />
            <div className="relative flex-1">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                size={18}
              />
              <label className="checkout-field-label" htmlFor="checkout-phone-local">{translateText("Telefon")}</label>
            <input
                type="tel"
                name="phone-local"
              id="checkout-phone-local"
              autoComplete="tel-national"
              inputMode="tel"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
                placeholder="64 1234567"
                style={{ paddingLeft: 36 }}
                value={localPhone}
                onChange={handleLocalPhoneChange}
                required
                className={`w-full p-3 pl-10 bg-[var(--color-surface)] rounded-xl border ${
                  errors.phone
                    ? 'border-red-500'
                    : 'border-[var(--color-border)]'
                } focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text)] placeholder:text-[var(--color-muted)]`}
              />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {errors.phone && <div id="checkout-phone-error"><ErrorMessage message={errors.phone} /></div>}
          </AnimatePresence>
        </div>

        </div>
        {/* ADRESA (Pojavljuje se samo za kurira) */}
        <AnimatePresence initial={false}>
          {section === "address" && requiredForCourier && (
            <motion.div
              className="full-width form-grid"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ height: { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: reduceMotion ? 0 : 0.12 } }}
              // Senka fokusiranog polja i lista predloga moraju ostati vidljive.
              // checkout-section već kontroliše slojeve iznad narednih sekcija.
              style={{ gridColumn: '1 / -1', overflow: 'visible' }}
            >
              <div className="input-wrapper-col full-width">
                <div
                  className={`input-group ghost-container ${getInputClass(
                    'address'
                  )}`}
                >
                  <div className="ghost-overlay" style={{ paddingLeft: '42px' }}>
                    <span className="invisible-text">{formData.address}</span>
                    <span className="prediction-text">
                      {addressPrediction}
                    </span>
                    {addressPrediction && (
                      <span className="tab-hint-inline">
                        <ArrowRightToLine size={10} />{translateText(" Tab")}</span>
                    )}
                  </div>
                  <MapPin
                    className={`input-icon z-index-fix ${
                      !mapsReady ? 'opacity-50' : ''
                    }`}
                    size={18}
                  />
                  <label className="checkout-field-label" htmlFor="checkout-address">{translateText("Ulica i kućni broj")}</label>
            <input
                    type="text"
                    name="address"
              id="checkout-address"
              autoComplete="shipping address-line1"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "checkout-address-error" : undefined}
                    placeholder={
                      translateText(!googleAllowed
                        ? 'Unesite adresu ručno ili uključite predloge'
                        : mapsReady
                        ? 'Počnite da kucate ulicu...'
                        : mapsLoadError
                          ? 'Unesite adresu ručno'
                          : 'Učitavanje predloga adrese...')
                    }
                    value={formData.address}
                    onChange={handleAddressInput}
                    onKeyDown={handleAddressKeyDown}
                    onBlur={(event) => {
                      handleBlur(event);
                      window.setTimeout(clearGoogleAddressSuggestions, 120);
                    }}
                    onFocus={() => {
                      if (!googleAllowed) void requestGooglePermission();
                    }}
                    required={requiredForCourier}
                    className="real-input"
                  />
                  {googleAddressLoading && (
                    <div style={{ position: 'absolute', right: 12 }}>
                      <Loader2 size={18} className="animate-spin text-muted" />
                    </div>
                  )}
                  {googleAllowed &&
                    !mapsReady &&
                    !mapsLoadError &&
                    !googleAddressLoading && (
                      <div style={{ position: 'absolute', right: 12 }}>
                        <Loader2 size={18} className="animate-spin text-muted" />
                      </div>
                    )}
                  {googleAddressSuggestions.length > 0 && (
                    <ul className="checkout-google-address-suggestions" role="listbox" aria-label={translateText("Predlozi adrese")}>
                      {googleAddressSuggestions.map((suggestion) => (
                        <li key={suggestion.placeId}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void selectGoogleAddress(suggestion)}
                          >
                            <strong>{addressPredictionPrimaryText(suggestion)}</strong>
                            <small>{addressPredictionSecondaryText(suggestion) || addressPredictionLabel(suggestion)}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  {errors.address && <div id="checkout-address-error"><ErrorMessage message={errors.address} /></div>}
                </AnimatePresence>
              </div>
              <div className="input-wrapper-col full-width">
                <div className="input-group">
                  <label className="checkout-field-label" htmlFor="checkout-addressDetails">{translateText("Stan, sprat i ulaz (opciono)")}</label>
                  <input
                    type="text"
                    name="addressDetails"
                    id="checkout-addressDetails"
                    placeholder={translateText("Stan, sprat i ulaz (opciono)")}
                    autoComplete="shipping address-line2"
                    value={formData.addressDetails}
                    onChange={handleChange}
                    maxLength={80}
                    className="pl-4"
                  />
                </div>
              </div>
              <div className="input-wrapper-col">
                <div className={`input-group ${getInputClass('city')}`}>
                  <label className="checkout-field-label" htmlFor="checkout-city">{translateText("Grad")}</label>
            <input
                    type="text"
                    name="city"
              id="checkout-city"
              autoComplete="shipping address-level2"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "checkout-city-error" : undefined}
                    placeholder={translateText("Grad")}
                    value={formData.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={requiredForCourier}
                    className="pl-4"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {errors.city && <div id="checkout-city-error"><ErrorMessage message={errors.city} /></div>}
                </AnimatePresence>
              </div>
              <div className="input-wrapper-col">
                <div className={`input-group ${getInputClass('postalCode')}`}>
                  <label className="checkout-field-label" htmlFor="checkout-postalCode">{translateText("Poštanski broj")}</label>
            <input
                    type="text"
                    name="postalCode"
              id="checkout-postalCode"
              autoComplete="shipping postal-code"
              aria-invalid={!!errors.postalCode}
              aria-describedby={errors.postalCode ? "checkout-postalCode-error" : undefined}
              inputMode="numeric"
              maxLength={5}
                    placeholder={translateText("Poštanski broj")}
                    value={formData.postalCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={requiredForCourier}
                    className="pl-4"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {errors.postalCode && (
                    <div id="checkout-postalCode-error"><ErrorMessage message={errors.postalCode} /></div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
