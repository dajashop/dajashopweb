import { useId } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CURRENCIES, LANGUAGES, useStorefront } from './StorefrontContext.jsx';
import { localizedPath } from './paths.js';
import './MobileStorefrontPreferences.css';

export default function MobileStorefrontPreferences() {
  const { language, locale, displayCurrency, setLanguage, setCurrency, rates, rateDate, rateStatus, retryRate, t } = useStorefront();
  const location = useLocation();
  const id = useId();
  const currentCurrency = CURRENCIES.find(option => option.code === displayCurrency) || CURRENCIES[0];
  const quoteCurrency = displayCurrency === 'RSD' ? 'EUR' : displayCurrency;
  const quoteRate = rates[quoteCurrency] > 0 ? 1 / rates[quoteCurrency] : null;
  const formattedDate = rateDate && /^\d{4}-\d{2}-\d{2}$/.test(rateDate)
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${rateDate}T00:00:00Z`)) : '';

  return <section className="mobile-preferences" aria-label={t('Jezik i valuta')}>
    <div role="group" aria-labelledby={`${id}-language`}>
      <p id={`${id}-language`} className="mobile-preferences__heading">{t('Jezik')}</p>
      <div className="mobile-preferences__languages">
        {LANGUAGES.map(option => <a key={option.code}
          className="mobile-preferences__language" lang={option.code} hrefLang={option.code}
          aria-current={option.code === language ? 'true' : undefined}
          href={localizedPath(`${location.pathname}${location.search}${location.hash}`, option.code)}
          onClick={event => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setLanguage(option.code);
          }}>
          <img src={`/flags/${option.flag}.svg`} alt="" width="24" height="16" />
          <span>{option.label}</span>
          <Check className="mobile-preferences__check" size={15} strokeWidth={2.5} aria-hidden="true" />
        </a>)}
      </div>
    </div>

    <details className="mobile-preferences__currency">
      <summary>
        <span>{t('Valuta')}</span>
        <strong>{currentCurrency.code} <span>{currentCurrency.symbol}</span></strong>
        <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
      </summary>
      <div className="mobile-preferences__currency-options">
        <div className="mobile-preferences__currencies" role="group" aria-label={t('Valuta')}>
          {CURRENCIES.map(option => <button key={option.code} type="button"
            className="mobile-preferences__currency-option" aria-pressed={option.code === displayCurrency}
            disabled={!rates[option.code]} onClick={() => setCurrency(option.code)}>
            <strong>{option.code} <span>{option.symbol}</span></strong>
            <Check className="mobile-preferences__check" size={15} strokeWidth={2.5} aria-hidden="true" />
            <span className="mobile-preferences__currency-name">{t(option.label)}</span>
          </button>)}
        </div>
        <div className="mobile-preferences__rate">
          {quoteRate && <a href="https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate" target="_blank" rel="noopener noreferrer">
            <strong>1 {quoteCurrency} = {new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(quoteRate)} RSD</strong>
            <span>{t('Zvanični srednji kurs NBS')}{formattedDate && <> · <time dateTime={rateDate}>{formattedDate}</time></>}</span>
          </a>}
          <p role="status">{t(rateStatus === 'loading' ? 'Učitavanje kursa…' : rateStatus === 'error' ? 'Kursevi trenutno nisu dostupni. Cene su prikazane u RSD.' : 'Cene u stranoj valuti su informativne. Plaćanje je u RSD.')}</p>
          {rateStatus === 'error' && <button type="button" onClick={retryRate}>{t('Pokušaj ponovo')}</button>}
        </div>
      </div>
    </details>
  </section>;
}
