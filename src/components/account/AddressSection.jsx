import React, { useState, useEffect, useCallback } from 'react';
import { useFlash } from '../../hooks/useFlash.js';
import { motion, AnimatePresence } from 'framer-motion';
import './AddressSection.css';
import {
  MapPin,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Edit2,
  PenTool,
  Loader2,
  Phone,
} from 'lucide-react';

import { customerApi } from '../../services/dajaPlatform';
import { loadGoogleMapsPlaces } from '../../services/googleMaps';
import {
  addressPredictionLabel,
  addressPredictionPrimaryText,
  addressPredictionSecondaryText,
  useAddressAutocomplete,
} from '../../hooks/useAddressAutocomplete.js';
import { useConsent } from '../../context/ConsentContext.jsx';

import { FORM_RULES } from '../../data/validationRules';
import ConfirmModal from '../modals/ConfirmModal.jsx';
import ErrorMessage from '../ui/ErrorMessage.jsx';
import { PHONE_COUNTRIES } from '../../data/phoneCountries.js';
import PhoneCountryPicker from '../ui/PhoneCountryPicker.jsx';
import {
  ADDRESS_ICONS,
  renderIcon,
  getFlagUrl,
} from '../../utils/accountHelpers.jsx';

const COUNTRY_CODES = PHONE_COUNTRIES;

