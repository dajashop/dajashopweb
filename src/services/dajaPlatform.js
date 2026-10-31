import {
  API_BASE_URL,
  apiRequest,
  setAuthTokens,
  setStaffAccessToken,
  clearAuthTokens,
  onStaffAccessTokenChange,
  toArrayPayload,
  BROWSER_SESSIONS_ENABLED,
} from './apiClient';
import { createRealtimeSocket } from './realtimeSocket.js';
import { createOAuthBrowserState } from './oauthBrowserState.js';
import { getAccessToken, getStaffAccessToken } from './apiClient';
import { readStoredValue, writeStoredValue } from './consentStorage.js';
import { visibleProductSpecs } from '../utils/catalogPresentation.js';
import { cachedFilterConfiguration, filterConfigurationGeneration, rememberFilterConfiguration } from './filterConfiguration.js';

let publicCatalogSocket = null;
let publicCatalogCloseTimer;
const publicCatalogListeners = new Set();
let staffCatalogSocket = null;
const staffCatalogListeners = new Set();
const adminConfigurationVersions = new Map();

const OAUTH_WAKEUP_TIMEOUT_MS = 90_000;
const OAUTH_WAKEUP_RETRY_MS = 2_000;
const OAUTH_WAKEUP_REQUEST_TIMEOUT_MS = 12_000;
const REALTIME_ENABLED = true;

const delay = (duration) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

async function waitForApiBeforeOAuth(onProgress) {
  const probeUrl = new URL(
    `${API_BASE_URL}/customer-auth/security-capabilities`,
    window.location.origin,
  );

  const startedAt = Date.now();
  let attempt = 0;
  let lastError = null;

  while (Date.now() - startedAt < OAUTH_WAKEUP_TIMEOUT_MS) {
    attempt += 1;
    onProgress?.({ attempt, elapsedMs: Date.now() - startedAt });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      OAUTH_WAKEUP_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(probeUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || '';

      // Render returns its own HTML while a sleeping service is starting.
      // Only a real JSON response means that it is safe to navigate away
      // from the DajaShop modal to the Google OAuth endpoint.
      if (response.ok && contentType.includes('application/json')) {
        const payload = await response.json();
        if ((payload?.data || payload)?.googleOAuthBrowserState === true) return;
      }

      lastError = new Error('API još nije spreman za Google prijavu.');
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeoutId);
    }

    await delay(OAUTH_WAKEUP_RETRY_MS);
  }

  throw new Error(
    'Priprema Google prijave traje duže nego što je očekivano. Pokušajte ponovo za minut.',
    { cause: lastError },
  );
}

function realtimeNamespaceUrl() {
  const apiBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL
    : `${window.location.origin}${API_BASE_URL}`;
  // VITE_DAJA_WS_URL may be either an origin or the complete `/realtime`
  // namespace. Normalize both forms so it can never become `/realtime/realtime`.
  const configured = BROWSER_SESSIONS_ENABLED ? apiBase : import.meta.env.VITE_DAJA_WS_URL || apiBase;
  return `${new URL(configured).origin}/realtime`;
}

function ensureStaffCatalogSocket() {
  if (staffCatalogSocket || staffCatalogListeners.size === 0) return;
  const token = getStaffAccessToken();
  if (!token) {
    const error = new Error('Staff token nije dostupan za real-time vezu.');
    staffCatalogListeners.forEach((candidate) => candidate.onError?.(error));
    return;
  }
  staffCatalogSocket = createRealtimeSocket(realtimeNamespaceUrl(), () => ({ token: `Bearer ${getStaffAccessToken() || ''}` }));
  staffCatalogSocket.on('product.updated', (event) => {
    staffCatalogListeners.forEach((candidate) => candidate.onEvent(event));
  });
  staffCatalogSocket.on('catalog.taxonomy.updated', (event) => {
    staffCatalogListeners.forEach((candidate) => candidate.onEvent(event));
  });
  staffCatalogSocket.on('catalog.variant-groups.updated', (event) => {
    staffCatalogListeners.forEach((candidate) => candidate.onEvent(event));
  });
  staffCatalogSocket.on('connect_error', (error) => {
    staffCatalogListeners.forEach((candidate) => candidate.onError?.(error));
  });
}

onStaffAccessTokenChange(() => {
  // A dashboard can mount before its short-lived staff session is issued.
  // In that case there is no socket to close, but active catalog subscribers
  // must still connect as soon as the token becomes available.
  staffCatalogSocket?.close();
  staffCatalogSocket = null;
  if (getStaffAccessToken() && staffCatalogListeners.size > 0) {
    ensureStaffCatalogSocket();
  }
});

function normalizeUser(data) {
  const user = data?.user || data?.customer || data;
  if (!user) return null;
  return {
    ...user,
    uid: user.uid || user.id || user.customerId || user.customer_id,
    id: user.id || user.uid || user.customerId || user.customer_id,
    displayName: user.displayName || user.display_name || user.name || '',
    phoneNumber: user.phoneNumber || user.phone_number || user.phone || '',
    emailVerified: Boolean(user.emailVerified || user.email_verified),
    providerData: user.providerData || user.identities || [],
    hasPassword: Boolean(user.hasPassword ?? user.has_password),
    googleLinked: Boolean(user.googleLinked ?? user.google_linked),
    passkeyCount: Number(user.passkeyCount ?? 0),
  };
}

export function normalizeProduct(product) {
  if (!product) return product;
  const firstVariant = Array.isArray(product.variants)
    ? product.variants[0]
    : null;
  // Keep the complete variant attributes for the staff product form. The
  // customer-facing `specs` below remains filtered, but stripping the raw
  // attributes here also stripped `rfid_piece_placements` before the admin
  // modal could load each physical item's zone and shelf.
  const rawAttributes =
    product.attributes || firstVariant?.attributes || product.specs || {};
  const priceMinor =
    product.price ??
    product.currentPriceAmount ??
    product.current_price_amount ??
    firstVariant?.currentPriceAmount ??
    firstVariant?.current_price_amount;
  const salePriceMinor = product.salePrice ?? product.sale_price;
  const packaging = rawAttributes._catalog_import?.packaging;
  const packReference = packaging?.schemaVersion === 1 && packaging?.quantity === 40 &&
    packaging?.discountPercent === 20 && Number(priceMinor) === packaging.priceAmount &&
    Math.round(packaging.regularPriceAmount * 0.8) === packaging.priceAmount && salePriceMinor == null
      ? packaging.regularPriceAmount : undefined;
  const regularPriceMinor = packReference ?? product.regularPrice ?? product.regular_price;
  // Platform stores money in minor units. Legacy Firestore-shaped objects
  // already carry dinars, so retain that representation when no Platform
  // money field/currency is present.
  const pricesAreMinor = Boolean(
    product.currency ||
    product.currentPriceAmount !== undefined ||
    product.current_price_amount !== undefined ||
    regularPriceMinor !== undefined,
  );
  const toDisplayPrice = (amount, fallback = 0) => {
    if (amount === null || amount === undefined || amount === '')
      return fallback;
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return fallback;
    return pricesAreMinor ? numeric / 100 : numeric;
  };
  const primaryImage =
    product.primaryImageUrl ||
    product.primary_image_url ||
    product.mainImageUrl ||
    product.main_image_url ||
    product.image ||
    product.images?.[0]?.url ||
    '';
  const availableQuantity = Number(product.availability?.availableQuantity ?? product.availableQuantity ?? product.available_quantity ?? product.quantity ?? product.stockQuantity ?? 0);
  const inStock = Boolean(product.availability?.inStock ?? product.inStock ?? product.in_stock ?? availableQuantity > 0);
  return {
    ...product,
    id: product.id || product.productId || product.product_id,
    productId: product.productId || product.product_id || product.id,
    variantId: product.variantId || product.variant_id || firstVariant?.id,
    brandId: product.brandId || product.brand_id || null,
    primaryCategoryId:
      product.primaryCategoryId ||
      product.primary_category_id ||
      product.categoryId ||
      null,
    gender: product.gender || product.variantGender || product.variant_gender || firstVariant?.gender || '',
    brand: product.brand || product.brand_name || null,
    category: product.category || product.category_name || null,
    price: toDisplayPrice(priceMinor),
    salePrice:
      salePriceMinor === null || salePriceMinor === undefined
        ? null
        : toDisplayPrice(salePriceMinor, null),
    saleValidUntil: product.saleValidUntil || product.sale_valid_until || null,
    regularPrice: toDisplayPrice(regularPriceMinor, null),
    availability: product.availability || {
      inStock,
      availableQuantity,
    },
    inStock,
    availableQuantity,
    itemCondition: product.itemCondition || product.item_condition || 'new',
    mpn: product.mpn || firstVariant?.mpn || null,
    image: primaryImage,
    mainImageUrl: primaryImage,
    thumbnailUrl: product.thumbnailUrl || product.thumbnail_url || primaryImage,
    // RFID and per-piece barcode data are operational metadata. They must
    // never become customer-facing product specifications.
    attributes: rawAttributes,
    specs: visibleProductSpecs(rawAttributes),
    marketingFlags: product.marketingFlags || product.marketing_flags || [],
    isVisible: product.isVisible ?? product.active ?? true,
    published: product.published ?? true,
    createdAt: product.createdAt || product.created_at,
    updatedAt: product.updatedAt || product.updated_at,
  };
}

