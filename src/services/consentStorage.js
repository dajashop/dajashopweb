const OPTIONAL_STORAGE_KEYS = [
  'theme',
  'daja_last_login',
  'dajashop_newsletter_seen',
  'dajashop_product_alert_subscriptions',
  'dajashop_product_alert_preferences'
];

let state = {
  ready: false,
  preferences: false,
  externalGoogle: false,
};

export function setConsentStorageState(next) {
  state = {
    ready: Boolean(next?.ready),
    preferences: Boolean(next?.preferences),
    externalGoogle: Boolean(next?.externalGoogle),
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
  return state.ready && state.preferences;
}

export function isGoogleAllowed() {
  return state.ready && state.externalGoogle;
}

export function readStoredValue(key, category = 'necessary') {
  if (!allowed(category) || typeof window === 'undefined') return null;
  try {
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
    } else {
      window.localStorage.setItem(key, String(value));
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
