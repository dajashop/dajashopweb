import {
  API_BASE_URL,
  apiRequest,
  setAuthTokens,
  setStaffAccessToken,
  clearAuthTokens,
  onStaffAccessTokenChange,
  toArrayPayload,
} from './apiClient';
import { io } from 'socket.io-client';
import { getAccessToken, getStaffAccessToken } from './apiClient';

let publicCatalogSocket = null;
const publicCatalogListeners = new Set();
let staffCatalogSocket = null;
const staffCatalogListeners = new Set();

const OAUTH_WAKEUP_TIMEOUT_MS = 90_000;
const OAUTH_WAKEUP_RETRY_MS = 2_000;
const OAUTH_WAKEUP_REQUEST_TIMEOUT_MS = 12_000;

const delay = (duration) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

async function waitForApiBeforeOAuth(onProgress) {
  const probeUrl = new URL(
    `${API_BASE_URL}/public/catalog/products`,
    window.location.origin,
  );
  probeUrl.searchParams.set('limit', '1');

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
      if (response.ok && contentType.includes('application/json')) return;

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
  const configured = import.meta.env.VITE_DAJA_WS_URL || apiBase;
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
  staffCatalogSocket = io(realtimeNamespaceUrl(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
  });
  staffCatalogSocket.on('product.updated', (event) => {
    staffCatalogListeners.forEach((candidate) => candidate.onEvent(event));
  });
  staffCatalogSocket.on('catalog.taxonomy.updated', (event) => {
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
  };
}

function normalizeProduct(product) {
  if (!product) return product;
  const firstVariant = Array.isArray(product.variants)
    ? product.variants[0]
    : null;
  const priceMinor =
    product.price ??
    product.currentPriceAmount ??
    product.current_price_amount ??
    firstVariant?.currentPriceAmount ??
    firstVariant?.current_price_amount;
  const salePriceMinor = product.salePrice ?? product.sale_price;
  const regularPriceMinor = product.regularPrice ?? product.regular_price;
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
      inStock: Boolean(product.inStock ?? product.in_stock),
      availableQuantity: Number(
        product.availableQuantity ?? product.available_quantity ?? 0,
      ),
    },
    inStock: Boolean(
      product.inStock ?? product.in_stock ?? product.availability?.inStock,
    ),
    availableQuantity: Number(
      product.availableQuantity ??
        product.available_quantity ??
        product.availability?.availableQuantity ??
        0,
    ),
    itemCondition: product.itemCondition || product.item_condition || 'new',
    mpn: product.mpn || firstVariant?.mpn || null,
    image: primaryImage,
    mainImageUrl: primaryImage,
    thumbnailUrl: product.thumbnailUrl || product.thumbnail_url || primaryImage,
    specs: product.specs || firstVariant?.attributes || {},
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
    if (data?.accessToken || data?.access_token) setAuthTokens(data);
    return normalizeUser(data);
  },
  async logout() {
    try {
      await apiRequest('/customer-auth/logout', {
        method: 'POST',
        retry: false,
      });
    } catch (error) {
      // Logout must always finish locally. A 401 only means that the session
      // was already expired/revoked, which is a normal state for this action.
      if (error?.status && error.status !== 401) {
        console.warn('Odjava na serveru nije uspela:', error);
      }
    } finally {
      clearAuthTokens();
    }
  },
  async createAdminSession() {
    const storageKey = 'daja_staff_device_id';
    let deviceId = localStorage.getItem(storageKey);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(storageKey, deviceId);
    }
    const data = await apiRequest('/customer-auth/admin/session', {
      method: 'POST',
      body: { deviceId },
    });
    setStaffAccessToken(data?.accessToken || data?.access_token || null);
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
    await waitForApiBeforeOAuth(onProgress);

    // The API validates and signs this URL's origin into the OAuth state, then
    // returns the customer to this exact route (including catalog filters).
    const startUrl = new URL(
      `${API_BASE_URL}/customer-auth/oauth/${provider}/start`,
      window.location.origin,
    );
    startUrl.searchParams.set('returnTo', window.location.href);
    window.location.assign(startUrl.toString());
  },
  async passkeyRegisterStart(payload) {
    return apiRequest('/customer-auth/passkeys/register-challenge', {
      method: 'POST',
      auth: false,
      body: payload,
    });
  },
  async passkeyRegisterFinish(payload) {
    const data = await apiRequest('/customer-auth/passkeys/register-verify', {
      method: 'POST',
      auth: false,
      body: payload,
    });
    if (data?.accessToken || data?.access_token) setAuthTokens(data);
    return data;
  },
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
  async listProducts(params = {}) {
    const requestedLimit = Math.max(1, Number(params.limit) || 20);
    const pageSize = Math.min(requestedLimit, 50);
    const { cursor: initialCursor, limit: _limit, ...filters } = params;
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

    return products.slice(0, requestedLimit);
  },
  async getProductBySlug(slug) {
    const data = await apiRequest(
      `/public/catalog/products/${encodeURIComponent(slug)}`,
      {
        auth: false,
      },
    );
    if (data?.redirectTo) return { redirectTo: data.redirectTo };
    return normalizeProduct(data?.product || data);
  },
};

