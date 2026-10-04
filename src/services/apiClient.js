const DEFAULT_BASE_URL = 'https://daja-platform-api.onrender.com/api/v1';
const API_BASE_URL = (
  import.meta.env.VITE_DAJA_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, '');

const ACCESS_KEY = 'daja_customer_access_token';
const REFRESH_KEY = 'daja_customer_refresh_token';
const STAFF_ACCESS_KEY = 'daja_staff_access_token';
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 30_000;
const SESSION_REQUEST_TIMEOUT_MS = 20_000;
const CUSTOMER_REFRESH_LOCK_KEY = 'daja_customer_refresh_lock';
const CUSTOMER_REFRESH_LOCK_TIMEOUT_MS = 25_000;
const CUSTOMER_REFRESH_LOCK_TTL_MS = 60_000;
const CUSTOMER_REFRESH_LOCK_RETRY_MS = 80;

let refreshPromise = null;
let staffRefreshPromise = null;
const authListeners = new Set();
const staffTokenListeners = new Set();
const customerRefreshLockOwner =
  import.meta.env.SSR ? 'server-render' :
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `daja-refresh-${Math.random().toString(36).slice(2)}`;

function readStorage(key) {
  return readStoredValue(key, 'necessary');
}

function writeStorage(key, value) {
  writeStoredValue(key, value, 'necessary');
}

function emitAuthChange() {
  authListeners.forEach((listener) => listener());
}

function emitStaffTokenChange() {
  staffTokenListeners.forEach((listener) => listener());
}

export function getAccessToken() {
  return readStorage(ACCESS_KEY);
}

export function getRefreshToken() {
  return readStorage(REFRESH_KEY);
}

export function getStaffAccessToken() {
  return readStorage(STAFF_ACCESS_KEY);
}

export function setAuthTokens(tokens = {}, { notify = true } = {}) {
  const accessToken = tokens.accessToken || tokens.access_token || null;
  const refreshToken = tokens.refreshToken || tokens.refresh_token || null;
  const changed = getAccessToken() !== accessToken || getRefreshToken() !== refreshToken;
  writeStorage(ACCESS_KEY, accessToken);
  writeStorage(REFRESH_KEY, refreshToken);
  if (changed && notify) emitAuthChange();
}

export function setStaffAccessToken(accessToken) {
  const nextToken = accessToken || null;
  if (getStaffAccessToken() === nextToken) return;
  writeStorage(STAFF_ACCESS_KEY, nextToken);
  // Staff-token renewal must reconnect the staff socket, not reload the
  // customer session. Reloading it would mint another staff token forever.
  emitStaffTokenChange();
}

export function clearAuthTokens() {
  const customerChanged = Boolean(getAccessToken() || getRefreshToken());
  const staffChanged = Boolean(getStaffAccessToken());
  writeStorage(ACCESS_KEY, null);
  writeStorage(REFRESH_KEY, null);
  writeStorage(STAFF_ACCESS_KEY, null);
  if (customerChanged) emitAuthChange();
  if (staffChanged) emitStaffTokenChange();
}

export function onAuthTokenChange(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function onStaffAccessTokenChange(listener) {
  staffTokenListeners.add(listener);
  return () => staffTokenListeners.delete(listener);
}

function buildUrl(path, query) {
  const base =
    API_BASE_URL.startsWith('http')
      ? API_BASE_URL
      : `${window.location.origin}${API_BASE_URL}`;
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

async function sessionRequest(path, options, phase) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl(path), { ...options, signal: controller.signal });
    const data = await parseResponse(response);
    return { response, data };
  } catch (error) {
    error.authPhase = phase;
    throw error;
  } finally { window.clearTimeout(timer); }
}

