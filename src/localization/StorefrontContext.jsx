import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/apiClient.js';
import { isNecessaryStorageAllowed, readStoredValue, writeStoredValue } from '../services/consentStorage.js';
import { formatMoney } from '../utils/currency.js';
import { translate } from './translate.js';
import { useLocation } from 'react-router-dom';
import { localizedPath } from './paths.js';

export const LANGUAGES = [
  { code: 'sr', label: 'Srpski', short: 'SR', flag: 'rs', locale: 'sr-RS' },
  { code: 'en', label: 'English', short: 'EN', flag: 'gb', locale: 'en-GB' },
];
export const CURRENCIES = [
  { code: 'RSD', label: 'Srpski dinar', flag: 'rs' },
  { code: 'EUR', label: 'Evro', flag: 'eu' },
  { code: 'USD', label: 'Američki dolar' },
  { code: 'BAM', label: 'Konvertibilna marka (KM)' },
  { code: 'MKD', label: 'Makedonski denar' },
  { code: 'CHF', label: 'Švajcarski franak' },
];
const LANGUAGE_KEY = 'dajashop_language';
const CURRENCY_KEY = 'dajashop_currency';
const StorefrontContext = createContext(null);

export function StorefrontProvider({ children, initialLanguage = 'sr' }) {
  // Language follows the URL on the server and client; stored preferences
  // must never silently change the language of an indexed page.
  const language = initialLanguage === 'en' ? 'en' : 'sr';
  const location = useLocation();
  const [currency, updateCurrency] = useState('RSD');
  const [rates, setRates] = useState({ RSD: 1 });
  const [rateDate, setRateDate] = useState(null);
  const [rateStatus, setRateStatus] = useState('loading');
  const [rateAttempt, setRateAttempt] = useState(0);
  const chosen = useRef({ currency: null });
  const restored = useRef(false);
  const locale = LANGUAGES.find(item => item.code === language)?.locale || 'sr-RS';
  const displayCurrency = rates[currency] > 0 ? currency : 'RSD';

  const setLanguage = useCallback(code => {
    if (!LANGUAGES.some(item => item.code === code)) return;
    writeStoredValue(LANGUAGE_KEY, code);
    if (code !== language) window.location.assign(localizedPath(`${location.pathname}${location.search}${location.hash}`, code));
  }, [language, location.pathname, location.search, location.hash]);
  const setCurrency = useCallback(code => {
    if (!CURRENCIES.some(item => item.code === code)) return;
    chosen.current.currency = code;
    updateCurrency(code);
    writeStoredValue(CURRENCY_KEY, code);
  }, []);

  useEffect(() => {
    const restore = () => {
      if (!isNecessaryStorageAllowed() || restored.current) return;
      restored.current = true;
      const savedCurrency = chosen.current.currency || readStoredValue(CURRENCY_KEY);
      if (CURRENCIES.some(item => item.code === savedCurrency)) updateCurrency(savedCurrency);
      writeStoredValue(LANGUAGE_KEY, language);
      if (chosen.current.currency) writeStoredValue(CURRENCY_KEY, chosen.current.currency);
    };
    const sync = event => {
      if (!isNecessaryStorageAllowed()) return;
      if (event.key === CURRENCY_KEY && CURRENCIES.some(item => item.code === event.newValue)) updateCurrency(event.newValue);
    };
    restore();
    window.addEventListener('daja:consent-state', restore);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('daja:consent-state', restore);
      window.removeEventListener('storage', sync);
    };
  }, [language]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setRateStatus('loading');
    fetch(`${API_BASE_URL}/public/catalog/exchange-rates`, { signal: controller.signal, credentials: 'omit' })
      .then(response => { if (!response.ok) throw new Error('Exchange rate unavailable'); return response.json(); })
      .then(payload => {
        const data = payload?.data ?? payload;
        const nextRates = { RSD: 1 };
        for (const { code } of CURRENCIES) {
          if (code === 'RSD') continue;
          const rate = Number(data?.rates?.[code] ?? (code === 'EUR' && data?.eurRsdRate > 0 ? 1 / data.eurRsdRate : NaN));
          if (Number.isFinite(rate) && rate > 0) nextRates[code] = rate;
        }
        if (Object.keys(nextRates).length === 1) throw new Error('Invalid exchange rates');
        if (active) { setRates(nextRates); setRateDate(data.asOf || null); setRateStatus('ready'); }
      })
      .catch(() => { if (active) { setRates({ RSD: 1 }); setRateStatus('error'); } })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [rateAttempt]);

  const t = useCallback((value, parameters) => translate(value, language, parameters), [language]);
  const money = useCallback(amount => formatMoney(amount, { locale, currency: displayCurrency, rates }), [locale, displayCurrency, rates]);
  const moneyRsd = useCallback(amount => formatMoney(amount, { locale, currency: 'RSD' }), [locale]);
  const retryRate = useCallback(() => setRateAttempt(value => value + 1), []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    const interval = setInterval(retryRate, 15 * 60 * 1000);
    const visible = () => { if (document.visibilityState === 'visible') retryRate(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
  }, [retryRate]);
  const localizePath = useCallback(value => localizedPath(value, language), [language]);
  const value = useMemo(() => ({ language, locale, currency, displayCurrency, setLanguage, setCurrency, rates, rateDate, rateStatus, retryRate, t, money, moneyRsd, localizePath }),
    [language, locale, currency, displayCurrency, setLanguage, setCurrency, rates, rateDate, rateStatus, retryRate, t, money, moneyRsd, localizePath]);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('useStorefront requires StorefrontProvider');
  return context;
}
