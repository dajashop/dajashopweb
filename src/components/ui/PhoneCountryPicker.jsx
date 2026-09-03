import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { filterPhoneCountries } from '../../data/phoneCountries.js';
import { getFlagUrl } from '../../utils/flags.js';
import './PhoneCountryPicker.css';

function getMenuPosition(target, requestedWidth) {
  const rect = target.getBoundingClientRect();
  const width = Math.min(requestedWidth, window.innerWidth - 16);
  const height = 300;
  const openUpward = window.innerHeight - rect.bottom < height && rect.top > height;
  return {
    top: openUpward ? Math.max(8, rect.top - height) : rect.bottom + 6,
    left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
    width,
  };
}

export default function PhoneCountryPicker({
  country,
  onSelect,
  renderTrigger,
  className = '',
  menuWidth = 280,
}) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState(null);
  const visibleCountries = filterPhoneCountries(search);

  const close = () => {
    setIsOpen(false);
    setPosition(null);
  };

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }
    setSearch('');
    if (triggerRef.current) setPosition(getMenuPosition(triggerRef.current, menuWidth));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const updatePosition = () => {
      if (triggerRef.current) setPosition(getMenuPosition(triggerRef.current, menuWidth));
    };
    const closeOnOutsideClick = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      // Zatvori pre React "click" handlera na elementu ispod portala.
      // Tako klik van menija ne može ponovo da aktivira okidač pri istom kliku.
      setIsOpen(false);
      setPosition(null);
    };
    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsideClick, true);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick, true);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, menuWidth]);

  const chooseCountry = (selectedCountry) => {
    onSelect(selectedCountry);
    close();
  };

  return (
    <>
      <div ref={triggerRef} className={`phone-country-picker ${className}`.trim()}>
        {renderTrigger({ isOpen, toggle })}
      </div>
      {createPortal(
        <AnimatePresence>
          {isOpen && position && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="phone-country-picker__menu"
              style={position}
            >
              <div className="phone-country-picker__search">
                <input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pronađi državu ili pozivni broj"
                  aria-label="Pretraži države"
                />
              </div>
              <div className="phone-country-picker__results" data-lenis-prevent>
                {visibleCountries.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    className="phone-country-picker__option"
                    onClick={() => chooseCountry(option)}
                  >
                    <img src={getFlagUrl(option.code)} alt="" aria-hidden="true" />
                    <span className="phone-country-picker__option-copy">
                      <strong>{option.label}</strong>
                      <small>{option.dial}</small>
                    </span>
                    {country?.code === option.code && <Check size={16} aria-label="Izabrano" />}
                  </button>
                ))}
                {visibleCountries.length === 0 && (
                  <p className="phone-country-picker__empty">Nema odgovarajuće države.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
