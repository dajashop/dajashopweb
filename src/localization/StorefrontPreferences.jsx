import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CURRENCIES, LANGUAGES, useStorefront } from './StorefrontContext.jsx';
import './StorefrontPreferences.css';

function PreferenceMenu({ label, value, options, onChange, children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const current = options.find(item => item.code === value) || options[0];
  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector('[aria-checked="true"]:not(:disabled)')?.focus();
  }, [open]);

  return <div ref={root} className="storefront-preference" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...root.current.querySelectorAll('[role="menuitemradio"]:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }}>
    <button ref={trigger} type="button" className="storefront-preference__trigger" aria-label={`${label}: ${current.short || current.code}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(previous => !previous)} onKeyDown={event => {
        if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); }
      }}>
      <img className="storefront-flag" src={`/flags/${current.flag}.svg`} alt="" width="22" height="16" />
      <span>{current.short || current.code}</span><ChevronDown size={12} aria-hidden="true" />
    </button>
    {open && <div className="storefront-preference__panel">
      <div id={id} role="menu" aria-label={label}>
        {options.map(option => <button key={option.code} type="button" role="menuitemradio" aria-checked={option.code === value} disabled={option.disabled}
          className="storefront-preference__option" onClick={() => { onChange(option.code); close(); }}>
          <img className="storefront-flag" src={`/flags/${option.flag}.svg`} alt="" width="22" height="16" />
          <span>{option.label}</span><span className="storefront-preference__code">{option.short || option.code}</span>
          {option.code === value && <Check size={14} aria-hidden="true" />}
        </button>)}
      </div>
      {children}
    </div>}
  </div>;
}

export default function StorefrontPreferences() {
  const { language, displayCurrency, setLanguage, setCurrency, eurRsdRate, rateStatus, retryRate, t } = useStorefront();
  return <div className="storefront-preferences-bar">
    <div className="container storefront-preferences" aria-label={t('Jezik i valuta')}>
      <PreferenceMenu label={t('Jezik')} value={language} options={LANGUAGES} onChange={setLanguage} />
      <span className="storefront-preferences__divider" aria-hidden="true" />
      <PreferenceMenu label={t('Valuta')} value={displayCurrency} options={CURRENCIES.map(item => ({ ...item, label: t(item.label), disabled: item.code === 'EUR' && !eurRsdRate }))} onChange={setCurrency}>
        <p className="storefront-preference__note" role="status">{t(rateStatus === 'loading' ? 'Učitavanje kursa…' : rateStatus === 'error' ? 'EUR kurs trenutno nije dostupan. Cene su prikazane u RSD.' : 'EUR cene su informativne. Plaćanje je u RSD.')}</p>
        {rateStatus === 'error' && <button type="button" className="storefront-preference__retry" onClick={retryRate}>{t('Pokušaj ponovo')}</button>}
      </PreferenceMenu>
    </div>
  </div>;
}