function unwrapEnvelope(data) {
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.prototype.hasOwnProperty.call(data, 'data') &&
    Object.prototype.hasOwnProperty.call(data, 'meta')
  ) {
    return data.data;
  }
  return data;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const requestedRefreshToken = getRefreshToken();
    if (!requestedRefreshToken) {
      const error = new Error('Prijava nema token za obnovu. Prijavi se ponovo.');
      error.status = 401;
      error.authPhase = 'customer-refresh';
      clearAuthTokens();
      throw error;
    }

    // Refresh tokens rotate after every use. The browser keeps customer
    // credentials in shared localStorage, so two tabs must never send the
    // same refresh token at once: the second request would otherwise revoke
    // the entire session family as suspected token reuse.
    refreshPromise = withCustomerRefreshLock(async () => {
      if (getRefreshToken() !== requestedRefreshToken) {
        const refreshedAccessToken = getAccessToken();
        if (refreshedAccessToken) return refreshedAccessToken;
        throw new Error('Sesija je promenjena u drugom tabu.');
      }

      const { response, data } = await sessionRequest('/customer-auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: requestedRefreshToken }),
      }, 'customer-refresh');
      if (!response.ok) {
        const error = new Error(data?.message || data?.error?.message || 'Obnova sesije nije uspela.');
        error.status = response.status;
        error.authPhase = 'customer-refresh';
        error.code = data?.code || data?.error?.code;
        // A late response from an old session must not log out a new login.
        if ((response.status === 401 || response.status === 403) && getRefreshToken() === requestedRefreshToken) clearAuthTokens();
        throw error;
      }
      const tokens = unwrapEnvelope(data);
      if ((!tokens?.accessToken && !tokens?.access_token) || (!tokens?.refreshToken && !tokens?.refresh_token)) {
        throw new Error('Obnova sesije nije vratila potpune tokene.');
      }
      if (getRefreshToken() !== requestedRefreshToken) throw new Error('Sesija je promenjena tokom obnove.');
      // Rotacija tokena ne menja nalog. Ponovno učitavanje korisnika bi
      // privremeno ugasilo staffReady i izbacilo admina sa stranice.
      setAuthTokens(tokens, { notify: false });
      return tokens?.accessToken || tokens?.access_token;
    }).catch(error => {
      error.authPhase ||= 'customer-refresh';
      throw error;
    })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function withCustomerRefreshLock(operation) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(CUSTOMER_REFRESH_LOCK_KEY, operation);
  }

  const deadline = Date.now() + CUSTOMER_REFRESH_LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (tryAcquireCustomerRefreshLock()) {
      try {
        return await operation();
      } finally {
        releaseCustomerRefreshLock();
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, CUSTOMER_REFRESH_LOCK_RETRY_MS));
  }
  throw new Error('Obnova sesije je zauzeta u drugom tabu.');
}

function tryAcquireCustomerRefreshLock() {
  const now = Date.now();
  const existing = parseCustomerRefreshLock(readStoredValue(CUSTOMER_REFRESH_LOCK_KEY, 'necessary'));
  if (existing && existing.expiresAt > now && existing.owner !== customerRefreshLockOwner) return false;

  const lock = { owner: customerRefreshLockOwner, expiresAt: now + CUSTOMER_REFRESH_LOCK_TTL_MS };
  if (!writeStoredValue(CUSTOMER_REFRESH_LOCK_KEY, JSON.stringify(lock), 'necessary')) return false;
  return parseCustomerRefreshLock(readStoredValue(CUSTOMER_REFRESH_LOCK_KEY, 'necessary'))?.owner === customerRefreshLockOwner;
}

function releaseCustomerRefreshLock() {
  const existing = parseCustomerRefreshLock(readStoredValue(CUSTOMER_REFRESH_LOCK_KEY, 'necessary'));
  if (existing?.owner === customerRefreshLockOwner) {
    writeStoredValue(CUSTOMER_REFRESH_LOCK_KEY, null, 'necessary');
  }
}

function parseCustomerRefreshLock(value) {
  try {
    const parsed = JSON.parse(value || '');
    return typeof parsed?.owner === 'string' && Number.isFinite(parsed?.expiresAt) ? parsed : null;
  } catch {
    return null;
  }
}

function accessTokenExpiresSoon(token) {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return false;
    const normalizedPayload = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    );
    const bytes = Uint8Array.from(atob(paddedPayload), (character) =>
      character.charCodeAt(0),
    );
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const expiresAt = Number(payload?.exp) * 1000;
    return (
      Number.isFinite(expiresAt) &&
      expiresAt <= Date.now() + ACCESS_TOKEN_REFRESH_WINDOW_MS
    );
  } catch {
    // A token whose payload cannot be read still goes through the existing
    // server-side authentication and retry flow.
    return false;
  }
}

async function currentCustomerAccessToken() {
  const token = getAccessToken();
  if (!token || !accessTokenExpiresSoon(token)) return token;

  // Preserve the renewal failure instead of sending a known-expired token.
  await refreshAccessToken();
  return getAccessToken();
}

function customerSessionIdentity(token) {
  try {
    const encoded = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), char => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return `${payload.sub}:${payload.org}:${payload.fam}`;
  } catch { return null; }
}

