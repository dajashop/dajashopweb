import * as legacy from './apiClientLegacy.js';
import { safeApiErrorMessage } from './publicApiError.js';
import { translate } from '../localization/translate.js';
import { pathLanguage } from '../localization/paths.js';

// Explicit rollback switch. New web builds use same-origin HttpOnly cookies.
export const BROWSER_SESSIONS_ENABLED = import.meta.env.VITE_DAJA_BROWSER_SESSIONS !== 'false';
export const API_BASE_URL = BROWSER_SESSIONS_ENABLED ? '/api/v1' : legacy.API_BASE_URL;
let initialized = false;
let initializing;
let customer = false;
let staff = false;
let expiresAt = 0;
let staffExpiresAt = 0;
let refreshing;
let staffRefreshing;
const authListeners = new Set();
const staffListeners = new Set();
let sessionChannel;
function publishSessionChange() { sessionChannel?.postMessage('changed'); }

function csrfCookie() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('__Host-daja_csrf='))?.slice('__Host-daja_csrf='.length) || '';
}
const emit = listeners => listeners.forEach(listener => listener());
const subscribe = (listeners, listener) => { listeners.add(listener); return () => listeners.delete(listener); };
function discardLegacyTokens() {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const storage = window[name];
      for (const key of ['daja_customer_access_token', 'daja_customer_refresh_token', 'daja_staff_access_token', 'daja_customer_refresh_lock']) storage.removeItem(key);
    } catch { /* Cookies work without JavaScript storage. */ }
  }
}
function unpack(body) { return body && 'data' in body && 'meta' in body ? body.data : body; }
async function read(response) {
  const body = /application\/json/i.test(response.headers.get('content-type') || '') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(translate(safeApiErrorMessage(response.status, body), typeof window === 'undefined' ? 'sr' : pathLanguage(window.location.pathname)));
    error.status = response.status; error.code = body?.error?.code;
    throw error;
  }
  return unpack(body);
}

export async function initializeBrowserSession(force = false) {
  if (!BROWSER_SESSIONS_ENABLED) return;
  if (!force && initialized && csrfCookie()) return;
  initializing ??= (async () => {
    discardLegacyTokens();
    const response = await fetch(`${API_BASE_URL}/customer-auth/browser-session`, {
      credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000)
    });
    const data = await read(response);
    customer = data?.webSession === true;
    staff = data?.staffSession === true;
    staffExpiresAt = 0;
    expiresAt = Date.now() + Number(data?.expiresIn || 0) * 1000;
    initialized = true;
  })().finally(() => { initializing = undefined; });
  return initializing;
}

export function getAccessToken() { return BROWSER_SESSIONS_ENABLED ? (customer ? 'cookie-customer-session' : null) : legacy.getAccessToken(); }
export function getRefreshToken() { return BROWSER_SESSIONS_ENABLED ? null : legacy.getRefreshToken(); }
export function getStaffAccessToken() { return BROWSER_SESSIONS_ENABLED ? (staff ? 'cookie-staff-session' : null) : legacy.getStaffAccessToken(); }
export function onAuthTokenChange(listener) {
  if (!BROWSER_SESSIONS_ENABLED) return legacy.onAuthTokenChange(listener);
  if (!sessionChannel && typeof BroadcastChannel !== 'undefined') {
    sessionChannel = new BroadcastChannel('daja-cookie-session-events');
    sessionChannel.onmessage = () => {
      initialized = false;
      void initializeBrowserSession(true).then(() => { emit(authListeners); emit(staffListeners); }).catch(() => {});
    };
  }
  return subscribe(authListeners, listener);
}
export function onStaffAccessTokenChange(listener) { return BROWSER_SESSIONS_ENABLED ? subscribe(staffListeners, listener) : legacy.onStaffAccessTokenChange(listener); }
export function setAuthTokens(data = {}, { notify = true } = {}) {
  if (!BROWSER_SESSIONS_ENABLED) return legacy.setAuthTokens(data, { notify });
  customer = data.webSession === true;
  expiresAt = Date.now() + Number(data.expiresIn || 900) * 1000;
  if (notify) { staff = false; emit(staffListeners); emit(authListeners); publishSessionChange(); }
}
export function setStaffAccessToken(value, expiresIn = 900) {
  if (!BROWSER_SESSIONS_ENABLED) return legacy.setStaffAccessToken(value);
  const next = value === true;
  staffExpiresAt = next ? Date.now() + Number(expiresIn) * 1000 : 0;
  if (!next && staff === next) return;
  staff = next; emit(staffListeners);
}
export function clearAuthTokens() {
  if (!BROWSER_SESSIONS_ENABLED) return legacy.clearAuthTokens();
  customer = false; staff = false; initialized = false; expiresAt = 0;
  discardLegacyTokens(); emit(authListeners); emit(staffListeners);
  publishSessionChange();
}

