const DEFAULT_BASE_URL = 'https://daja-platform-api.onrender.com/api/v1';
const API_BASE_URL = (
  import.meta.env.VITE_DAJA_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, '');

const ACCESS_KEY = 'daja_customer_access_token';
const REFRESH_KEY = 'daja_customer_refresh_token';
const STAFF_ACCESS_KEY = 'daja_staff_access_token';

let refreshPromise = null;
const authListeners = new Set();

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private contexts.
  }
}

function emitAuthChange() {
  authListeners.forEach((listener) => listener());
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

export function setAuthTokens(tokens = {}) {
  writeStorage(ACCESS_KEY, tokens.accessToken || tokens.access_token || null);
  writeStorage(REFRESH_KEY, tokens.refreshToken || tokens.refresh_token || null);
  emitAuthChange();
}

export function setStaffAccessToken(accessToken) {
  writeStorage(STAFF_ACCESS_KEY, accessToken || null);
}

export function clearAuthTokens() {
  writeStorage(ACCESS_KEY, null);
  writeStorage(REFRESH_KEY, null);
  writeStorage(STAFF_ACCESS_KEY, null);
  emitAuthChange();
}

export function onAuthTokenChange(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
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
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('Refresh token nije dostupan.');

  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl('/customer-auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const data = await parseResponse(response);
        if (!response.ok) throw new Error(data?.message || 'Sesija je istekla.');
        const tokens = unwrapEnvelope(data);
        setAuthTokens(tokens);
        return tokens?.accessToken || tokens?.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function refreshStaffAccessToken() {
  const customerToken = getAccessToken();
  if (!customerToken) throw new Error('Customer token nije dostupan.');

  const storageKey = 'daja_staff_device_id';
  let deviceId = readStorage(storageKey);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    writeStorage(storageKey, deviceId);
  }

  const response = await fetch(buildUrl('/customer-auth/admin/session'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId }),
    credentials: 'include',
  });
  const data = unwrapEnvelope(await parseResponse(response));
  if (!response.ok) {
    const error = new Error(data?.message || data?.error?.message || 'Staff sesija nije dostupna.');
    error.status = response.status;
    throw error;
  }
  const accessToken = data?.accessToken || data?.access_token;
  if (!accessToken) throw new Error('Staff sesija nije vratila token.');
  setStaffAccessToken(accessToken);
  return accessToken;
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
  } = options;

  const requestHeaders = { ...headers };
  const token = staff ? getStaffAccessToken() || getAccessToken() : getAccessToken();
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
      credentials: 'include',
    });
  } catch (error) {
    throw new Error(
      `DAJA API nije dostupan. Proveri da li je pokrenut backend (${error.message}).`,
    );
  }

  if (response.status === 401 && auth && retry && !staff) {
    try {
      await refreshAccessToken();
      return apiRequest(path, { ...options, retry: false });
    } catch {
      clearAuthTokens();
    }
  }

  if (response.status === 401 && auth && retry && staff) {
    try {
      // The staff token is minted from the customer token. After the dashboard
      // has been idle, both may have expired; renewing only the staff token
      // then calls `/admin/session` with an expired customer credential.
      await refreshAccessToken();
      await refreshStaffAccessToken();
      return apiRequest(path, { ...options, retry: false });
    } catch {
      // Do not clear the customer session: only the separate staff session
      // failed or the user is no longer authorized as staff.
    }
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
