import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Check,
} from 'lucide-react';

import { db } from '../../services/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

import { FORM_RULES } from '../../data/validationRules';
import ConfirmModal from '../modals/ConfirmModal.jsx';
import ErrorMessage from '../ui/ErrorMessage.jsx';
import {
  ADDRESS_ICONS,
  renderIcon,
  getFlagUrl,
} from '../../utils/accountHelpers.jsx';

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

// --- LISTA POZIVNIH BROJEVA ---
const COUNTRY_CODES = [
  { code: '+381', country: 'RS', label: '🇷🇸 +381' },
  { code: '+382', country: 'ME', label: '🇲🇪 +382' },
  { code: '+387', country: 'BA', label: '🇧🇦 +387' },
  { code: '+385', country: 'HR', label: '🇭🇷 +385' },
  { code: '+389', country: 'MK', label: '🇲🇰 +389' },
  { code: '+386', country: 'SI', label: '🇸🇮 +386' },
  { code: '+43', country: 'AT', label: '🇦🇹 +43' },
  { code: '+49', country: 'DE', label: '🇩🇪 +49' },
  { code: '+41', country: 'CH', label: '🇨🇭 +41' },
];

function AddressSection({ user }) {
  const { flash } = useFlash();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitCount, setSubmitCount] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const addressInputRef = useRef(null);

  // State i Ref za custom dropdown
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // State za prefiks telefona
  const [phonePrefix, setPhonePrefix] = useState('+381');

  // Pomoćna funkcija za razdvajanje broja
  const parsePhoneNumber = (fullNumber) => {
    if (!fullNumber) return { prefix: '+381', number: '' };
    const sortedCodes = [...COUNTRY_CODES].sort(
      (a, b) => b.code.length - a.code.length
    );
    const found = sortedCodes.find((c) => fullNumber.startsWith(c.code));
    if (found) {
      return {
        prefix: found.code,
        number: fullNumber.replace(found.code, '').trim(),
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

  // Postavi telefon korisnika pri učitavanju
  useEffect(() => {
    if (user.phoneNumber) {
      const { prefix, number } = parsePhoneNumber(user.phoneNumber);
      setPhonePrefix(prefix);
      setForm((f) => ({ ...f, phone: number }));
    }
  }, [user.phoneNumber]);

  // Zatvaranje dropdown-a na klik sa strane
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- REAL-TIME DATA FETCHING ---
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'users', user.uid, 'addresses'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAddresses(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [user]);

  // --- GOOGLE MAPS ---
  useEffect(() => {
    if (!isAdding || (window.google && window.google.maps)) return;
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) return;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}&libraries=places&language=sr`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';
    document.head.appendChild(script);
  }, [isAdding]);

  // --- GOOGLE PLACES AUTOCOMPLETE ---
  useEffect(() => {
    if (!isAdding) return;
    let autocomplete = null;
    const initGooglePlaces = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places)
        return false;
      if (addressInputRef.current) {
        autocomplete = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: { country: 'rs' },
            fields: ['address_components', 'formatted_address'],
            types: ['address'],
          }
        );
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.address_components) return;
          let street = '',
            number = '',
            city = '',
            zip = '';
          place.address_components.forEach((comp) => {
            const types = comp.types;
            if (types.includes('route')) street = comp.long_name;
            if (types.includes('street_number')) number = comp.long_name;
            if (types.includes('locality')) city = comp.long_name;
            if (!city && types.includes('administrative_area_level_2'))
              city = comp.long_name;
            if (types.includes('postal_code')) zip = comp.long_name;
          });
          const fullAddress = number ? `${street} ${number}` : street;
          setForm((prev) => ({
            ...prev,
            address: fullAddress || prev.address,
            city: city || prev.city,
            zip: zip || prev.zip,
          }));
          setErrors((prev) => ({
            ...prev,
            address: null,
            city: null,
            zip: null,
          }));
        });
        return true;
      }
      return false;
    };
    if (!initGooglePlaces()) {
      const i = setInterval(() => {
        if (initGooglePlaces()) clearInterval(i);
      }, 500);
      return () => clearInterval(i);
    }
    return () => {
      if (autocomplete)
        window.google.maps.event.clearInstanceListeners(autocomplete);
      const pac = document.querySelector('.pac-container');
      if (pac) pac.remove();
    };
  }, [isAdding]);

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
    setIsCountryDropdownOpen(false);
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
        await updateDoc(doc(db, 'users', user.uid, 'addresses', editingId), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
        flash('Uspeh', 'Adresa izmenjena.', 'success');
      } else {
        await addDoc(collection(db, 'users', user.uid, 'addresses'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        flash('Uspeh', 'Nova adresa dodata.', 'success');
      }
      handleCancel();
    } catch (error) {
      console.error(error);
      flash('Greška', 'Greška pri čuvanju.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', deleteId));
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
                    ref={addressInputRef}
                  name="address"
                  value={form.address}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Počnite da kucate adresu..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={errors.address ? 'input-error' : ''}
                  style={{ paddingLeft: '36px' }}
                />
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
                  <div
                    className="relative w-[110px] shrink-0"
                    ref={dropdownRef}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setIsCountryDropdownOpen(!isCountryDropdownOpen)
                      }
                      className="w-full p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] flex items-center justify-between gap-2 transition-colors hover:bg-[var(--color-bg-subtle)]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img
                          src={getFlagUrl(
                            COUNTRY_CODES.find((c) => c.code === phonePrefix)
                              ?.country || 'RS'
                          )}
                          alt="flag"
                          className="w-5 h-auto object-cover rounded-sm"
                        />
                        <span className="font-medium text-[var(--color-text)] text-sm">
                          {phonePrefix}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-[var(--color-muted)] transition-transform duration-200 ${
                          isCountryDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isCountryDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute top-full left-0 mt-1 w-[240px] max-h-[200px] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 country-dropdown-scroll"
                          data-lenis-prevent
                        >
                          {COUNTRY_CODES.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setPhonePrefix(country.code);
                                setIsCountryDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-all rounded-md"
                            >
                              <img
                                src={getFlagUrl(country.country)}
                                alt={country.country}
                                className="w-5 h-auto object-cover rounded-sm shadow-sm"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-[var(--color-text)]">
                                  {country.label.split(' ')[0]}
                                </span>
                                <span className="text-xs text-[var(--color-muted)] font-medium">
                                  {country.code}
                                </span>
                              </div>
                              {phonePrefix === country.code && (
                                <Check
                                  size={16}
                                  className="ml-auto text-[var(--color-primary)]"
                                />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

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
