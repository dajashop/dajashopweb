// src/pages/Admin/components/CustomSelect.jsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CustomSelect komponenta za prilagođeni padajući meni.
 * @param {Object} props - Props za komponentu.
 * @param {string} props.label - Labela za select.
 * @param {string} props.value - Trenutna izabrana vrednost.
 * @param {Array} props.options - Niz opcija za izbor (objekti sa 'value' i 'label').
 * @param {Function} props.onChange - Funkcija koja se poziva pri promeni izbora.
 * @param {string} [props.placeholder] - Placeholder tekst kada nema izabrane vrednosti.
 * @param {boolean} [props.disabled] - Da li je select onemogućen.
 */
function CustomSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Izaberi...',
  disabled = false,
  labelClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || value || placeholder;

  return (
    <div
      className={`relative min-w-0 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      ref={containerRef}
    >
      <span className={`text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block ${labelClassName}`}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-w-0 h-11 flex items-center justify-between gap-2 bg-white border text-left px-4 rounded-xl transition-all duration-200
          ${
            isOpen
              ? 'border-neutral-800 ring-2 ring-neutral-100'
              : 'border-neutral-200 hover:border-neutral-300'
          }`}
      >
        <span
          className={`min-w-0 truncate text-sm ${
            value ? 'text-neutral-900 font-medium' : 'text-neutral-400'
          }`}
        >
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-2 w-full bg-white border border-neutral-100 rounded-xl shadow-xl max-h-60 overflow-auto custom-scrollbar p-1"
          >
            {options.map((option) => (
              <button
                key={option.id || option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
                  ${
                    value === option.value
                      ? 'bg-neutral-50 text-neutral-900 font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
              >
                {option.label}
                {value === option.value && (
                  <Check size={14} className="text-emerald-500" />
                )}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-400 text-center">
                Nema dostupnih opcija
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomSelect;