function normalizeOrder(order) {
  if (!order) return order;
  return {
    ...order,
    id: order.displayId || order.display_id || order.id,
    docId: order.id || order.docId || order.doc_id,
    displayId: order.displayId || order.display_id || order.id,
    finalTotal: order.finalTotal ?? order.final_total ?? order.total,
    shippingCost: order.shippingCost ?? order.shipping_cost,
    shippingMethod: order.shippingMethod || order.shipping_method,
    paymentMethod: order.paymentMethod || order.payment_method,
    isRead: order.isRead ?? order.is_read ?? true,
    createdAt: order.createdAt || order.created_at,
  };
}

function collectionEndpoint(collectionName) {
  const map = {
    departments: '/departments',
    brands: '/brands',
    categories: '/categories',
    spec_keys: '/spec_keys',
  };
  return map[collectionName] || `/${collectionName}`;
}

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email) =>
  Boolean(email && ADMIN_EMAILS.includes(String(email).toLowerCase()));

export const authApi = {
  async me() {
    return normalizeUser(await apiRequest('/customer-auth/me'));
  },
  async login(payload) {
    const data = await apiRequest('/customer-auth/login', {
      method: 'POST',
      auth: false,
      body: {
        identity: payload.identity || payload.email,
        password: payload.password,
      },
    });
    setAuthTokens(data);
    return normalizeUser(data);
  },
  async register(payload) {
    const data = await apiRequest('/customer-auth/register', {
      method: 'POST',
      auth: false,
      body: {
        identity: payload.identity || payload.email,
        password: payload.password,
        name: payload.name || payload.displayName || payload.email,
      },
    });
    if (data?.webSession || data?.accessToken || data?.access_token) setAuthTokens(data);
    return normalizeUser(data);
  },
  async logout() {
    if (BROWSER_SESSIONS_ENABLED) {
      if (getStaffAccessToken()) {
        try { await apiRequest('/auth/logout', { method: 'POST', staff: true, retry: false }); }
        catch (error) { if (error.status !== 401) throw error; }
      }
      try { await apiRequest('/customer-auth/logout', { method: 'POST', retry: false }); }
      catch (error) { if (error.status !== 401) throw error; }
      clearAuthTokens();
      return;
    }
    try {
      // Customer and staff sessions are separate server records. Revoke the
      // staff session before discarding its bearer token locally.
      if (getStaffAccessToken()) {
        try {
          await apiRequest('/auth/logout', { method: 'POST', staff: true, retry: false });
        } catch {
          console.warn('Staff session revocation could not be confirmed.');
        }
      }
      await apiRequest('/customer-auth/logout', {
        method: 'POST',
        retry: false,
      });
    } catch (error) {
      // Logout must always finish locally. A 401 only means that the session
      // was already expired/revoked, which is a normal state for this action.
      if (error?.status && error.status !== 401) {
          console.warn('Customer session revocation could not be confirmed.');
      }
    } finally {
      clearAuthTokens();
    }
  },
  requestPasswordReset(email) {
    return apiRequest('/customer-auth/password/reset-request', {
      method: 'POST',
      auth: false,
      body: { email },
    });
  },
  resetPassword(token, newPassword) {
    return apiRequest('/customer-auth/password/reset', {
      method: 'POST',
      auth: false,
      body: { token, newPassword },
    });
  },
  async createAdminSession() {
    const storageKey = 'daja_staff_device_id';
    let deviceId = readStoredValue(storageKey, 'necessary');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      writeStoredValue(storageKey, deviceId, 'necessary');
    }
    const data = await apiRequest('/customer-auth/admin/session', {
      method: 'POST',
      body: { deviceId },
    });
    setStaffAccessToken(BROWSER_SESSIONS_ENABLED ? data?.staffSession === true : data?.accessToken || data?.access_token || null, data?.expiresIn);
    return data;
  },
  async requestPhoneOtp(phone) {
    return apiRequest('/customer-auth/phone/start', {
      method: 'POST',
      auth: false,
      body: { phone },
    });
  },
  async confirmPhoneOtp(phone, code) {
    const data = await apiRequest('/customer-auth/phone/verify', {
      method: 'POST',
      auth: false,
      body: { phone, code },
    });
    setAuthTokens(data);
    return normalizeUser(data);
  },
  async oauthStart(provider, onProgress) {
    if (provider !== 'google') throw new Error('Ovaj način prijave nije podržan.');
    // Keep the customer on DajaShop while a sleeping Render instance starts.
    // Redirect only after the API is serving JSON, so Render's wake-up screen
    // is never shown as part of the Google sign-in flow.
    await waitForApiBeforeOAuth(onProgress);

    // The API validates and signs this URL's origin into the OAuth state, then
    // returns the customer to this exact route (including catalog filters).
    const startUrl = new URL(
      `${API_BASE_URL}/customer-auth/oauth/${provider}/start`,
      window.location.origin,
    );
    startUrl.searchParams.set('returnTo', window.location.href);
    startUrl.searchParams.set('browserState', createOAuthBrowserState());
    window.location.assign(startUrl.toString());
  },
  async passkeyRegisterStart(payload) {
    return apiRequest('/customer-auth/passkeys/register-challenge', {
      method: 'POST',
      body: payload,
    });
  },
  async passkeyRegisterFinish(payload) {
    const data = await apiRequest('/customer-auth/passkeys/register-verify', {
      method: 'POST',
      body: payload,
    });
    return data;
  },
  passkeyList() { return apiRequest('/customer-auth/passkeys'); },
  passkeyRemove(id) { return apiRequest('/customer-auth/passkeys/' + encodeURIComponent(id), { method: 'DELETE', retry: false }); },
  async passkeyLoginStart(payload) {
    return apiRequest('/customer-auth/passkeys/login-challenge', {
      method: 'POST',
      auth: false,
      body: payload,
    });
  },
  async passkeyLoginFinish(payload) {
    const data = await apiRequest('/customer-auth/passkeys/login-verify', {
      method: 'POST',
      auth: false,
      body: payload,
    });
    setAuthTokens(data);
    return normalizeUser(data);
  },
  verifyEmail(token) {
    if (token) {
      return apiRequest(
        `/customer-auth/email/verify?token=${encodeURIComponent(token)}`,
        { method: 'GET', auth: false },
      );
    }
    return Promise.reject(
      new Error(
        'Verifikacija e-maila još nije dostupna u DAJA Platform API-ju.',
      ),
    );
  },
};