export const adminCatalogApi = {
  async listProducts() {
    const data = await apiRequest('/products', { staff: true });
    return toArrayPayload(data).map(normalizeProduct);
  },
  async getProduct(id) {
    const data = await apiRequest(`/products/${encodeURIComponent(id)}`, {
      staff: true,
    });
    return normalizeProduct(data);
  },
  async saveProduct(product) {
    const has = (key) => Object.prototype.hasOwnProperty.call(product, key);
    const productPayload = {};
    if (has('name')) productPayload.name = product.name;
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
    if (product.variantId && product.price !== undefined) {
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
        const currentPriceAmount =
          variant.currentPriceAmount ??
          Math.round(Number(variant.price || 0) * 100);
        const body = {
          sku: variant.sku,
          barcode: variant.barcode || null,
          mpn: product.mpn || variant.mpn || null,
          ...(variant.epc !== undefined ? { epc: variant.epc } : {}),
          name: variant.name || null,
          gender: variant.gender || null,
          currentPriceAmount,
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
  async getCart() {
    const data = await apiRequest('/customers/me/cart');
    return toArrayPayload(data, ['items', 'cart']);
  },
  setCart(items) {
    return apiRequest('/customers/me/cart', { method: 'PUT', body: { items } });
  },
  async getWishlist() {
    const data = await apiRequest('/customers/me/wishlist');
    return toArrayPayload(data, ['items', 'wishlist']);
  },
  async setWishlist(items) {
    const next = Array.isArray(items) ? items : [];
    const current = await this.getWishlist().catch(() => []);
    const nextIds = new Set(
      next.map((item) => item.id || item.productId).filter(Boolean),
    );
    await Promise.all(
      current
        .filter((item) => !nextIds.has(item.id || item.productId))
        .map((item) =>
          apiRequest(
            `/customers/me/wishlist/${encodeURIComponent(item.id || item.productId)}`,
            {
              method: 'DELETE',
            },
          ).catch(() => null),
        ),
    );
    for (const item of next) {
      await apiRequest('/customers/me/wishlist', {
        method: 'POST',
        body: { item },
      });
    }
    return next;
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
  linkOAuth(provider) {
    window.location.assign(
      `${API_BASE_URL}/customer-auth/oauth/${provider}/start?link=1`,
    );
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

export const newsletterApi = {
  subscribe(email) {
    return apiRequest('/newsletter/subscribe', {
      method: 'POST',
      auth: false,
      body: { email },
    });
  },
  confirm(token) {
    return apiRequest(`/newsletter/confirm?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      auth: false,
    });
  },
};

export const promotionsApi = {
  validate(code, subtotal) {
    return apiRequest('/promotions/validate', {
      method: 'POST',
      body: { code, subtotal },
    });
  },
};

export function subscribeRealtime(channels, onEvent, onError) {
  const token = getStaffAccessToken();
  if (!token) {
    onError?.(new Error('Staff token nije dostupan za real-time vezu.'));
    return () => {};
  }
  const socket = io(realtimeNamespaceUrl(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 3,
  });
  channels.forEach((channel) => socket.on(channel, onEvent));
  socket.on('connect_error', onError || (() => {}));
  return () => {
    channels.forEach((channel) => socket.off(channel, onEvent));
    socket.close();
  };
}

export function subscribeCustomerRealtime(onEvent, onError) {
  const token = getAccessToken();
  if (!token) return () => {};
  const socket = io(realtimeNamespaceUrl(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 5,
  });
  socket.on('customer.email_verified', onEvent);
  socket.on('connect_error', onError || (() => {}));
  return () => {
    socket.off('customer.email_verified', onEvent);
    socket.close();
  };
}

export function subscribeStaffCatalogRealtime(onEvent, onError) {
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
  publicCatalogListeners.add(onEvent);
  if (!publicCatalogSocket) {
    publicCatalogSocket = io(realtimeNamespaceUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { publicCatalog: true },
      reconnection: true,
      reconnectionAttempts: 5,
    });
    publicCatalogSocket.on('product.updated', (event) => {
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
      publicCatalogSocket.close();
      publicCatalogSocket = null;
    }
  };
}
