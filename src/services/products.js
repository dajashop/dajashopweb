import { adminCatalogApi, catalogApi } from './dajaPlatform';
import mockProducts from '../data/mock/products';

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

  (admin
    ? adminCatalogApi.listProducts()
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
      console.error('DAJA catalog error:', error);
      if (allowMockFallback && !admin) {
        if (!cancelled) onData?.(getMockProducts({ order, ...params }));
        return;
      }
      if (!cancelled) onError?.(error);
    });

  return () => {
    cancelled = true;
  };
}

export async function saveProduct(partial) {
  const productId = await adminCatalogApi.saveProduct(partial);
  // Do not refetch the whole catalog after a one-product change. Every list
  // updates just its matching item from this small event payload.
  notifyProductsChanged({
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

export async function fetchProductBySlug(slug) {
  try {
    return await catalogApi.getProductBySlug(slug);
  } catch (error) {
    if (allowMockFallback) {
      return mockProducts.find((product) => product.slug === slug) || null;
    }
    if (error.status === 404) return null;
    console.error('Error fetching product:', error);
    throw error;
  }
}

export async function applyPublicProductRealtimeEvent(event) {
  const slug = event?.data?.slug || event?.slug;
  if (!slug) return;
  try {
    const product = await catalogApi.getProductBySlug(slug);
    // The public API returns 200 + null for a hidden, unpublished or deleted
    // slug. Treat that exactly like a missing product.
    if (!product?.id) {
      notifyProductsChanged({ type: 'deleteBySlug', slug });
      return;
    }
    notifyProductsChanged({ type: 'upsert', product, created: true });
  } catch (error) {
    if (error?.status === 404) {
      notifyProductsChanged({ type: 'deleteBySlug', slug });
      return;
    }
    console.warn('Realtime ažuriranje proizvoda nije uspelo:', error);
  }
}

export async function deleteProduct(id) {
  if (!id) throw new Error('ID proizvoda je obavezan');
  const result = await adminCatalogApi.deleteProduct(id);
  notifyProductsChanged({ type: 'delete', id });
  return result;
}

export async function setProductVisibility(id, isVisible) {
  await adminCatalogApi.setProductVisibility(id, isVisible);
  notifyProductsChanged({ type: 'upsert', product: { id, isVisible, active: isVisible } });
}