export const catalogApi = {
  async search(params = {}, { signal } = {}) {
    const data = await apiRequest('/public/catalog/search', { auth: false, query: params, signal });
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      throw new Error('Pretraga nije vratila očekivani odgovor.');
    }
    return { ...data, items: data.items.map(normalizeProduct), recommendations: (data.recommendations || []).map(normalizeProduct), similar: (data.similar || []).map(item => ({ ...item, product: normalizeProduct(item.product) })) };
  },
  async listing(route, signal) {
    let data;
    const request = new URLSearchParams(route.slice(5));
    const department = route.startsWith('page?') ? request.get('department') : null;
    const configuration = department ? cachedFilterConfiguration(department, true) : null;
    const generation = filterConfigurationGeneration();
    const requestedAt = Date.now();
    const apiRoute = configuration?.version ? `${route}&configurationVersion=${encodeURIComponent(configuration.version)}` : route;
    try {
      data = await apiRequest(`/public/catalog/${apiRoute}`, { auth: false, signal });
    } catch (error) {
      if (error.status !== 404) throw error;
      const { legacyListing } = await import('../utils/legacyListing.js');
      const request = new URLSearchParams(route.slice(5));
      const [items, filters] = await Promise.all([
        this.listRawProducts(signal),
        route === 'home' ? null : apiRequest(`/public/catalog/filters/${request.get('department')}`, { auth: false, signal }),
      ]);
      data = legacyListing(items, route, filters?.configuration);
    }
    if (!data || !Array.isArray(data.items)) throw new Error('Neispravan odgovor kataloga.');
    if (department && !signal?.aborted && generation === filterConfigurationGeneration()) {
      const nextConfiguration = data.configuration || (data.configurationVersion === configuration?.version ? configuration?.configuration : null);
      rememberFilterConfiguration(department, nextConfiguration, data.configurationVersion, requestedAt);
    }
    return { ...data, items: data.items.map(normalizeProduct) };
  },
  async adminListing(route, signal) {
    const query = new URLSearchParams(route.slice(route.indexOf('?') + 1));
    const department = query.get('department');
    const version = adminConfigurationVersions.get(department);
    if (version) query.set('configurationVersion', version);
    const data = await apiRequest('/admin/catalog/page', {
      staff: true,
      query: Object.fromEntries(query),
      signal,
    });
    if (!data || !Array.isArray(data.items)) throw new Error('Neispravan odgovor kataloga.');
    if (data.configurationVersion) adminConfigurationVersions.set(department, data.configurationVersion);
    return { ...data, items: data.items.map(normalizeProduct) };
  },
  async listRawProducts(signal) {
    const items = [];
    const seen = new Set();
    let cursor;
    do {
      const data = await apiRequest('/public/catalog/products', { auth: false, signal, query: { limit: 50, cursor } });
      if (!Array.isArray(data?.items)) throw new Error('Neispravan odgovor kataloga.');
      items.push(...data.items);
      cursor = data.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error('Neispravna paginacija kataloga.');
      if (cursor) seen.add(cursor);
    } while (cursor);
    return items;
  },
  async listProducts(params = {}) {
    const fetchAll = params.all === true;
    const requestedLimit = fetchAll ? Infinity : Math.max(1, Number(params.limit) || 20);
    const pageSize = fetchAll ? 50 : Math.min(requestedLimit, 50);
    const { cursor: initialCursor, limit: _limit, all: _all, ...filters } = params;
    const products = [];
    let cursor = initialCursor;

    do {
      const data = await apiRequest('/public/catalog/products', {
        query: { ...filters, limit: pageSize, cursor },
        auth: false,
      });
      if (typeof data === 'string') {
        throw new Error('DAJA catalog API je vratio tekst/HTML umesto JSON-a.');
      }

      products.push(...toArrayPayload(data).map(normalizeProduct));
      cursor = data?.nextCursor || null;
    } while (cursor && products.length < requestedLimit);

    return fetchAll ? products : products.slice(0, requestedLimit);
  },
  async getProductBySlug(slug, { realtime = false, signal } = {}) {
    const data = await apiRequest(
      `/public/catalog/products/${encodeURIComponent(slug)}`,
      {
        auth: false,
        ...(realtime ? { query: { realtime: '1' } } : {}),
        signal,
      },
    );
    if (data?.redirectTo) return { redirectTo: data.redirectTo };
    return normalizeProduct(data?.product || data);
  },
  async relatedProducts(slug, signal) {
    const data = await apiRequest(`/public/catalog/products/${encodeURIComponent(slug)}/related`, { auth: false, signal });
    if (!Array.isArray(data?.items)) throw new Error('Povezani proizvodi nisu dostupni.');
    return data.items.slice(0, 12).map(normalizeProduct);
  },
};

export const variantGroupsApi = {
  list: () => apiRequest('/admin/variant-groups', { staff: true }),
  save: (body) => apiRequest('/admin/variant-groups', { staff: true, method: 'POST', body }),
  reset: (key, expectedRevision, expectedCatalogRevision) => apiRequest(`/admin/variant-groups/${encodeURIComponent(key)}/reset`, { staff: true, method: 'POST', body: { expectedRevision, expectedCatalogRevision } }),
  remove: (key, expectedRevision, expectedCatalogRevision) => apiRequest(`/admin/variant-groups/${encodeURIComponent(key)}`, { staff: true, method: 'DELETE', body: { expectedRevision, expectedCatalogRevision } }),
  resetProduct: (id, expectedRevision, expectedCatalogRevision) => apiRequest(`/admin/variant-groups/products/${encodeURIComponent(id)}/automatic`, { staff: true, method: 'POST', body: { expectedRevision, expectedCatalogRevision } }),
  async publicMembers(slug, signal) {
    const data = await apiRequest(`/public/catalog/products/${encodeURIComponent(slug)}/variants`, { auth: false, signal });
    if (!data || !Array.isArray(data.items)) throw new Error('Varijante nisu dostupne.');
    return { items: data.items.map(normalizeProduct), groupId: data.groupId || null };
  },
};