async function refreshStaffAccessToken() {
  if (!staffRefreshPromise) {
    staffRefreshPromise = (async () => {
      let customerToken = await currentCustomerAccessToken();
      if (!customerToken) throw new Error('Customer token nije dostupan.');

      const storageKey = 'daja_staff_device_id';
      let deviceId = readStorage(storageKey);
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        writeStorage(storageKey, deviceId);
      }

      const mint = accessToken => sessionRequest('/customer-auth/admin/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
        credentials: 'include',
      }, 'staff-refresh');
      let result = await mint(customerToken);
      if (result.response.status === 401) {
        // The customer token may have expired server-side, or another tab
        // rotated its session between the preflight and this request.
        if (getAccessToken() === customerToken) await refreshAccessToken();
        customerToken = await currentCustomerAccessToken();
        if (!customerToken) throw new Error('Customer token nije dostupan.');
        result = await mint(customerToken);
      }
      const { response, data: rawData } = result;
      const data = unwrapEnvelope(rawData);
      if (!response.ok) {
        const error = new Error(data?.message || data?.error?.message || 'Staff sesija nije dostupna.');
        error.status = response.status;
        error.authPhase = 'staff-refresh';
        error.code = data?.code || data?.error?.code;
        throw error;
      }
      const accessToken = data?.accessToken || data?.access_token;
      if (!accessToken) throw new Error('Staff sesija nije vratila token.');
      if (!customerSessionIdentity(customerToken) || customerSessionIdentity(customerToken) !== customerSessionIdentity(getAccessToken())) {
        throw new Error('Nalog je promenjen tokom obnove administratorske prijave.');
      }
      setStaffAccessToken(accessToken);
      return accessToken;
    })().catch(error => {
      error.authPhase ||= 'staff-refresh';
      throw error;
    }).finally(() => {
      staffRefreshPromise = null;
    });
  }
  return staffRefreshPromise;
}

async function currentStaffAccessToken() {
  const token = getStaffAccessToken();
  if (!token) return refreshStaffAccessToken();
  if (!accessTokenExpiresSoon(token)) return token;
  return refreshStaffAccessToken();
}

export async function resumeAuthSession() {
  if (!getAccessToken()) return;
  await currentCustomerAccessToken();
  if (getStaffAccessToken()) await currentStaffAccessToken();
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    auth = true,
    staff = false,
    retry = true,
    signal,
  } = options;

  const requestHeaders = { ...headers };
  // Public endpoints must not touch browser storage before the visitor makes
  // a consent choice. This also prevents an old session from being attached
  // to an otherwise anonymous privacy or catalog request.
  const token = !auth
    ? null
    : staff
      ? await currentStaffAccessToken()
      : await currentCustomerAccessToken();
  if (auth && token) requestHeaders.Authorization = `Bearer ${token}`;

  let requestBody = body;
  if (
    body &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    typeof body !== 'string'
  ) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: requestBody,
      // Public catalog/privacy requests do not need a browser session and
      // therefore must not attach incidental cookies before consent.
      credentials: auth ? 'include' : 'omit',
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(
      `DAJA API nije dostupan. Proveri da li je pokrenut backend (${error.message}).`,
    );
  }

  if (response.status === 401 && auth && retry && !staff) {
    // Another request/tab may already have replaced this request's token.
    if (getAccessToken() === token) await refreshAccessToken();
    return apiRequest(path, { ...options, retry: false });
  }

  if (response.status === 401 && auth && retry && staff) {
    // Staff renewal refreshes the customer only if needed. Do not rotate a
    // healthy customer session for every late 401 from an admin request.
    if (getStaffAccessToken() === token) await refreshStaffAccessToken();
    return apiRequest(path, { ...options, retry: false });
  }

  const rawData = await parseResponse(response);
  if (!response.ok) {
    const message =
      rawData?.message ||
      rawData?.error?.message ||
      rawData?.error ||
      (typeof rawData === 'string' && rawData.trim()
        ? rawData.trim().slice(0, 300)
        : 'API zahtev nije uspeo.');
    const error = new Error(message);
    error.status = response.status;
    error.data = rawData;
    throw error;
  }
  return unwrapEnvelope(rawData);
}

export function toArrayPayload(data, keys = ['items', 'data', 'results']) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

export { API_BASE_URL };
import {
  readStoredValue,
  writeStoredValue,
} from './consentStorage.js';
