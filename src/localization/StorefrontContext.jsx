import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/apiClient.js';
import { isNecessaryStorageAllowed, readStoredValue, writeStoredValue } from '../services/consentStorage.js';
import { formatMoney } from '../utils/currency.js';
import { translate } from './translate.js';

export const LANGUAGES = [
  { code: 'sr', label: 'Srpski', short: 'SR', flag: 'rs', locale: 'sr-RS' },
  { code: 'en', label: 'English', short: 'EN', flag: 'gb', locale: 'en-GB' },
];
export const CURRENCIES = [
  { code: 'RSD', label: 'Srpski dinar', flag: 'rs' },
  { code: 'EUR', label: 'Evro', flag: 'eu' },
];
const LANGUAGE_KEY = 'dajashop_language';
const CURRENCY_KEY = 'dajashop_currency';
const StorefrontContext = createContext(null);

export function StorefrontProvider({ children }) {
  // Match Serbian/RSD SSR on the first client render before restoring choices.
  const [language, updateLanguage] = useState('sr');
  const [currency, updateCurrency] = useState('RSD');
  const [eurRsdRate, setEurRsdRate] = useState(null);
  const [rateStatus, setRateStatus] = useState('loading');
  const [rateAttempt, setRateAttempt] = useState(0);
  const chosen = useRef({ language: null, currency: null });
  const restored = useRef(false);
  const locale = LANGUAGES.find(item => item.code === language)?.locale || 'sr-RS';
  const displayCurrency = currency === 'EUR' && eurRsdRate ? 'EUR' : 'RSD';

  const setLanguage = useCallback(code => {
    if (!LANGUAGES.some(item => item.code === code)) return;
    chosen.current.language = code;
    updateLanguage(code);
    writeStoredValue(LANGUAGE_KEY, code);
  }, []);
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
      const savedLanguage = chosen.current.language || readStoredValue(LANGUAGE_KEY);
      const savedCurrency = chosen.current.currency || readStoredValue(CURRENCY_KEY);
      if (LANGUAGES.some(item => item.code === savedLanguage)) updateLanguage(savedLanguage);
      if (CURRENCIES.some(item => item.code === savedCurrency)) updateCurrency(savedCurrency);
      if (chosen.current.language) writeStoredValue(LANGUAGE_KEY, chosen.current.language);
      if (chosen.current.currency) writeStoredValue(CURRENCY_KEY, chosen.current.currency);
    };
    const sync = event => {
      if (!isNecessaryStorageAllowed()) return;
      if (event.key === LANGUAGE_KEY && LANGUAGES.some(item => item.code === event.newValue)) updateLanguage(event.newValue);
      if (event.key === CURRENCY_KEY && CURRENCIES.some(item => item.code === event.newValue)) updateCurrency(event.newValue);
    };
    restore();
    window.addEventListener('daja:consent-state', restore);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('daja:consent-state', restore);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setRateStatus('loading');
    fetch(`${API_BASE_URL}/public/catalog/exchange-rates`, { signal: controller.signal, credentials: 'omit' })
      .then(response => { if (!response.ok) throw new Error('Exchange rate unavailable'); return response.json(); })
      .then(data => {
        const rate = Number(data.eurRsdRate);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid exchange rate');
        if (active) { setEurRsdRate(rate); setRateStatus('ready'); }
      })
      .catch(() => { if (active) { setEurRsdRate(null); setRateStatus('error'); } })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [rateAttempt]);

  const t = useCallback((value, parameters) => translate(value, language, parameters), [language]);
  const money = useCallback(amount => formatMoney(amount, { locale, currency: displayCurrency, eurRsdRate }), [locale, displayCurrency, eurRsdRate]);
  const moneyRsd = useCallback(amount => formatMoney(amount, { locale, currency: 'RSD' }), [locale]);
  const retryRate = useCallback(() => setRateAttempt(value => value + 1), []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    const interval = setInterval(retryRate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [retryRate]);
  const value = useMemo(() => ({ language, locale, currency, displayCurrency, setLanguage, setCurrency, eurRsdRate, rateStatus, retryRate, t, money, moneyRsd }),
    [language, locale, currency, displayCurrency, setLanguage, setCurrency, eurRsdRate, rateStatus, retryRate, t, money, moneyRsd]);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('useStorefront requires StorefrontProvider');
  return context;
}
