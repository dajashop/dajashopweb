import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CURRENCIES, LANGUAGES, useStorefront } from './StorefrontContext.jsx';
import { localizedPath } from './paths.js';
import HeaderDropdown from '../components/ui/HeaderDropdown.jsx';
import './StorefrontPreferences.css';

export default function StorefrontPreferences() {
  const { language, locale, displayCurrency, setLanguage, setCurrency, rates, rateDate, rateStatus, retryRate, t } = useStorefront();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const id = useId();
  const location = useLocation();
  const current = LANGUAGES.find(item => item.code === language) || LANGUAGES[0];
  const quoteCurrency = displayCurrency === 'RSD' ? 'EUR' : displayCurrency;
  const quoteRate = rates[quoteCurrency] > 0 ? 1 / rates[quoteCurrency] : null;
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const formattedDate = rateDate && /^\d{4}-\d{2}-\d{2}$/.test(rateDate)
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${rateDate}T00:00:00Z`)) : '';

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('[role="menuitemradio"][aria-checked="true"]')?.focus();
    const outside = event => { if (!root.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div ref={root} className="storefront-preference" onBlur={event => {
    if (!root.current?.contains(event.relatedTarget) && !panel.current?.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!open || !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = [...(panel.current?.querySelectorAll('[role="menuitemradio"]:not(:disabled)') || [])];
    const index = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1) + options.length) % options.length;
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
    <HeaderDropdown open={open} anchorRef={trigger} panelRef={panel} id={id} label={t('Jezik i valuta')}>
      <div role="group" aria-labelledby={`${id}-language`} className="header-dropdown__group">
        <p id={`${id}-language`} className="header-dropdown__heading">{t('Jezik')}</p>
        <div className="storefront-preference__languages">
        {LANGUAGES.map(option => <a key={option.code} role="menuitemradio" aria-checked={option.code === language} lang={option.code} hrefLang={option.code}
          href={localizedPath(`${location.pathname}${location.search}${location.hash}`, option.code)} className="header-dropdown__item storefront-preference__language"
          onClick={event => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); close(); setLanguage(option.code);
          }}>
          <img className="storefront-flag" src={`/flags/${option.flag}.svg`} alt="" width="24" height="16" />
          <span>{option.label}</span>
          <span className="storefront-preference__check" aria-hidden="true">{option.code === language && <Check size={10} strokeWidth={3} />}</span>
        </a>)}
        </div>
      </div>
      <div className="header-dropdown__separator" role="separator" />
      <div role="group" aria-labelledby={`${id}-currency`} className="header-dropdown__group">
        <p id={`${id}-currency`} className="header-dropdown__heading">{t('Valuta')}</p>
        <div className="storefront-preference__currencies">
        {CURRENCIES.map(option => <button key={option.code} type="button" role="menuitemradio" aria-checked={option.code === displayCurrency}
          disabled={!rates[option.code]} className="header-dropdown__item storefront-preference__currency" onClick={() => setCurrency(option.code)}>
          <span className="storefront-preference__currency-code">{option.code}</span>
          <span className="storefront-preference__check" aria-hidden="true">{option.code === displayCurrency && <Check size={10} strokeWidth={3} />}</span>
          <span className="storefront-preference__currency-name">{t(option.label)}</span>
        </button>)}
        </div>
      </div>
      <div className="storefront-preference__footer">
      {quoteRate && <a className="storefront-preference__rate" href="https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate" target="_blank" rel="noopener noreferrer">
        <strong>1 {quoteCurrency} = {new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(quoteRate)} RSD</strong>
        <span className="storefront-preference__rate-meta"><span>{t('Zvanični srednji kurs NBS')}</span>{formattedDate && <time dateTime={rateDate}>{formattedDate}</time>}</span>
      </a>}
      <p className="storefront-preference__note" role="status">{t(rateStatus === 'loading' ? 'Učitavanje kursa…' : rateStatus === 'error' ? 'Kursevi trenutno nisu dostupni. Cene su prikazane u RSD.' : 'Cene u stranoj valuti su informativne. Plaćanje je u RSD.')}</p>
      {rateStatus === 'error' && <button type="button" className="storefront-preference__retry" onClick={retryRate}>{t('Pokušaj ponovo')}</button>}
      </div>
    </HeaderDropdown>
  </div>;
}