function productWritePayload(product) {
  const has = (key) => Object.prototype.hasOwnProperty.call(product, key);
  const productPayload = {};
  if (has('name')) productPayload.name = product.name;
  if (has('supplierUrl')) productPayload.supplierUrl = product.supplierUrl?.trim() || null;
  if (has('bultimeUrl')) productPayload.bultimeUrl = product.bultimeUrl?.trim() || null;
  if (has('linkelUrl')) productPayload.linkelUrl = product.linkelUrl?.trim() || null;
  if (has('milanoUrl')) productPayload.milanoUrl = product.milanoUrl?.trim() || null;
  if (has('timezoneUrl')) productPayload.timezoneUrl = product.timezoneUrl?.trim() || null;
  if (has('qandqUrl')) productPayload.qandqUrl = product.qandqUrl?.trim() || null;
  if (has('slug')) productPayload.slug = product.slug;
  if (has('description'))
    productPayload.description = product.description || '';
  if (has('itemCondition'))
    productPayload.itemCondition = product.itemCondition;
  if (has('departmentId')) productPayload.departmentId = product.departmentId;
  if (has('seo')) productPayload.seo = product.seo;
  if (has('features')) productPayload.features = product.features;
  if (has('model3DUrl'))
    productPayload.model3DUrl = product.model3DUrl || null;
  if (has('marketingFlags'))
    productPayload.marketingFlags = product.marketingFlags;
  if (has('brandId')) productPayload.brandId = product.brandId;
  else if (has('brand_id')) productPayload.brandId = product.brand_id;
  if (has('primaryCategoryId'))
    productPayload.primaryCategoryId = product.primaryCategoryId;
  else if (has('primary_category_id'))
    productPayload.primaryCategoryId = product.primary_category_id;
  else if (has('categoryId'))
    productPayload.primaryCategoryId = product.categoryId;
  if (has('isVisible')) productPayload.active = product.isVisible !== false;
  else if (has('active')) productPayload.active = product.active !== false;
  if (has('published'))
    productPayload.published = product.published !== false;
  else if (!product.id) productPayload.published = true;
  return productPayload;
}

export const adminCatalogApi = {
  async listProducts({ onPage, signal } = {}) {
    if (onPage) {
      const items = [];
      const seen = new Set();
      let after;
      do {
        let batch;
        try {
          batch = await apiRequest('/admin/catalog/batches', { staff: true, signal, query: { limit: 100, ...(after ? { after } : {}) } });
        } catch (error) {
          // The web bundle can arrive before the additive API endpoint.
          if (!after && error.status === 404) break;
          throw error;
        }
        if (!Array.isArray(batch?.items)) throw new Error('Proizvodi nisu dostupni.');
        items.push(...batch.items.map(normalizeProduct));
        items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) || String(b.id).localeCompare(String(a.id)));
        onPage([...items], true);
        after = batch.nextCursor;
        if (!after) return items;
        if (seen.has(after)) throw new Error('Učitavanje proizvoda nije završeno. Pokušajte ponovo.');
        seen.add(after);
      } while (!signal?.aborted);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    }
    const data = await apiRequest('/products', { staff: true, signal });
    return toArrayPayload(data).map(normalizeProduct);
  },
  async getProduct(id) {
    const data = await apiRequest(`/products/${encodeURIComponent(id)}`, {
      staff: true,
    });
    return normalizeProduct(data);
  },
  async getProductBySlug(slug, signal) {
    const data = await apiRequest(
      `/admin/catalog/products/by-slug/${encodeURIComponent(slug)}`,
      { staff: true, signal },
    );
    return normalizeProduct(data);
  },
  async supplierStates(afterRevision = 0, limit = 500) {
    return apiRequest(`/supplier-links/states?afterRevision=${afterRevision}&limit=${limit}`, { staff: true });
  },
  async supplierProviders() {
    return apiRequest('/supplier-links/providers', { staff: true });
  },
  async supplierLinks(filters = {}, exporting = false) {
    return apiRequest(exporting ? '/supplier-links/links/export' : '/supplier-links/links', { staff: true, query: filters });
  },
  async supplierStatistics(code = 'all', period = '24h') {
    return apiRequest(`/supplier-links/providers/${encodeURIComponent(code)}/statistics`, { staff: true, query: { period } });
  },
  async supplierTimeline() {
    return apiRequest('/supplier-links/timeline', { staff: true, query: { minutes: 60 } });
  },
  async pauseSuppliers(body) {
    return apiRequest('/supplier-links/providers/pause', { staff: true, method: 'POST', body });
  },
  async resumeSuppliers(providers) {
    return apiRequest('/supplier-links/providers/resume', { staff: true, method: 'POST', body: { providers } });
  },
  async supplierActions(action, ids, reason) {
    return apiRequest('/supplier-links/actions', { staff: true, method: 'POST', body: { action, ids, reason } });
  },
  async reactivateSupplierLink(id) {
    return apiRequest(`/supplier-links/${encodeURIComponent(id)}/reactivate`, { staff: true, method: 'POST' });
  },
  async probeSupplier(code) {
    return apiRequest(`/supplier-links/providers/${encodeURIComponent(code)}/probe`, { staff: true, method: 'POST' });
  },
  async previewSupplierLink(provider, url) {
    return apiRequest('/supplier-links/preview', {
      method: 'POST',
      staff: true,
      body: { provider, url },
    });
  },
  async getSupplierExchangeRate() {
    return apiRequest('/supplier-links/exchange-rate', { staff: true });
  },
  async saveProductBundle({ product, ...bundle }) {
    const source = product.variants?.[0] || {};
    const hasPrice = source.currentPriceAmount !== undefined || source.price !== undefined;
    const variant = {
      ...(source.id ? { id: source.id } : {}),
      sku: source.sku, barcode: source.barcode || null, mpn: product.mpn || source.mpn || null,
      name: source.name || null, gender: source.gender || null,
      ...(source.epc !== undefined ? { epc: source.epc } : {}),
      ...(hasPrice ? { currentPriceAmount: source.currentPriceAmount ?? Math.round(Number(source.price || 0) * 100) } : {}),
      currency: source.currency || 'RSD', attributes: source.attributes || {},
      active: source.active !== false, published: source.published !== false,
    };
    const data = await apiRequest('/admin/catalog/save', { method: 'POST', staff: true,
      body: { ...bundle, ...(product.id ? { id: product.id } : {}), product: productWritePayload(product), variant } });
    return { ...data, product: normalizeProduct(data.product) };
  },
  async saveProduct(product) {
    const productPayload = productWritePayload(product);
    const method = product.id ? 'PATCH' : 'POST';
    const path = product.id
      ? `/products/${encodeURIComponent(product.id)}`
      : '/products';
    const data = await apiRequest(path, {
      method,
      body: productPayload,
      staff: true,
    });
    const productId = data?.id || data?.product?.id || product.id;
    if (
      !product.id &&
      productId &&
      product.price !== undefined &&
      !product.variants?.length
    ) {
      await apiRequest(`/products/${encodeURIComponent(productId)}/variants`, {
        method: 'POST',
        staff: true,
        body: {
          sku: product.sku?.trim() || null,
          barcode: product.barcode?.trim() || null,
          mpn: product.mpn?.trim() || null,
          currentPriceAmount: Math.round(Number(product.price || 0) * 100),
          currency: 'RSD',
          gender: product.gender || null,
          attributes: product.specs || {},
          active: true,
          published: true,
        },
      }).catch(() => null);
    }
    if (
      product.variantId &&
      product.price !== undefined &&
      !product.variants?.length
    ) {
      await apiRequest(`/variants/${encodeURIComponent(product.variantId)}`, {
        method: 'PATCH',
        staff: true,
        body: {
          currentPriceAmount: Math.round(Number(product.price || 0) * 100),
          barcode: product.barcode?.trim() || null,
          mpn: product.mpn?.trim() || null,
          attributes: product.specs || {},
        },
      }).catch(() => null);
    }
    if (productId && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        const hasVariantPrice =
          variant.currentPriceAmount !== undefined || variant.price !== undefined;
        const currentPriceAmount = hasVariantPrice
          ? variant.currentPriceAmount ?? Math.round(Number(variant.price || 0) * 100)
          : undefined;
        const body = {
          sku: variant.sku,
          barcode: variant.barcode || null,
          mpn: product.mpn || variant.mpn || null,
          ...(variant.epc !== undefined ? { epc: variant.epc } : {}),
          name: variant.name || null,
          gender: variant.gender || null,
          ...(currentPriceAmount !== undefined ? { currentPriceAmount } : {}),
          currency: variant.currency || 'RSD',
          attributes: variant.attributes || {},
          active: variant.active !== false,
          published: variant.published !== false,
        };
        const variantPath = variant.id
          ? `/variants/${encodeURIComponent(variant.id)}`
          : `/products/${encodeURIComponent(productId)}/variants`;
        await apiRequest(variantPath, {
          method: variant.id ? 'PATCH' : 'POST',
          staff: true,
          body,
        });
      }
    }
    return productId;
  },
  deleteProduct(id) {
    return apiRequest(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      staff: true,
    });
  },
  setProductVisibility(id, active) {
    return apiRequest(`/products/${encodeURIComponent(id)}/visibility`, {
      method: 'PATCH',
      staff: true,
      body: { active },
    });
  },
  listVariantPrices(id) {
    return apiRequest(`/variants/${encodeURIComponent(id)}/prices`, {
      staff: true,
    });
  },
  listVariants(id) {
    return apiRequest(`/products/${encodeURIComponent(id)}/variants`, {
      staff: true,
    });
  },
  addVariantPrice(id, body) {
    return apiRequest(`/variants/${encodeURIComponent(id)}/prices`, {
      method: 'POST',
      staff: true,
      body,
    });
  },
  clearVariantSale(id) {
    return apiRequest(`/variants/${encodeURIComponent(id)}/prices/sale`, {
      method: 'DELETE',
      staff: true,
    });
  },
  refreshVariant(id, body) {
    return apiRequest(`/variants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      staff: true,
      body,
    });
  },
  deleteVariant(id) {
    return apiRequest(`/variants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      staff: true,
    });
  },
  listVariantSpecifications(id) {
    return apiRequest(`/variants/${encodeURIComponent(id)}/specifications`, {
      staff: true,
    });
  },
  replaceVariantSpecifications(id, values) {
    return apiRequest(`/variants/${encodeURIComponent(id)}/specifications`, {
      method: 'PUT',
      staff: true,
      body: { values },
    });
  },
  listAdminReviews(id) {
    return apiRequest(`/admin/products/${encodeURIComponent(id)}/reviews`, {
      staff: true,
    });
  },
  moderateReview(id, status) {
    return apiRequest(`/admin/reviews/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      staff: true,
      body: { status },
    });
  },
  deleteReview(id) {
    return apiRequest(`/admin/reviews/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      staff: true,
    });
  },
  repairProductImageUrls(productId = '') {
    return Promise.resolve({ repaired: 0, productId });
  },
};