async function refreshCustomer() {
  refreshing ??= (async () => {
    const operation = async () => {
      await initializeBrowserSession();
      const response = await fetch(`${API_BASE_URL}/customer-auth/refresh`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Daja-CSRF': csrfCookie() },
        body: '{}', signal: AbortSignal.timeout(20_000)
      });
      const data = await read(response); setAuthTokens(data, { notify: false });
    };
    await withSessionLock(operation);
  })().catch(error => {
    if (error.status === 401 || error.status === 403) clearAuthTokens();
    throw error;
  }).finally(() => { refreshing = undefined; });
  return refreshing;
}
async function withSessionLock(operation) {
  if (navigator.locks?.request) return navigator.locks.request('daja-cookie-session-refresh', operation);
  const key = 'daja_cookie_session_lock'; const owner = crypto.randomUUID();
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    let held;
    try {
      const current = JSON.parse(localStorage.getItem(key) || 'null');
      if (!current || current.expiresAt <= Date.now()) {
        localStorage.setItem(key, JSON.stringify({ owner, expiresAt: Date.now() + 60_000 }));
        held = JSON.parse(localStorage.getItem(key) || 'null')?.owner === owner;
      }
    } catch { throw new Error(translate('Usluga je privremeno nedostupna. Pokušajte ponovo kasnije.', pathLanguage(window.location.pathname))); }
    if (held) {
      try { return await operation(); }
      finally { if (JSON.parse(localStorage.getItem(key) || 'null')?.owner === owner) localStorage.removeItem(key); }
    }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error(translate('Usluga je privremeno nedostupna. Pokušajte ponovo kasnije.', pathLanguage(window.location.pathname)));
}
async function refreshStaff() {
  staffRefreshing ??= (async () => {
    let deviceId;
    try { deviceId = localStorage.getItem('daja_staff_device_id'); } catch { /* Optional. */ }
    deviceId ||= crypto.randomUUID();
    try { localStorage.setItem('daja_staff_device_id', deviceId); } catch { /* Optional. */ }
    const data = await apiRequest('/customer-auth/admin/session', { method: 'POST', body: { deviceId } });
    setStaffAccessToken(data?.staffSession === true, data?.expiresIn);
  })().catch(error => { if (error.status === 401 || error.status === 403) setStaffAccessToken(false); throw error; }).finally(() => { staffRefreshing = undefined; });
  return staffRefreshing;
}
export async function resumeAuthSession() {
  if (!BROWSER_SESSIONS_ENABLED) return legacy.resumeAuthSession();
  await initializeBrowserSession();
  if (customer && expiresAt <= Date.now() + 30_000) await refreshCustomer();
  if (customer && staff && staffExpiresAt <= Date.now() + 30_000) await refreshStaff();
}

export async function apiRequest(path, options = {}) {
  if (!BROWSER_SESSIONS_ENABLED) return legacy.apiRequest(path, options);
  const { method = 'GET', query, body, headers = {}, auth = true, staff: staffRequest = false, retry = true, signal } = options;
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  const changesSession = mutation && /^\/customer-auth\/(?:login|register|phone\/verify|logout)$/.test(path);
  if (changesSession && !options.sessionLocked) return withSessionLock(() => apiRequest(path, { ...options, sessionLocked: true }));
  if (auth || mutation) await initializeBrowserSession();
  if (auth && customer && !changesSession && expiresAt <= Date.now() + 30_000 && !path.startsWith('/customer-auth/refresh')) await refreshCustomer();
  if (auth && staffRequest && (!staff || staffExpiresAt <= Date.now() + 30_000)) await refreshStaff();
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value == null || value === '') continue;
    for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, item);
  }
  const requestHeaders = new Headers(headers);
  requestHeaders.delete('Authorization');
  if (staffRequest) requestHeaders.set('X-Daja-Session-Kind', 'staff');
  if (mutation) requestHeaders.set('X-Daja-CSRF', csrfCookie());
  let payload = body;
  if (body != null && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== 'string') {
    requestHeaders.set('Content-Type', 'application/json'); payload = JSON.stringify(body);
  }
  const response = await fetch(url, {
    method, headers: requestHeaders, body: payload,
    credentials: auth || mutation ? 'same-origin' : 'omit', signal
  });
  if (response.status === 401 && auth && retry && !changesSession) {
    if (staffRequest) await refreshStaff(); else await refreshCustomer();
    return apiRequest(path, { ...options, retry: false });
  }
  return read(response);
}
export const toArrayPayload = legacy.toArrayPayload;
