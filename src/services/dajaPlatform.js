import {
  API_BASE_URL,
  apiRequest,
  setAuthTokens,
  clearAuthTokens,
  toArrayPayload,
} from './apiClient';

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
  };
}

function normalizeProduct(product) {
  if (!product) return product;
  const firstVariant = Array.isArray(product.variants) ? product.variants[0] : null;
  const priceMinor =
    product.price ??
    product.currentPriceAmount ??
    product.current_price_amount ??
    firstVariant?.currentPriceAmount ??
    firstVariant?.current_price_amount;
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
    brand: product.brand || product.brand_name || null,
    category: product.category || product.category_name || null,
    price:
      typeof priceMinor === 'number' && priceMinor > 999
        ? priceMinor / 100
        : Number(priceMinor || 0),
    image: primaryImage,
    mainImageUrl: primaryImage,
    thumbnailUrl: product.thumbnailUrl || product.thumbnail_url || primaryImage,
    specs: product.specs || firstVariant?.attributes || {},
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
      body: { identity: payload.identity || payload.email, password: payload.password },
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
      await apiRequest('/customer-auth/logout', { method: 'POST' });
    } finally {
      clearAuthTokens();
    }
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
  oauthStart(provider) {
    window.location.assign(
      `${API_BASE_URL}/customer-auth/oauth/${provider}/start`,
    );
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
  verifyEmail(code) {
    return apiRequest('/customer-auth/verify-email', {
      method: 'POST',
      auth: false,
      body: { code },
    });
  },
};

export const catalogApi = {
  async listProducts(params = {}) {
    const data = await apiRequest('/public/catalog/products', { query: params, auth: false });
    if (typeof data === 'string') {
      throw new Error('DAJA catalog API je vratio tekst/HTML umesto JSON-a.');
    }
    return toArrayPayload(data).map(normalizeProduct);
  },
  async getProductBySlug(slug) {
    const data = await apiRequest(`/public/catalog/products/${encodeURIComponent(slug)}`, {
      auth: false,
    });
    return normalizeProduct(data?.product || data);
  },
};

export const adminCatalogApi = {
  async saveProduct(product) {
    const productPayload = {
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      brand: product.brand || null,
      category: product.category || null,
      department: product.department || 'satovi',
      gender: product.gender || null,
      price: product.price,
      image: product.image || product.mainImageUrl || product.images?.[0]?.url || '',
      mainImageUrl: product.mainImageUrl || product.images?.[0]?.url || '',
      thumbnailUrl: product.thumbnailUrl || product.images?.[0]?.thumb || product.images?.[0]?.url || '',
      images: product.images || [],
      specs: product.specs || {},
      features: product.features || [],
      seo: product.seo || {},
      model3DUrl: product.model3DUrl || '',
      brandId: product.brandId || product.brand_id || null,
      primaryCategoryId:
        product.primaryCategoryId || product.primary_category_id || product.categoryId || null,
      active: product.isVisible !== false && product.active !== false,
      published: product.published !== false,
    };
    const method = product.id ? 'PATCH' : 'POST';
    const path = product.id ? `/products/${encodeURIComponent(product.id)}` : '/products';
    const data = await apiRequest(path, { method, body: productPayload, staff: true });
    const productId = data?.id || data?.product?.id || product.id;
    if (!product.id && productId && product.price !== undefined) {
      await apiRequest(`/products/${encodeURIComponent(productId)}/variants`, {
        method: 'POST',
        staff: true,
        body: {
          sku: product.sku || product.slug || data?.slug || product.name,
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
          attributes: product.specs || {},
        },
      }).catch(() => null);
    }
    return productId;
  },
  deleteProduct(id) {
    return apiRequest(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      staff: true,
    });
  },
  repairProductImageUrls(productId = '') {
    return Promise.resolve({ repaired: 0, productId });
  },
};

export function createCollectionService(collectionName) {
  const endpoint = collectionEndpoint(collectionName);
  return {
    async list() {
      const data = await apiRequest(endpoint, { staff: true });
      return toArrayPayload(data);
    },
    subscribe(onData, onError) {
      let cancelled = false;
      this.list()
        .then((data) => {
          if (!cancelled) onData(data);
        })
        .catch((error) => {
          if (!cancelled) onError?.(error);
        });
      return () => {
        cancelled = true;
      };
    },
    add(name, extraData = {}) {
      return apiRequest(endpoint, {
        method: 'POST',
        staff: true,
        body: { name: name.trim(), ...extraData },
      });
    },
    update(id, name, extraData = {}) {
      return apiRequest(`${endpoint}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        staff: true,
        body: { name: name.trim(), ...extraData },
      });
    },
    remove(id) {
      return apiRequest(`${endpoint}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        staff: true,
      });
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
    return apiRequest('/customers/me/addresses', { method: 'POST', body: payload });
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
    const nextIds = new Set(next.map((item) => item.id || item.productId).filter(Boolean));
    await Promise.all(
      current
        .filter((item) => !nextIds.has(item.id || item.productId))
        .map((item) =>
          apiRequest(`/customers/me/wishlist/${encodeURIComponent(item.id || item.productId)}`, {
            method: 'DELETE',
          }).catch(() => null),
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
  updatePassword(currentPassword, newPassword) {
    return apiRequest('/customer-auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
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
  uploadProductImages(payload) {
    return apiRequest('/media/uploads', {
      method: 'POST',
      staff: true,
      body: payload,
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

export const reviewsApi = {
  async forProduct(productId) {
    const data = await apiRequest(`/products/${encodeURIComponent(productId)}/reviews`, {
      auth: false,
    });
    return toArrayPayload(data);
  },
  add(productId, userData, reviewData) {
    return apiRequest(`/products/${encodeURIComponent(productId)}/reviews`, {
      method: 'POST',
      body: { userName: userData?.displayName || userData?.email, ...reviewData },
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
};

export function subscribeRealtime(channels, onEvent, onError) {
  const apiBase =
    API_BASE_URL.startsWith('http')
      ? API_BASE_URL
      : `${window.location.origin}${API_BASE_URL}`;
  const base = new URL(apiBase).origin;
  const wsBase =
    import.meta.env.VITE_DAJA_WS_URL ||
    (base ? base.replace(/^http/, 'ws') : 'wss://api-staging.dajashop.rs');
  const url = new URL('/api/v1/realtime', wsBase);
  channels.forEach((channel) => url.searchParams.append('channel', channel));

  const socket = new WebSocket(url.toString());
  socket.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      onEvent(event.data);
    }
  };
  socket.onerror = onError || (() => {});
  return () => socket.close();
}