export const catalogAuditApi = {
  list(params = {}) {
    return apiRequest('/admin/catalog-audit', {
      staff: true,
      query: params,
    });
  },
};

export function createCollectionService(collectionName) {
  const endpoint = collectionEndpoint(collectionName);
  const subscribers = new Set();
  let cachedItems = [];
  let stopRealtime = null;
  const notify = (items) => {
    cachedItems = items;
    subscribers.forEach((subscriber) => subscriber.onData(items));
  };
  const refresh = async () => {
    try {
      const data = await apiRequest(endpoint, { staff: true });
      const items = toArrayPayload(data);
      notify(items);
      return items;
    } catch (error) {
      subscribers.forEach((subscriber) => subscriber.onError?.(error));
      throw error;
    }
  };
  const startRealtime = () => {
    if (stopRealtime) return;
    stopRealtime = subscribeStaffCatalogRealtime((event) => {
      const collections = event?.data?.collections ?? event?.collections;
      if (!Array.isArray(collections) || collections.includes(collectionName)) {
        void refresh().catch(() => {});
      }
    });
  };
  return {
    async list() {
      return refresh();
    },
    refresh,
    optimistic(items) {
      notify(items);
    },
    subscribe(onData, onError) {
      const subscriber = { onData, onError };
      subscribers.add(subscriber);
      startRealtime();
      if (cachedItems.length) onData(cachedItems);
      else void refresh();
      return () => {
        subscribers.delete(subscriber);
        if (subscribers.size === 0 && stopRealtime) {
          stopRealtime();
          stopRealtime = null;
        }
      };
    },
    async add(name, extraData = {}) {
      const created = await apiRequest(endpoint, {
        method: 'POST',
        staff: true,
        body: { name: name.trim(), ...extraData },
      });
      await refresh();
      return created;
    },
    async update(id, name, extraData = {}) {
      const updated = await apiRequest(
        `${endpoint}/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          staff: true,
          body: { name: name.trim(), ...extraData },
        },
      );
      await refresh();
      return updated;
    },
    async remove(id) {
      const result = await apiRequest(`${endpoint}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        staff: true,
      });
      await refresh();
      return result;
    },
  };
}

const customerWriteQueues = { cart: Promise.resolve(), wishlist: Promise.resolve() };
function queueCustomerWrite(collection, save) {
  const pending = customerWriteQueues[collection].catch(() => {}).then(save);
  customerWriteQueues[collection] = pending;
  return pending;
}

