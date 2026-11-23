import { cachedResource, requestResource, staleCatalog } from './catalogResourceCache.js';
import { adminCatalogApi, catalogApi } from './dajaPlatform';
import mockProducts from '../data/mock/products';
import { preloadProductImage, PRODUCT_GALLERY_SIZES, productGallerySrcSet } from '../utils/productImageFormats.js';

const allowMockFallback =
  import.meta.env.DEV || import.meta.env.VITE_DAJA_MOCK_FALLBACK === 'true';

function getMockProducts(params = {}) {
  const order = params.order || 'name';
  return [...mockProducts].sort((a, b) => {
    if (order === 'price')
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    return String(a.name || '').localeCompare(String(b.name || ''), 'sr-RS', {
      sensitivity: 'base',
    });
  });
}

function isInvalidCatalogPayload(items) {
  return !Array.isArray(items) || items.some((item) => !item || !item.id);
}

function notifyProductsChanged(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('daja:products-changed', { detail }));
  }
}

export function subscribeProducts({
  onData,
  onError,
  order = 'name',
  admin = false,
  ...params
} = {}) {
  let cancelled = false;
  const controller = new AbortController();

  (admin
    ? adminCatalogApi.listProducts({ signal: controller.signal, onPage: (items, partial) => {
      if (!cancelled) onData?.(items, { partial });
    } })
    : catalogApi.listProducts({ order, ...params })
  )
    .then((items) => {
      if (isInvalidCatalogPayload(items)) {
        throw new Error(
          'DAJA catalog API nije vratio validan product payload.',
        );
      }
      if (!cancelled) onData?.(items);
    })
    .catch((error) => {
      if (cancelled || error.name === 'AbortError') return;
      console.error('DAJA catalog error:', error);
      if (allowMockFallback && !admin) {
        if (!cancelled) onData?.(getMockProducts({ order, ...params }));
        return;
      }
      if (!cancelled) onError?.(error);
    });

  return () => {
    cancelled = true;
    controller.abort();
  };
}

export async function saveCompleteProduct(input) {
  const result = await adminCatalogApi.saveProductBundle(input);
  notifyProductsChanged({ staff: true, type: 'upsert', product: result.product, created: !input.product.id });
  return result;
}

export async function saveProduct(partial) {
  const productId = await adminCatalogApi.saveProduct(partial);
  // Do not refetch the whole catalog after a one-product change. Every list
  // updates just its matching item from this small event payload.
  notifyProductsChanged({
    staff: true,
    type: 'upsert',
    product: { ...partial, id: productId || partial.id },
    created: !partial.id,
  });
  return productId;
}

export async function uploadImages(productId, files, onProgress) {
  const { uploadProductImages } = await import('./r2ImageService');
  return uploadProductImages(productId, files, onProgress);
}

export async function removeImagesByPaths() {
  return undefined;
}

export const productResourceKey = (slug, staffScope) => `product:${staffScope ? `staff:${staffScope}` : 'public'}:${slug}`;
export const cachedProductBySlug = (slug, staffScope) => cachedResource(productResourceKey(slug, staffScope), true);
export function fetchProductBySlug(slug, { staffScope, includeHiddenForAdmin = false, signal, force = false } = {}) {
  return requestResource(productResourceKey(slug, staffScope),
    requestSignal => loadProductBySlug(slug, staffScope, includeHiddenForAdmin, requestSignal, force), { signal, force });
}
const prefetches = new Map();
export function prefetchProduct(slug, { image = false } = {}) {
  if (!slug || typeof window === 'undefined' || cachedResource(productResourceKey(slug), true) || prefetches.has(slug) || prefetches.size >= 2) return;
  const connection = navigator.connection;
  if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return;
  const controller = new AbortController();
  prefetches.set(slug, controller);
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  const load = async () => {
    const product = await prepareProductVariant(slug, { signal: controller.signal });
    if (image) await warmProductImage(product, controller.signal);
  };
  void load().catch(() => {}).finally(() => {
    window.clearTimeout(timeout); prefetches.delete(slug);
  });
}

