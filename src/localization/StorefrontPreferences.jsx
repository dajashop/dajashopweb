import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CURRENCIES, LANGUAGES, useStorefront } from './StorefrontContext.jsx';
import { localizedPath } from './paths.js';
import './StorefrontPreferences.css';

export default function StorefrontPreferences() {
  const { language, locale, displayCurrency, setLanguage, setCurrency, eurRsdRate, rateDate, rateStatus, retryRate, t } = useStorefront();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const location = useLocation();
  const current = LANGUAGES.find(item => item.code === language) || LANGUAGES[0];
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const formattedDate = rateDate && /^\d{4}-\d{2}-\d{2}$/.test(rateDate)
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${rateDate}T00:00:00Z`)) : '';

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector('[role="menuitemradio"][aria-checked="true"]')?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div ref={root} className="storefront-preference" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = [...root.current.querySelectorAll('[role="menuitemradio"]:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
    options[next]?.focus();
  }}>
    <button ref={trigger} type="button" className="storefront-preference__trigger" title={t('Jezik i valuta')}
      aria-label={`${t('Jezik i valuta')}: ${current.label}, ${displayCurrency}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(previous => !previous)} onKeyDown={event => {
        if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setOpen(true); }
      }}>
      <img className="storefront-flag" src={`/flags/${current.flag}.svg`} alt="" width="24" height="16" />
      <ChevronDown className="storefront-preference__chevron" size={10} strokeWidth={2} aria-hidden="true" />
    </button>
    {open && <div id={id} className="storefront-preference__panel" role="menu" aria-label={t('Jezik i valuta')}>
      <div role="group" aria-labelledby={`${id}-language`}>
        <p id={`${id}-language`} className="storefront-preference__heading">{t('Jezik')}</p>
        {LANGUAGES.map(option => <a key={option.code} role="menuitemradio" aria-checked={option.code === language} lang={option.code} hrefLang={option.code}
          href={localizedPath(`${location.pathname}${location.search}${location.hash}`, option.code)} className="storefront-preference__option"
          onClick={event => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); close(); setLanguage(option.code);
          }}>
          <img className="storefront-flag" src={`/flags/${option.flag}.svg`} alt="" width="24" height="16" />
          <span>{option.label}</span><span className="storefront-preference__code">{option.short}</span>
          {option.code === language && <Check size={14} aria-hidden="true" />}
        </a>)}
      </div>
      <div role="group" aria-labelledby={`${id}-currency`} className="storefront-preference__currency">
        <p id={`${id}-currency`} className="storefront-preference__heading">{t('Valuta')}</p>
        {CURRENCIES.map(option => <button key={option.code} type="button" role="menuitemradio" aria-checked={option.code === displayCurrency}
          disabled={option.code === 'EUR' && !eurRsdRate} className="storefront-preference__option" onClick={() => setCurrency(option.code)}>
          <span>{t(option.label)}</span><span className="storefront-preference__code">{option.code}</span>
          {option.code === displayCurrency && <Check size={14} aria-hidden="true" />}
        </button>)}
      </div>
      {eurRsdRate && <p className="storefront-preference__rate">
        <span>1 EUR = {new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(eurRsdRate)} RSD</span>
        <a href="https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate" target="_blank" rel="noopener noreferrer">{t('Zvanični srednji kurs NBS')}{formattedDate ? ` · ${formattedDate}` : ''}</a>
      </p>}
      <p className="storefront-preference__note" role="status">{t(rateStatus === 'loading' ? 'Učitavanje kursa…' : rateStatus === 'error' ? 'EUR kurs trenutno nije dostupan. Cene su prikazane u RSD.' : 'EUR cene su informativne. Plaćanje je u RSD.')}</p>
      {rateStatus === 'error' && <button type="button" className="storefront-preference__retry" onClick={retryRate}>{t('Pokušaj ponovo')}</button>}
    </div>}
  </div>;
}