export const customerApi = {
  async me() {
    const data = await apiRequest('/customers/me');
    return data?.customer || data;
  },
  async listAddresses() {
    const data = await apiRequest('/customers/me/addresses');
    return toArrayPayload(data);
  },
  addAddress(payload) {
    return apiRequest('/customers/me/addresses', {
      method: 'POST',
      body: payload,
    });
  },
  updateAddress(id, payload) {
    return apiRequest(`/customers/me/addresses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  deleteAddress(id) {
    return apiRequest(`/customers/me/addresses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  async getCart(options = {}) {
    const data = await apiRequest('/customers/me/cart', options);
    return toArrayPayload(data, ['items', 'cart']);
  },
  setCart(items, options = {}) {
    return queueCustomerWrite('cart', () =>
      apiRequest('/customers/me/cart', { ...options, method: 'PUT', body: { items } }));
  },
  async getWishlist(options = {}) {
    const data = await apiRequest('/customers/me/wishlist', options);
    return toArrayPayload(data, ['items', 'wishlist']);
  },
  setWishlist(items, options = {}) {
    return queueCustomerWrite('wishlist', async () => {
      const next = Array.isArray(items) ? items : [];
      const current = await this.getWishlist(options);
      const nextIds = new Set(
        next.map((item) => item.id || item.productId).filter(Boolean),
      );
      await Promise.all(
        current
          .filter((item) => !nextIds.has(item.id || item.productId))
          .map((item) =>
            apiRequest(
              `/customers/me/wishlist/${encodeURIComponent(item.id || item.productId)}`,
              { ...options, method: 'DELETE' },
            ),
          ),
      );
      for (const item of next) {
        await apiRequest('/customers/me/wishlist', {
          ...options,
          method: 'POST',
          body: { item },
        });
      }
      return next;
    });
  },
  updateProfile(payload) {
    return apiRequest('/customers/me', { method: 'PATCH', body: payload });
  },
  requestEmailVerification() {
    return apiRequest('/customer-auth/email/verification', { method: 'POST' });
  },
  requestPhoneLinkOtp(phone) {
    return apiRequest('/customer-auth/phone/start', {
      method: 'POST',
      body: { phone, purpose: 'link' },
    });
  },
  verifyPhoneLinkOtp(phone, code) {
    return apiRequest('/customer-auth/phone/verify', {
      method: 'POST',
      body: { phone, code, purpose: 'link' },
    });
  },
  updatePassword({ currentPassword, newPassword }) {
    return apiRequest('/customer-auth/password', {
      method: 'POST',
      body: {
        ...(currentPassword ? { currentPassword } : {}),
        newPassword,
      },
    });
  },
  async linkOAuth(provider) {
    const data = await apiRequest(`/customer-auth/oauth/${provider}/link/start`, {
      method: 'POST',
      body: {
        browserState: createOAuthBrowserState(),
        returnTo: window.location.href,
      },
    });
    window.location.assign(data.url);
  },
};

export const ordersApi = {
  async create(payload) {
    const data = await apiRequest('/orders', {
      method: 'POST',
      auth: true,
      body: payload,
    });
    if (typeof data === 'string') {
      throw new Error('DAJA orders API je vratio tekst/HTML umesto JSON-a.');
    }
    return normalizeOrder(data?.order || data);
  },
  async mine() {
    const data = await apiRequest('/orders/me');
    return toArrayPayload(data).map(normalizeOrder);
  },
  async adminList() {
    const data = await apiRequest('/admin/orders', { staff: true });
    return toArrayPayload(data).map(normalizeOrder);
  },
  updateStatus(id, status) {
    return apiRequest(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      staff: true,
      body: { status },
    });
  },
  markAsRead(id) {
    return apiRequest(`/admin/orders/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      staff: true,
    });
  },
};

async function workforceRead(path, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    return await apiRequest(path, { staff: true, query, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Učitavanje učinka traje predugo. Pokušaj ponovo.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const workforceApi = {
  dashboard(userId, params) {
    return workforceRead(`/admin/workforce/${encodeURIComponent(userId)}/dashboard`, params);
  },
  recordSession(id, body) {
    return apiRequest(`/admin/work-sessions/${encodeURIComponent(id)}`, { staff: true, method: 'PUT', body });
  },
  abandonSession(id, startedAt) {
    return apiRequest(`/admin/work-sessions/${encodeURIComponent(id)}/abandon`, { staff: true, method: 'POST', body: { startedAt } });
  },
  timeline(userId, date) {
    return workforceRead(`/admin/workforce/${encodeURIComponent(userId)}/timeline`, { date });
  },
  pricing(userId) {
    return workforceRead('/admin/workforce-pricing', userId ? { userId } : {});
  },
  savePricing(rule) {
    return apiRequest('/admin/workforce-pricing', { staff: true, method: 'PUT', body: rule });
  },
  list(params = {}) {
    return workforceRead('/admin/workforce', params);
  },
  me() {
    return apiRequest('/admin/my-workforce', { staff: true });
  },
  settings() {
    return apiRequest('/admin/workforce/settings', { staff: true });
  },
  updateSettings(rateMinor) {
    return apiRequest('/admin/workforce/settings', {
      method: 'PATCH', staff: true, body: { rateMinor },
    });
  },
  updateRate(userId, rateMinor) {
    return apiRequest(`/admin/workforce/${encodeURIComponent(userId)}/rate`, {
      method: 'PATCH', staff: true, body: { rateMinor },
    });
  },
  member(userId) {
    return workforceRead(`/admin/workforce/${encodeURIComponent(userId)}`);
  },
  reviewProduct(productId, status, note) {
    return apiRequest(`/admin/workforce/products/${encodeURIComponent(productId)}/review`, {
      method: 'PATCH', staff: true, body: { status, ...(note ? { note } : {}) },
    });
  },
};

export const accessControlApi = {
  me() { return apiRequest('/admin/access/me', { staff: true }); },
  users() { return apiRequest('/admin/access/users', { staff: true }); },
  roles() { return apiRequest('/admin/access/roles', { staff: true }); },
  createUser(payload) { return apiRequest('/admin/access/users', { method: 'POST', staff: true, body: payload }); },
  updateAssignments(userId, assignments) {
    return apiRequest(`/admin/access/users/${encodeURIComponent(userId)}/assignments`, { method: 'PUT', staff: true, body: { assignments } });
  },
};

/** Remote G2 stations are staff-only. The browser never talks to reader
 * hardware; Daja Platform owns the one-active-session lock. */
export const readerStationApi = {
  list() { return apiRequest('/rfid/reader-stations', { staff: true }); },
  start(stationId, clientId, preview) { return apiRequest('/rfid/reader-stations/sessions', { method: 'POST', staff: true, body: { stationId, clientId, ...(preview ? { preview } : {}) } }); },
  session(sessionId) { return apiRequest(`/rfid/reader-stations/sessions/${encodeURIComponent(sessionId)}`, { staff: true }); },
  cancel(sessionId) { return apiRequest(`/rfid/reader-stations/sessions/${encodeURIComponent(sessionId)}/cancel`, { method: 'POST', staff: true }); },
  startFind(stationId, clientId, epc, preview) { return apiRequest('/rfid/reader-stations/find-sessions', { method: 'POST', staff: true, body: { stationId, clientId, epc, ...(preview ? { preview } : {}) } }); },
  findSession(sessionId) { return apiRequest(`/rfid/reader-stations/find-sessions/${encodeURIComponent(sessionId)}`, { staff: true }); },
  cancelFind(sessionId) { return apiRequest(`/rfid/reader-stations/find-sessions/${encodeURIComponent(sessionId)}/cancel`, { method: 'POST', staff: true }); },
};

export function subscribeReaderSession(sessionId, onEvent, onError) {
  if (!REALTIME_ENABLED) return () => {};
  const token = getStaffAccessToken();
  if (!token) { onError?.(new Error('Staff token nije dostupan za Reader Station.')); return () => {}; }
  const socket = createRealtimeSocket(realtimeNamespaceUrl(), () => ({ token: `Bearer ${getStaffAccessToken() || ''}` }));
  const channels = ['reader.scan.product', 'reader.scan.completed', 'reader.scan.cancelled'];
  socket.on('connect', () => socket.emit('reader.scan.subscribe', { sessionId }, (result) => {
    if (result?.ok === false) onError?.(new Error('Nije moguće povezati sesiju očitavanja.'));
  }));
  channels.forEach((channel) => socket.on(channel, onEvent));
  socket.on('connect_error', onError || (() => {}));
  return () => { channels.forEach((channel) => socket.off(channel, onEvent)); socket.close(); };
}

export function subscribeReaderFind(sessionId, onEvent, onError) {
  if (!REALTIME_ENABLED) return () => {};
  const token = getStaffAccessToken();
  if (!token) { onError?.(new Error('Staff token nije dostupan za Reader Station.')); return () => {}; }
  const socket = createRealtimeSocket(realtimeNamespaceUrl(), () => ({ token: `Bearer ${getStaffAccessToken() || ''}` }));
  const channels = ['reader.find.proximity', 'reader.find.completed', 'reader.find.cancelled'];
  socket.on('connect', () => socket.emit('reader.find.subscribe', { sessionId }, (result) => { if (result?.ok === false) onError?.(new Error('Nije moguće povezati sesiju pronalaženja.')); }));
  channels.forEach((channel) => socket.on(channel, onEvent)); socket.on('connect_error', onError || (() => {}));
  return () => { channels.forEach((channel) => socket.off(channel, onEvent)); socket.close(); };
}

export const productAlertsApi = {
  confirm(token) { return apiRequest('/product-alerts/confirm', { method: 'POST', auth: false, body: { token } }); },
  subscribe(productId, payload, { auth = true } = {}) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/alerts`, {
      method: 'POST',
      auth,
      body: payload,
    });
  },
  status(productId, { variantId, managementToken } = {}, { auth = true } = {}) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/alerts/status`, {
      method: 'POST',
      auth,
      body: { variantId, ...(managementToken ? { managementToken } : {}) },
    });
  },
  unsubscribe(productId, payload, { auth = true } = {}) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/alerts`, {
      method: 'DELETE',
      auth,
      body: payload,
    });
  },
};

