const OPTIONAL_STORAGE_KEYS = [
  'theme',
  'dajashop_search_history',
  'daja_last_login',
  'dajashop_newsletter_seen',
  'dajashop_product_alert_subscriptions',
  'dajashop_product_alert_preferences',
  'engraving-auto-suggestions'
];

export const CONSENT_VERSION = '2026-11-23-privacy-storage-v1';
export const CONSENT_MAX_AGE = 180 * 86400_000;
const EXPIRY_PREFIX = 'daja:preference-expiry:';

export function validConsentRecord(record, version = CONSENT_VERSION) {
  return Boolean(record?.receipt && record.version === version &&
    Number.isFinite(record.expiresAt) && record.expiresAt > Date.now() &&
    record.expiresAt <= Date.now() + CONSENT_MAX_AGE + 60_000);
}

// Restore only consent for the bundled policy version before catalogue effects
// start. This avoids a network prerequisite for an already permitted disk read.
const initialReceipt = readConsentRecord();
const initialValid = validConsentRecord(initialReceipt);
let state = {
  ready: initialValid,
  preferences: initialValid && initialReceipt.categories?.preferences === true,
  externalGoogle: initialValid && initialReceipt.categories?.externalGoogle === true,
  analytics: initialValid && initialReceipt.categories?.analytics === true,
};

export function setConsentStorageState(next) {
  state = {
    ready: Boolean(next?.ready),
    preferences: Boolean(next?.preferences),
    externalGoogle: Boolean(next?.externalGoogle),
    analytics: Boolean(next?.analytics),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('daja:consent-state', { detail: state }));
  }
}

export function consentStorageState() {
  return state;
}

export function isNecessaryStorageAllowed() {
  return state.ready;
}

export function isPreferenceStorageAllowed() {
  return state.ready && state.preferences && validConsentRecord(readConsentRecord());
}

export function isGoogleAllowed() {
  return state.ready && state.externalGoogle && validConsentRecord(readConsentRecord());
}

export function isAnalyticsAllowed() {
  return state.ready && state.analytics && validConsentRecord(readConsentRecord());
}

export function readStoredValue(key, category = 'necessary') {
  if (!allowed(category) || typeof window === 'undefined') return null;
  try {
    const expiresAt = Number(window.localStorage.getItem(EXPIRY_PREFIX + key));
    if (category === 'preferences' && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) {
      removeStoredValue(key);
      return null;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredValue(key, value, category = 'necessary') {
  if (!allowed(category) || typeof window === 'undefined') return false;
  try {
    if (value === null || value === undefined || value === '') {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(EXPIRY_PREFIX + key);
    } else {
      window.localStorage.setItem(key, String(value));
      if (category === 'preferences') window.localStorage.setItem(EXPIRY_PREFIX + key,
        String(Date.now() + (key === 'daja_last_login' ? 30 * 86400_000 : CONSENT_MAX_AGE)));
    }
    return true;
  } catch {
    return false;
  }
}

export function removeStoredValue(key) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(EXPIRY_PREFIX + key);
  } catch {
    // Storage is unavailable in some private browser contexts.
  }
}

export function readSessionValue(key, category = 'necessary') {
  if (!allowed(category) || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionValue(key, value, category = 'necessary') {
  if (!allowed(category) || typeof window === 'undefined') return false;
  try {
    if (value === null || value === undefined || value === '') {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, String(value));
    }
    return true;
  } catch {
    return false;
  }
}

export function clearOptionalStorage() {
  if (typeof window === 'undefined') return;
  OPTIONAL_STORAGE_KEYS.forEach(removeStoredValue);
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith('daja_workforce_layout:') || key.startsWith(EXPIRY_PREFIX)).forEach(removeStoredValue);
  } catch {
    // Optional layout storage may be unavailable.
  }
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith('catalog-scroll:'))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Session storage can be blocked independently from local storage.
  }
}

export function readConsentRecord() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('dajashop_privacy_receipt');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeConsentRecord(record) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('dajashop_privacy_receipt', JSON.stringify(record));
  } catch {
    // Without this necessary receipt, the modal will reappear on reload.
  }
}

function allowed(category) {
  return category === 'preferences'
    ? isPreferenceStorageAllowed()
    : isNecessaryStorageAllowed();
}