function AddressSection({ user }) {
  const { flash } = useFlash();
  const { googleAllowed } = useConsent();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitCount, setSubmitCount] = useState(0);
  const [deleteId, setDeleteId] = useState(null);

  // State za prefiks telefona
  const [phonePrefix, setPhonePrefix] = useState('+381');
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Pomoćna funkcija za razdvajanje broja
  const parsePhoneNumber = (fullNumber) => {
    if (!fullNumber) return { prefix: '+381', number: '' };
    const sortedCodes = [...COUNTRY_CODES].sort(
      (a, b) => b.dial.length - a.dial.length
    );
    const found = sortedCodes.find((c) => fullNumber.startsWith(c.dial));
    if (found) {
      return {
        prefix: found.dial,
        number: fullNumber.replace(found.dial, '').trim(),
      };
    }
    return { prefix: '+381', number: fullNumber };
  };

  const initialFormState = {
    label: 'Kuća',
    icon: 'home',
    name: user.displayName || '',
    address: '',
    city: '',
    zip: '',
    phone: '',
  };

  const [form, setForm] = useState(initialFormState);

  const applyGoogleAddress = useCallback((address) => {
    setForm((prev) => ({
      ...prev,
      address: address.address || prev.address,
      city: address.city || prev.city,
      zip: address.postalCode || prev.zip,
    }));
    setErrors((prev) => ({ ...prev, address: null, city: null, zip: null }));
  }, []);
  const {
    suggestions: googleAddressSuggestions,
    isLoading: googleAddressLoading,
    search: searchGoogleAddress,
    select: selectGoogleAddress,
    clear: clearGoogleAddressSuggestions,
  } = useAddressAutocomplete({
    enabled: isAdding && mapsLoaded,
    onSelect: applyGoogleAddress,
  });

  // Postavi telefon korisnika pri učitavanju
  useEffect(() => {
    if (user.phoneNumber) {
      const { prefix, number } = parsePhoneNumber(user.phoneNumber);
      setPhonePrefix(prefix);
      setForm((f) => ({ ...f, phone: number }));
    }
  }, [user.phoneNumber]);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    customerApi
      .listAddresses()
      .then((data) => {
        if (cancelled) return;
        setAddresses(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // --- GOOGLE MAPS ---
  useEffect(() => {
    if (!isAdding || !googleAllowed) {
      setMapsLoaded(false);
      return undefined;
    }
    let cancelled = false;

    loadGoogleMapsPlaces()
      .then(() => {
        if (!cancelled) setMapsLoaded(true);
      })
      .catch((error) => {
        console.error('Google Places nije dostupan:', error);
        if (!cancelled) setMapsLoaded(false);
      });

    return () => {
      cancelled = true;
    };
  }, [googleAllowed, isAdding]);

  // --- VALIDACIJA ---
  const validateField = (name, value) => {
    if (name === 'name' && !FORM_RULES.name.regex.test(value))
      return FORM_RULES.name.message;
    if (name === 'address' && !FORM_RULES.address.regex.test(value))
      return FORM_RULES.address.message;
    if (name === 'city' && (!value || value.trim().length < 2))
      return 'Unesite validan naziv grada.';
    if (name === 'zip' && !FORM_RULES.postalCode.regex.test(value))
      return FORM_RULES.postalCode.message;

    // [IZMENA] Nova validacija za telefon: Tačno 9 cifara
    if (name === 'phone') {
      const cleanNumber = value.replace(/\D/g, '');
      if (cleanNumber.length !== 9)
        return 'Broj mora imati tačno 9 cifara (npr. 641234567).';
    }
    return null;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleAddressInputChange = (e) => {
    handleInputChange(e);
    searchGoogleAddress(e.target.value);
  };

  const handleEdit = (addr) => {
    const { prefix, number } = parsePhoneNumber(addr.phone);
    setForm({ ...addr, phone: number });
    setPhonePrefix(prefix);
    setEditingId(addr.id);
    setIsAdding(true);
    setErrors({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(initialFormState);
    const { prefix } = parsePhoneNumber(user.phoneNumber);
    setPhonePrefix(prefix || '+381');
    setErrors({});
    setSubmitCount(0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {
      name: validateField('name', form.name),
      address: validateField('address', form.address),
      city: validateField('city', form.city),
      zip: validateField('zip', form.zip),
      phone: validateField('phone', form.phone),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((err) => err !== null)) {
      setSubmitCount((c) => c + 1);
      return;
    }

    const fullPhoneNumber = `${phonePrefix} ${form.phone}`;
    const dataToSave = { ...form, phone: fullPhoneNumber };

    const isEditing = !!editingId;
    try {
      if (isEditing) {
        await customerApi.updateAddress(editingId, dataToSave);
        flash('Uspeh', 'Adresa izmenjena.', 'success');
      } else {
        await customerApi.addAddress(dataToSave);
        flash('Uspeh', 'Nova adresa dodata.', 'success');
      }
      const refreshed = await customerApi.listAddresses();
      setAddresses(refreshed);
      handleCancel();
    } catch (error) {
      console.error(error);
      flash('Greška', 'Greška pri čuvanju.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await customerApi.deleteAddress(deleteId);
      setAddresses((prev) => prev.filter((address) => address.id !== deleteId));
      flash('Obrisano', 'Adresa uklonjena.', 'info');
    } catch (error) {
      flash('Greška', 'Greška pri brisanju.', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleTypeSelect = (type) => {
    if (type === 'Kuća') setForm({ ...form, label: 'Kuća', icon: 'home' });
    else if (type === 'Posao')
      setForm({ ...form, label: 'Posao', icon: 'briefcase' });
    else setForm({ ...form, label: '', icon: 'mapPin' });
  };

  const isStandardLabel = ['Kuća', 'Posao'].includes(form.label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="section-content"
    >
      <div className="section-header-row">
        <h3>Moje adrese</h3>
        {!isAdding && (
          <button
            className="btn-primary small"
            onClick={() => {
              setEditingId(null);
              setForm(initialFormState);
              const { prefix } = parsePhoneNumber(user.phoneNumber);
              setPhonePrefix(prefix || '+381');
              setIsAdding(true);
            }}
          >
            <Plus size={16} /> Dodaj novu
          </button>
        )}
      </div>
      <AnimatePresence mode="popLayout">
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="address-form card glass"
            onSubmit={handleSave}
            noValidate
            autoComplete="off"
            style={{ position: 'relative', zIndex: 20 }}
          >
            <h4>{editingId ? 'Izmeni adresu' : 'Nova adresa'}</h4>
            <div className="form-grid">
              <label className="full">
                <span>Tip adrese</span>
                <div className="radio-group">
                  {['Kuća', 'Posao'].map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={`chip ${form.label === type ? 'active' : ''}`}
                      onClick={() => handleTypeSelect(type)}
                    >
                      {type === 'Kuća' && <Home size={14} />}
                      {type === 'Posao' && <Briefcase size={14} />}
                      {type}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`chip ${!isStandardLabel ? 'active' : ''}`}
                    onClick={() => handleTypeSelect('Custom')}
                  >
                    <PenTool size={14} /> Custom
                  </button>
                </div>
                {!isStandardLabel && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3"
                  >
                    <input
                      type="text"
                      placeholder="Unesite naziv..."
                      value={form.label}
                      onChange={(e) =>
                        setForm({ ...form, label: e.target.value })
                      }
                      className="border-primary mb-3"
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                    />
                    <span>Izaberi ikonicu:</span>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {Object.entries(ADDRESS_ICONS).map(([key, val]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({ ...form, icon: key })}
                          title={val.label}
                          className={`p-2 rounded-lg border transition-all ${
                            form.icon === key
                              ? 'bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-primary)]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <val.icon size={18} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </label>
              <label>
                <span>Ime i prezime</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Ime i prezime"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  className={errors.name ? 'input-error' : ''}
                />
                <AnimatePresence mode="wait">
                  {errors.name && (
                    <ErrorMessage
                      key={`name-${submitCount}`}
                      message={errors.name}
                    />
                  )}
                </AnimatePresence>
              </label>
              <label className="full">
                <span>Ulica i broj</span>
                <div className="input-with-icon">
                  <MapPin
                    size={16}
                    className={`input-icon-left ${
                      errors.address ? 'text-red-500' : ''
                    }`}
                  />
                  <input
                  name="address"
                  value={form.address}
                  onChange={handleAddressInputChange}
                  onBlur={(event) => {
                    handleBlur(event);
                    window.setTimeout(clearGoogleAddressSuggestions, 120);
                  }}
                  placeholder="Počnite da kucate adresu..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={errors.address ? 'input-error' : ''}
                  style={{ paddingLeft: '36px' }}
                />
                  {googleAddressLoading && (
                    <Loader2 className="google-address-loading animate-spin" size={16} />
                  )}
                  {googleAddressSuggestions.length > 0 && (
                    <ul className="google-address-suggestions" role="listbox" aria-label="Predlozi adrese">
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
                  {errors.address && (
                    <ErrorMessage
                      key={`addr-${submitCount}`}
                      message={errors.address}
                    />
                  )}
                </AnimatePresence>
              </label>
              <label>
                <span>Grad</span>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Niš"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  className={errors.city ? 'input-error' : ''}
                />
                <AnimatePresence mode="wait">
                  {errors.city && (
                    <ErrorMessage
                      key={`city-${submitCount}`}
                      message={errors.city}
                    />
                  )}
                </AnimatePresence>
              </label>
              <label>
                <span>Poštanski broj</span>
                <input
                  name="zip"
                  value={form.zip}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="18000"
                  autoComplete="off"
                  inputMode="numeric"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={errors.zip ? 'input-error' : ''}
                />
                <AnimatePresence mode="wait">
                  {errors.zip && (
                    <ErrorMessage
                      key={`zip-${submitCount}`}
                      message={errors.zip}
                    />
                  )}
                </AnimatePresence>
              </label>

              {/* CUSTOM DROPDOWN */}
              <label className="full">
                <span>Telefon</span>
                <div className="flex gap-2">
                  <PhoneCountryPicker
                    className="relative w-[110px] shrink-0"
                    country={COUNTRY_CODES.find((country) => country.dial === phonePrefix) || COUNTRY_CODES[0]}
                    onSelect={(country) => setPhonePrefix(country.dial)}
                    renderTrigger={({ isOpen, toggle }) => {
                      const selectedCountry = COUNTRY_CODES.find((country) => country.dial === phonePrefix) || COUNTRY_CODES[0];
                      return (
                        <button
                          type="button"
                          onClick={toggle}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:bg-[var(--color-bg-subtle)] focus:outline-none focus:border-[var(--color-primary)]"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img src={getFlagUrl(selectedCountry.code)} alt={selectedCountry.code} className="w-5 h-auto rounded-sm object-cover" />
                            <span className="text-sm font-medium text-[var(--color-text)]">{phonePrefix}</span>
                          </div>
                          <span className={`text-[var(--color-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                        </button>
                      );
                    }}
                  />

                  <div className="relative flex-1">
                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                    />
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      autoComplete="off"
                      inputMode="tel"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={`w-full p-3 pl-10 bg-[var(--color-surface)] rounded-xl border ${
                        errors.phone
                          ? 'border-red-500'
                          : 'border-[var(--color-border)]'
                      } focus:outline-none focus:border-[var(--color-primary)]`}
                      placeholder="64 1234567"
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {errors.phone && (
                    <ErrorMessage
                      key={`phone-${submitCount}`}
                      message={errors.phone}
                    />
                  )}
                </AnimatePresence>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCancel}
              >
                Otkaži
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? 'Izmeni' : 'Sačuvaj'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="addresses-grid" style={{ zIndex: 0 }}>
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={32} />
            <p>Učitavanje...</p>
          </div>
        ) : addresses.length === 0 && !isAdding ? (
          <div className="empty-state">
            <MapPin size={48} className="text-muted" style={{ opacity: 0.3 }} />
            <p>Nemate sačuvanih adresa.</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <motion.div
              layout
              key={addr.id}
              className="address-card card glass"
            >
              <div className="addr-header">
                <span className="addr-label">
                  {addr.icon ? (
                    renderIcon(addr.icon, 14)
                  ) : addr.label === 'Kuća' ? (
                    <Home size={14} />
                  ) : addr.label === 'Posao' ? (
                    <Briefcase size={14} />
                  ) : (
                    <MapPin size={14} />
                  )}
                  {addr.label}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-icon-danger"
                    onClick={() => handleEdit(addr)}
                    title="Izmeni"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon-danger"
                    onClick={() => setDeleteId(addr.id)}
                    title="Obriši"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="addr-body">
                <strong>{addr.name}</strong>
                <p>{addr.address}</p>
                <p>
                  {addr.zip} {addr.city}
                </p>
                <p className="addr-phone">{addr.phone}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Obriši adresu?"
        description="Ova adresa će biti trajno uklonjena. Da li ste sigurni?"
        confirmText="Obriši"
        isDanger={true}
      />
    </motion.div>
  );
}

export default AddressSection;