const PRODUCT_ALERT_STATE_STORAGE_KEY = 'dajashop_product_alert_state';

function productAlertStorageId(productId, variantId, type) {
  return [productId, variantId, type].map(String).join(':');
}

function readStoredProductAlertState() {
  if (typeof window === 'undefined') return { subscriptions: {} };
  try {
    const value = JSON.parse(
      readStoredValue(PRODUCT_ALERT_STATE_STORAGE_KEY, 'necessary') || '{}',
    );
    return value && typeof value === 'object'
      ? { ...value, subscriptions: value.subscriptions || {} }
      : { subscriptions: {} };
  } catch {
    return { subscriptions: {} };
  }
}

function writeStoredProductAlertState(state) {
  writeStoredValue(
    PRODUCT_ALERT_STATE_STORAGE_KEY,
    JSON.stringify({
      managementToken: state.managementToken || undefined,
      maskedEmail: state.maskedEmail || undefined,
      subscriptions: state.subscriptions || {},
    }),
    'necessary',
  );
}

export const productAlertSubscriptions = {
  clearContact() {
    writeStoredProductAlertState({ subscriptions: {} });
  },
  saveContact(contact) {
    writeStoredProductAlertState({ ...readStoredProductAlertState(), ...contact });
  },
  typesFor(productId, variantId) {
    if (!productId || !variantId) return [];
    const prefix = `${String(productId)}:${String(variantId)}:`;
    return Object.keys(readStoredProductAlertState().subscriptions)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  },
  markSubscribed(productId, variantId, type, contact = {}) {
    if (!productId || !variantId || !type) return;
    const state = readStoredProductAlertState();
    const key = productAlertStorageId(productId, variantId, type);
    state.subscriptions[key] = true;
    if (contact.managementToken) state.managementToken = contact.managementToken;
    if (contact.maskedEmail) state.maskedEmail = contact.maskedEmail;
    writeStoredProductAlertState(state);
  },
  replaceTypes(productId, variantId, types = []) {
    if (!productId || !variantId) return;
    const state = readStoredProductAlertState();
    const prefix = `${String(productId)}:${String(variantId)}:`;
    Object.keys(state.subscriptions).forEach((key) => {
      if (key.startsWith(prefix)) delete state.subscriptions[key];
    });
    types.forEach((type) => {
      state.subscriptions[productAlertStorageId(productId, variantId, type)] = true;
    });
    writeStoredProductAlertState(state);
  },
  markUnsubscribed(productId, variantId, type) {
    if (!productId || !variantId || !type) return;
    const state = readStoredProductAlertState();
    delete state.subscriptions[productAlertStorageId(productId, variantId, type)];
    writeStoredProductAlertState(state);
  },
  contact() {
    const state = readStoredProductAlertState();
    return {
      managementToken: state.managementToken || '',
      maskedEmail: state.maskedEmail || '',
    };
  },
};

export const mediaApi = {
  registerExternal(url, options = {}) {
    return apiRequest('/media/external', {
      method: 'POST',
      staff: true,
      body: { url, ...options },
    });
  },
  createUpload(payload) {
    return apiRequest('/media/uploads', {
      method: 'POST',
      staff: true,
      body: payload,
    });
  },
  completeUpload(mediaId) {
    return apiRequest(
      `/media/uploads/${encodeURIComponent(mediaId)}/complete`,
      { method: 'POST', staff: true },
    );
  },
  discardUpload(mediaId) {
    return apiRequest(`/media/uploads/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
      staff: true,
    });
  },
  attachToProduct(productId, mediaId, options = {}) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/media`, {
      method: 'POST',
      staff: true,
      body: { mediaId, ...options },
    });
  },
  updateProductMedia(productId, linkId, options) {
    return apiRequest(
      `/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(linkId)}`,
      { method: 'PATCH', staff: true, body: options },
    );
  },
  detachFromProduct(productId, linkId) {
    return apiRequest(
      `/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(linkId)}`,
      { method: 'DELETE', staff: true },
    );
  },
  listProductMedia(productId) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/media`, {
      staff: true,
    });
  },
  uploadProductImageFile(slug, file, index = 0) {
    return import('./r2ImageService').then(({ uploadProductImage }) =>
      uploadProductImage(slug, file, index),
    );
  },
  uploadRemoteImage(url, productName) {
    return apiRequest('/media/remote-image', {
      method: 'POST',
      staff: true,
      body: { url, productName },
    });
  },
  deleteProductImages(slug) {
    return Promise.resolve({ deleted: true, slug });
  },
};

export const inventoryApi = {
  locations() {
    return apiRequest('/inventory/locations', { staff: true });
  },
  layout() {
    return apiRequest('/inventory/layout', { staff: true });
  },
  balances(variantId) {
    return apiRequest(
      `/inventory/variants/${encodeURIComponent(variantId)}/balances`,
      { staff: true },
    );
  },
  adjust(body) {
    return apiRequest('/inventory/adjustments', {
      method: 'POST',
      staff: true,
      body,
    });
  },
  createItem(body) {
    return apiRequest('/inventory/items', {
      method: 'POST',
      staff: true,
      body,
    });
  },
};

export const rfidApi = {
  byEpc(epc) {
    return apiRequest(`/rfid/tags/by-epc/${encodeURIComponent(epc)}`, {
      staff: true,
    });
  },
  createTag(body) {
    return apiRequest('/rfid/tags', { method: 'POST', staff: true, body });
  },
  assignTag(id, body) {
    return apiRequest(`/rfid/tags/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      staff: true,
      body,
    });
  },
  unassignTag(id, body) {
    return apiRequest(`/rfid/tags/${encodeURIComponent(id)}/unassign`, {
      method: 'POST',
      staff: true,
      body,
    });
  },
};

export const importsApi = {
  createXlsx({ sourceName, base64Xlsx, dryRun = true }) {
    return apiRequest('/imports/xlsx', {
      method: 'POST',
      staff: true,
      body: { sourceName, base64Xlsx, dryRun },
    });
  },
  execute(jobId) {
    return apiRequest(`/imports/${encodeURIComponent(jobId)}/execute`, {
      method: 'POST',
      staff: true,
    });
  },
  reconciliation(jobId) {
    return apiRequest(`/imports/${encodeURIComponent(jobId)}/reconciliation`, {
      staff: true,
    });
  },
};