function warmProductImage(product, signal) {
  const first = product?.images?.[0];
  const src = (typeof first === 'string' ? first : first?.url) || product?.mainImageUrl || product?.image;
  if (!src || typeof Image === 'undefined' || signal.aborted) return;
  return new Promise(resolve => {
    const image = new Image();
    image.fetchPriority = 'low';
    const srcSet = productGallerySrcSet(first);
    let removePicture;
    const finish = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', finish);
      image.onload = null;
      image.onerror = null;
      removePicture?.();
      resolve();
    };
    const timeout = setTimeout(finish, 5_000);
    signal.addEventListener('abort', finish, { once: true });
    image.onload = finish;
    image.onerror = finish;
    removePicture = preloadProductImage(image, src, srcSet, PRODUCT_GALLERY_SIZES);
    if (image.complete) finish();
  });
}

export async function prepareProductVariant(slug, { signal } = {}) {
  const product = await fetchProductBySlug(slug, { signal });
  signal?.throwIfAborted();
  if (staleCatalog(product)) throw new Error('Provera cene i dostupnosti');
  if (product?.salePrice && product.saleValidUntil && Date.parse(product.saleValidUntil) <= Date.now()) {
    return fetchProductBySlug(slug, { signal, force: true });
  }
  return product;
}
async function loadProductBySlug(slug, staffScope, includeHiddenForAdmin, signal, refresh) {
  let publicProduct = null;
  try {
    publicProduct = await catalogApi.getProductBySlug(slug, { signal, refresh });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    if (error.status !== 404 && !allowMockFallback) {
      console.error('Error fetching product:', error);
      throw error;
    }
    if (error.status !== 404 && allowMockFallback)
      return mockProducts.find((product) => product.slug === slug) || null;
  }
  if (publicProduct?.id || publicProduct?.redirectTo) return publicProduct;
  if (includeHiddenForAdmin) return adminCatalogApi.getProductBySlug(slug, signal);
  if (staffScope) {
    try { return await catalogApi.staffWatchBySlug(slug, signal); }
    catch (error) { if (error.status !== 401 && error.status !== 403) throw error; }
  }
  return publicProduct;
}

const realtimeUpdates = new Map();
export function applyPublicProductRealtimeEvent(event) {
  const slug = event?.data?.slug || event?.slug;
  if (!slug) return Promise.resolve();
  if (event?.data?.deleted === true || event?.deleted === true) {
    notifyProductsChanged({ type: 'deleteBySlug', slug, cacheInvalidated: event.catalogCacheInvalidated });
    return Promise.resolve();
  }
  const eventKey = slug + ':' + (event?.serverTime || '');
  if (!realtimeUpdates.has(eventKey)) {
    const work = refreshPublicProduct(slug, event.catalogCacheInvalidated).finally(() => realtimeUpdates.delete(eventKey));
    realtimeUpdates.set(eventKey, work);
  }
  return realtimeUpdates.get(eventKey);
}

async function refreshPublicProduct(slug, cacheInvalidated) {
  const notify = detail => notifyProductsChanged({ ...detail, cacheInvalidated });
  try {
    const product = await catalogApi.getProductBySlug(slug, { realtime: true });
    // Published hidden watches retain their detail page as unavailable.
    // Other non-public/deleted slugs still return null on realtime refresh.
    if (product?.redirectTo) {
      const redirectedSlug = product.redirectTo.split('/').filter(Boolean).pop();
      if (redirectedSlug) {
        const redirectedProduct = await catalogApi.getProductBySlug(redirectedSlug, { realtime: true });
        if (redirectedProduct?.id) {
          notify({
            type: 'upsert',
            product: redirectedProduct,
            previousSlug: slug,
            created: true,
          });
          return;
        }
      }
      notify({ type: 'deleteBySlug', slug });
      return;
    }
    if (!product?.id) {
      notify({ type: 'deleteBySlug', slug });
      return;
    }
    notify({ type: 'upsert', product, created: true });
  } catch (error) {
    if (error?.status === 404) {
      notify({ type: 'deleteBySlug', slug });
      return;
    }
    console.warn('Realtime ažuriranje proizvoda nije uspelo:', error);
  }
}

export async function deleteProduct(id) {
  if (!id) throw new Error('ID proizvoda je obavezan');
  const result = await adminCatalogApi.deleteProduct(id);
  notifyProductsChanged({ staff: true, type: 'delete', id });
  return result;
}

export async function setProductVisibility(id, isVisible) {
  await adminCatalogApi.setProductVisibility(id, isVisible);
  notifyProductsChanged({ staff: true, type: 'upsert', product: { id, isVisible, active: isVisible } });
}
