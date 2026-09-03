import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  ArrowRightToLine,
  MapPin,
  Loader2,
  ChevronDown,
  Check,
  UserPlus,
  X,
  Lock,
  ArrowRight,
  Phone,
  Home,
  Briefcase,
  Plus,
  Edit2,
  Building2,
  Heart,
  MessageSquare, // Dodata ikonica za napomenu
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
import {
  ADDRESS_ICONS,
  ADDRESS_ICON_ORDER,
} from '../../utils/accountHelpers';

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
  submitCount,
  user,
  getInputClass,
  shippingMethod,
  requiredForCourier,
  showSuccessModal,
  password,
  setPassword,
  showRegPopover,
  setShowRegPopover,
  handleDismissReg,
  handleConfirmReg,
  isRegistering,
  popoverDismissed,
  createAccount,
  validateAll,
  flash,
  // NOVO: Props za napomenu
}) {
  const emailInputRef = useRef(null);
  const addressSelectorRef = useRef(null);
  const { googleAllowed } = useConsent();

  // --- REF ZA PRAĆENJE AUTOMATSKE SELEKCIJE ---
  const hasAutoSelected = useRef(false);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [prediction, setPrediction] = useState('');

  // --- STATE ZA ADRESE ---
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressPrediction, setAddressPrediction] = useState('');

  const DEFAULT_ADDRESS_ICON = 'home';
  const defaultAddressLabel =
    ADDRESS_ICONS[DEFAULT_ADDRESS_ICON]?.label || 'Kuća';

  // --- STATE ZA ČUVANJE ADRESE ---
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] =
    useState(defaultAddressLabel);
  const [newAddressIcon, setNewAddressIcon] =
    useState(DEFAULT_ADDRESS_ICON);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [manualLabelEdited, setManualLabelEdited] = useState(false);

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
          name: fName,
          surname: lName,
          phone: addr.phone || '',
          address: addr.address || '',
          city: addr.city || '',
          postalCode: addr.zip || '',
          email: prev.email || user?.email || '',
        }));
      }
    }
    setIsAddressSelectorOpen(false);
  };

  // --- FETCH ADRESA ---
  useEffect(() => {
    hasAutoSelected.current = false; // Reset na promenu usera

    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const addresses = await customerApi.listAddresses();
        setSavedAddresses(addresses);
      } catch (err) {
        console.error('Error fetching addresses', err);
      }
    };
    fetchAddresses();
  }, [user]);

  // --- AUTOMATSKA SELEKCIJA ---
  useEffect(() => {
    if (savedAddresses.length > 0 && !hasAutoSelected.current) {
      selectAddress(savedAddresses[0]);
      hasAutoSelected.current = true;
    }
  }, [savedAddresses]);

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
    if (selectedAddressId === 'new') return 'Nova adresa (Ručni unos)';
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    return addr ? `${addr.label || 'Adresa'} - ${addr.address}` : 'Nova adresa';
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

  const addressExists = useMemo(
    () =>
      savedAddresses.some(
        (a) => normalizeAddress(a.address) === normalizeAddress(formData.address)
      ),
    [savedAddresses, formData.address]
  );

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
  } = useAddressAutocomplete({ enabled: mapsReady, onSelect: applyGoogleAddress });

  // --- GOOGLE MAPS INIT ---
  useEffect(() => {
    if (!googleAllowed) {
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
  }, [googleAllowed]);

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

  // --- CTA LOGIKA ZA ČUVANJE ADRESE ---
  const courierFieldsFilled =
    requiredForCourier &&
    formData.name &&
    formData.surname &&
    (formData.phone || formData.email) &&
    formData.address &&
    formData.city &&
    formData.postalCode;

  const canShowSaveCta =
    !!user &&
    requiredForCourier &&
    courierFieldsFilled &&
    !addressExists;

  const handleOpenSaveModal = () => {
    if (!canShowSaveCta) return;
    if (validateAll && !validateAll()) return;
    setManualLabelEdited(false);
    setShowSaveModal(true);
  };

  const handleSaveAddress = async () => {
    if (!validateAll || !validateAll()) return;
    if (!user?.uid) return;

    const label = (newAddressLabel || '').trim() || 'Adresa';
    const icon = newAddressIcon || 'mapPin';

    const payload = {
      label,
      icon,
      name: `${formData.name} ${formData.surname}`.trim(),
      address: formData.address,
      city: formData.city,
      zip: formData.postalCode,
      phone: formData.phone,
    };

    try {
      setIsSavingAddress(true);
      const savedAddress = await customerApi.addAddress(payload);
      const fullAddress = { ...payload, ...savedAddress };
      setSavedAddresses((prev) => [fullAddress, ...prev]);
      selectAddress(fullAddress);
      setShowSaveModal(false);
      setNewAddressLabel(defaultAddressLabel);
      setNewAddressIcon(DEFAULT_ADDRESS_ICON);
      setManualLabelEdited(false);
      if (flash)
        flash('Uspeh', 'Adresa sačuvana za sledeću kupovinu.', 'success');
    } catch (error) {
      console.error('Greška pri čuvanju adrese', error);
      if (flash) flash('Greška', 'Nismo mogli da sačuvamo adresu.', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  };

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
    if (
      !user &&
      !popoverDismissed &&
      !createAccount &&
      val.length > 6 &&
      val.includes('@')
    ) {
      setShowRegPopover(true);
    }
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
    if (!user && !popoverDismissed && !createAccount) setShowRegPopover(true);
  };
  const handleCountrySelect = (country) => {
    const full = `${country.dial} ${localPhone}`;
    handleChange({ target: { name: 'phone', value: full } });
  };
  const handleLocalPhoneChange = (e) => {
    const val = e.target.value;
    const full = `${phonePrefix} ${val}`;
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
      className={`checkout-section card glass ${
        showSuccessModal ? 'z-high' : ''
      }`}
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

      <div className="section-header">
        <div className="step-badge">1</div>
        <h2>Podaci za isporuku</h2>
      </div>

      {/* --- ADDRESS SELECTOR --- */}
      {user && savedAddresses.length > 0 && (
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
                        {addr.label || 'Adresa'}
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
                  <span className="font-bold text-sm">
                    Nova adresa (Ručni unos)
                  </span>
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
        <div className="input-wrapper-col">
          <div className={`input-group ${getInputClass('name')}`}>
            <User className="input-icon" size={18} />
            <input
              type="text"
              name="name"
              placeholder="Ime"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
          </div>
          <AnimatePresence mode="wait">
            {errors.name && <ErrorMessage message={errors.name} />}
          </AnimatePresence>
        </div>
        <div className="input-wrapper-col">
          <div className={`input-group ${getInputClass('surname')}`}>
            <User className="input-icon" size={18} />
            <input
              type="text"
              name="surname"
              placeholder="Prezime"
              value={formData.surname}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
          </div>
          <AnimatePresence mode="wait">
            {errors.surname && <ErrorMessage message={errors.surname} />}
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
                  <ArrowRightToLine size={10} /> Tab
                </span>
              )}
            </div>
            <Mail className="input-icon z-index-fix" size={18} />
            <input
              ref={emailInputRef}
              type="email"
              name="email"
              placeholder="E-mail adresa"
              value={formData.email}
              onChange={handleEmailInput}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              required
              autoComplete="email"
              className="real-input"
            />
            {showEmailSuggestions && (
              <ul className="email-dropdown">
                {emailSuggestions.map((s) => (
                  <li
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectEmail(s);
                    }}
                  >
                    {s.split('@')[0]}
                    <span className="domain">@{s.split('@')[1]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AnimatePresence mode="wait">
            {errors.email && <ErrorMessage message={errors.email} />}
          </AnimatePresence>
        </div>

        {/* TELEFON */}
        <div className="input-wrapper-col full-width">
          <div className="flex gap-2">
            <PhoneCountryPicker
              className="relative w-[110px] shrink-0"
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
              <input
                type="tel"
                name="phone-local"
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
            {errors.phone && <ErrorMessage message={errors.phone} />}
          </AnimatePresence>
        </div>

        {/* ADRESA (Pojavljuje se samo za kurira) */}
        <AnimatePresence>
          {requiredForCourier && (
            <motion.div
              className="full-width form-grid"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
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
                        <ArrowRightToLine size={10} /> Tab
                      </span>
                    )}
                  </div>
                  <MapPin
                    className={`input-icon z-index-fix ${
                      !mapsReady ? 'opacity-50' : ''
                    }`}
                    size={18}
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder={
                      !googleAllowed
                        ? 'Unesite adresu ručno ili uključite predloge'
                        : mapsReady
                        ? 'Počnite da kucate ulicu...'
                        : mapsLoadError
                          ? 'Unesite adresu ručno'
                          : 'Učitavanje predloga adrese...'
                    }
                    value={formData.address}
                    onChange={handleAddressInput}
                    onKeyDown={handleAddressKeyDown}
                    onBlur={(event) => {
                      handleBlur(event);
                      window.setTimeout(clearGoogleAddressSuggestions, 120);
                    }}
                    required={requiredForCourier}
                    autoComplete="new-password"
                    className="real-input"
                  />
                  {googleAddressLoading && (
                    <div style={{ position: 'absolute', right: 12 }}>
                      <Loader2 size={18} className="animate-spin text-muted" />
                    </div>
                  )}
                  {!mapsReady && !mapsLoadError && !googleAddressLoading && (
                    <div style={{ position: 'absolute', right: 12 }}>
                      <Loader2 size={18} className="animate-spin text-muted" />
                    </div>
                  )}
                  {googleAddressSuggestions.length > 0 && (
                    <ul className="checkout-google-address-suggestions" role="listbox" aria-label="Predlozi adrese">
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
                  {errors.address && <ErrorMessage message={errors.address} />}
                </AnimatePresence>
              </div>
              <div className="input-wrapper-col">
                <div className={`input-group ${getInputClass('city')}`}>
                  <input
                    type="text"
                    name="city"
                    placeholder="Grad"
                    value={formData.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={requiredForCourier}
                    className="pl-4"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {errors.city && <ErrorMessage message={errors.city} />}
                </AnimatePresence>
              </div>
              <div className="input-wrapper-col">
                <div className={`input-group ${getInputClass('postalCode')}`}>
                  <input
                    type="text"
                    name="postalCode"
                    placeholder="Poštanski broj"
                    value={formData.postalCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={requiredForCourier}
                    className="pl-4"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {errors.postalCode && (
                    <ErrorMessage message={errors.postalCode} />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {canShowSaveCta && (
          <div
            className="full-width save-address-cta"
            style={{ gridColumn: '1 / -1' }}
          >
            <div className="save-address-card">
              <div>
                <p className="save-title">Sačuvaj ovu adresu</p>
                <p className="save-subtitle">
                  Spremaj je za sledeću porudžbinu i popuni automatski.
                </p>
              </div>
              <button
                type="button"
                className="save-address-btn"
                onClick={handleOpenSaveModal}
              >
                <Plus size={16} />
                Sačuvaj adresu
              </button>
            </div>
          </div>
        )}

        {/* REGISTER POPOUT */}
        <AnimatePresence>
          {showRegPopover && !user && (
            <motion.div
              className="reg-popover full-width"
              style={{ gridColumn: '1 / -1' }}
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="reg-popover-header">
                <div>
                  <div className="reg-popover-title">
                    <UserPlus size={18} className="text-primary mr-2" /> Novi
                    kupac? Kreirajte nalog odmah.
                  </div>
                  <span className="reg-popover-desc">
                    Unesite lozinku i registrujte se za bržu kupovinu.
                  </span>
                </div>
                <button
                  type="button"
                  className="reg-close-btn"
                  onClick={handleDismissReg}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <Lock
                  className="input-icon"
                  size={16}
                  style={{ color: 'var(--primary)' }}
                />
                <input
                  type="password"
                  placeholder="Lozinka za novi nalog (min. 6)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                className="reg-confirm-btn"
                onClick={handleConfirmReg}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'Potvrdi i Registruj se'
                )}
                {!isRegistering && <ArrowRight size={16} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SAVE ADDRESS MODAL */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            className="save-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              className="save-modal"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="save-modal-header">
                <div>
                  <p className="save-modal-title">Sačuvaj adresu</p>
                  <p className="save-modal-desc">
                    Daj naziv i odaberi ikonicu da je brže pronađeš.
                  </p>
                </div>
                <button
                  type="button"
                  className="save-close-btn"
                  onClick={() => setShowSaveModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <label className="save-input-label">
                Naziv adrese
                <div className="save-input-wrapper">
                  <Edit2 size={16} className="save-input-icon" />
                  <input
                    type="text"
                    value={newAddressLabel}
                    onChange={(e) => {
                      setNewAddressLabel(e.target.value);
                      setManualLabelEdited(true);
                    }}
                    placeholder="Kuća, Posao..."
                  />
                </div>
              </label>

              <div className="icon-grid">
                {(ADDRESS_ICON_ORDER?.length
                  ? ADDRESS_ICON_ORDER
                  : Object.keys(ADDRESS_ICONS)
                )
                  .filter((key) => ADDRESS_ICONS[key])
                  .map((key) => {
                    const val = ADDRESS_ICONS[key];
                    const IconComp = val.icon;
                    const isActive = newAddressIcon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`icon-pill ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setNewAddressIcon(key);
                          if (!manualLabelEdited || !newAddressLabel.trim()) {
                            setNewAddressLabel(val.label);
                          }
                        }}
                        title={val.label}
                      >
                        <IconComp size={18} />
                        <span>{val.label}</span>
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                className="save-primary-btn"
                onClick={handleSaveAddress}
                disabled={isSavingAddress}
              >
                {isSavingAddress ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    ČUVANJE...
                  </>
                ) : (
                  'Sačuvaj'
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}