export const reviewsApi = {
  async forProduct(productId) {
    const data = await apiRequest(
      `/products/${encodeURIComponent(productId)}/reviews`,
      {
        auth: false,
      },
    );
    return toArrayPayload(data);
  },
  add(productId, userData, reviewData) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/reviews`, {
      method: 'POST',
      body: {
        userName: userData?.displayName || userData?.email,
        ...reviewData,
      },
    });
  },
};

export const novostiApi = {
  async subscribe(email, {
    source = 'site',
    policyVersion,
    managementToken,
    acceptedMarketing = false,
    authenticated = false,
  } = {}) {
    if (!acceptedMarketing) {
      throw new Error('Potvrdite saglasnost za prijavu na novosti.');
    }
    const subscription = await apiRequest('/newsletter/subscribe', {
      method: 'POST',
      auth: authenticated,
      body: {
        ...(email ? { email } : {}),
        ...(managementToken ? { managementToken } : {}),
        source,
        acceptedMarketing,
        ...(policyVersion ? { policyVersion } : {}),
      },
    });
    if (subscription?.kodDobrodoslice) {
      writeStoredValue('daja_kod_dobrodoslice_na_cekanju', subscription.kodDobrodoslice, 'necessary');
    }
    writeStoredValue('daja_welcome_promo_removed_for', null, 'necessary');
    window.dispatchEvent(new Event('daja:newsletter-changed'));
    return subscription;
  },
  async confirm(token, { isCurrent = () => true } = {}) {
    const result = await apiRequest('/newsletter/confirm', {
      method: 'POST',
      body: { token },
      auth: false,
    });
    if (!isCurrent()) return result;
    if (result?.kodDobrodoslice) writeStoredValue('daja_kod_dobrodoslice_na_cekanju', result.kodDobrodoslice, 'necessary');
    window.dispatchEvent(new Event('daja:newsletter-changed'));
    return result;
  },
};

export const emailAdminApi = {
  health() { return apiRequest('/admin/emails', { staff: true }); },
  retry(id) { return apiRequest('/admin/emails/' + encodeURIComponent(id) + '/retry', { method: 'POST', staff: true }); },
};

export const privacyApi = {
  unsubscribe(kind, token) {
    if (!['newsletter', 'product-alert'].includes(kind)) throw new Error('Link za odjavu nije važeći.');
    return apiRequest('/privacy/unsubscribe/' + kind + '?token=' + encodeURIComponent(token), { method: 'POST', auth: false });
  },
  current() {
    return apiRequest('/privacy/current', { auth: false });
  },
  documents() {
    return apiRequest('/privacy/documents', { auth: false });
  },
  document(kind) {
    return apiRequest(`/privacy/documents/${encodeURIComponent(kind)}`, { auth: false });
  },
  recordConsent(payload, { authenticated = false } = {}) {
    return apiRequest('/privacy/consents', {
      method: 'POST',
      auth: authenticated,
      body: payload,
    });
  },
  mine() {
    return apiRequest('/privacy/me');
  },
  async odjaviNovosti() {
    const result = await apiRequest('/privacy/me/newsletter', { method: 'DELETE' });
    window.dispatchEvent(new Event('daja:newsletter-changed'));
    return result;
  },
  unsubscribeAlert(id) {
    return apiRequest(`/privacy/me/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

export const privacyAdminApi = {
  listPublications() {
    return apiRequest('/privacy/admin/publications', { staff: true });
  },
  publish(payload) {
    return apiRequest('/privacy/admin/publications', {
      method: 'POST',
      staff: true,
      body: payload,
    });
  },
};

export const promotionsApi = {
  validate(code, items, options = {}) {
    return apiRequest('/promotions/validate', {
      method: 'POST',
      body: {
        code,
        items,
        ...(options.shippingMethod ? { shippingMethod: options.shippingMethod } : {}),
        ...(options.paymentMethod ? { paymentMethod: options.paymentMethod } : {}),
      },
    });
  },
};

export const promotionsAdminApi = {
  list() {
    return apiRequest('/admin/promotions', { staff: true });
  },
  audience(limit = 500) {
    return apiRequest('/admin/promotions/audience', {
      staff: true,
      query: { limit },
    });
  },
  create(payload) {
    return apiRequest('/admin/promotions', {
      method: 'POST',
      staff: true,
      body: payload,
    });
  },
  update(id, payload) {
    return apiRequest(`/admin/promotions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      staff: true,
      body: payload,
    });
  },
  duplicate(id) {
    return apiRequest(`/admin/promotions/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      staff: true,
    });
  },
  remove(id) {
    return apiRequest(`/admin/promotions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      staff: true,
    });
  },
};

export function subscribeRealtime(channels, onEvent, onError) {
  if (!REALTIME_ENABLED) return () => {};
  let socket = null;

  const disconnect = () => {
    if (!socket) return;
    channels.forEach((channel) => socket.off(channel, onEvent));
    socket.close();
    socket = null;
  };

  const connect = () => {
    const token = getStaffAccessToken();
    if (!token) {
      onError?.(new Error('Staff token nije dostupan za real-time vezu.'));
      return;
    }
    socket = createRealtimeSocket(realtimeNamespaceUrl(), () => ({ token: `Bearer ${getStaffAccessToken() || ''}` }));
    channels.forEach((channel) => socket.on(channel, onEvent));
    socket.on('connect_error', onError || (() => {}));
  };

  connect();
  const unsubscribeToken = onStaffAccessTokenChange(() => {
    disconnect();
    connect();
  });

  return () => {
    unsubscribeToken();
    disconnect();
  };
}

export function subscribeCustomerRealtime(onEvent, onError) {
  if (!REALTIME_ENABLED) return () => {};
  const token = getAccessToken();
  if (!token) return () => {};
  const socket = createRealtimeSocket(realtimeNamespaceUrl(), () => ({ token: `Bearer ${getAccessToken() || ''}` }));
  socket.on('customer.email_verified', onEvent);
  socket.on('connect_error', onError || (() => {}));
  return () => {
    socket.off('customer.email_verified', onEvent);
    socket.close();
  };
}

export function subscribeStaffCatalogRealtime(onEvent, onError) {
  if (!REALTIME_ENABLED) return () => {};
  const listener = { onEvent, onError };
  staffCatalogListeners.add(listener);
  ensureStaffCatalogSocket();

  return () => {
    staffCatalogListeners.delete(listener);
    if (staffCatalogListeners.size === 0 && staffCatalogSocket) {
      staffCatalogSocket.close();
      staffCatalogSocket = null;
    }
  };
}

export function subscribePublicCatalogRealtime(onEvent, onError) {
  if (!REALTIME_ENABLED) return () => {};
  window.clearTimeout(publicCatalogCloseTimer);
  publicCatalogListeners.add(onEvent);
  if (!publicCatalogSocket) {
    publicCatalogSocket = createRealtimeSocket(realtimeNamespaceUrl(), () => ({ publicCatalog: true }));
    publicCatalogSocket.on('product.updated', (event) => {
      publicCatalogListeners.forEach((listener) => listener(event));
    });
    publicCatalogSocket.on('catalog.variant-groups.updated', (event) => {
      publicCatalogListeners.forEach((listener) => listener(event));
    });
    publicCatalogSocket.on('connect_error', (error) => {
      // A transient realtime issue must not break ordinary catalog browsing.
      onError?.(error);
    });
  }

  return () => {
    publicCatalogListeners.delete(onEvent);
    if (publicCatalogListeners.size === 0 && publicCatalogSocket) {
      publicCatalogCloseTimer = window.setTimeout(() => {
        if (!publicCatalogListeners.size && publicCatalogSocket) {
          publicCatalogSocket.close(); publicCatalogSocket = null;
        }
      }, 1500);
    }
  };
}

export const specificationEditorApi = (body) => apiRequest("/specification-editor", { staff: true, method: "POST", body });

export const catalogSearchSettingsApi = { get: () => apiRequest("/catalog-search-settings", { staff: true }), save: body => apiRequest("/catalog-search-settings", { staff: true, method: "PUT", body }) };
