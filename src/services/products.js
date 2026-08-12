import { adminCatalogApi, catalogApi } from './dajaPlatform';
import mockProducts from '../data/mock/products';

const allowMockFallback =
  import.meta.env.DEV || import.meta.env.VITE_DAJA_MOCK_FALLBACK === 'true';

function getMockProducts(params = {}) {
  const order = params.order || 'name';
  return [...mockProducts].sort((a, b) => {
    if (order === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0);
    return String(a.name || '').localeCompare(String(b.name || ''), 'sr-RS', {
      sensitivity: 'base',
    });
  });
}

function isInvalidCatalogPayload(items) {
  return !Array.isArray(items) || items.some((item) => !item || !item.id);
}

export function subscribeProducts({ onData, onError, order = 'name', ...params } = {}) {
  let cancelled = false;

  catalogApi
    .listProducts({ order, ...params })
    .then((items) => {
      if (isInvalidCatalogPayload(items)) {
        throw new Error('DAJA catalog API nije vratio validan product payload.');
      }
      if (!cancelled) onData?.(items);
    })
    .catch((error) => {
      console.error('DAJA catalog error:', error);
      if (allowMockFallback) {
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
  return adminCatalogApi.saveProduct(partial);
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

export async function deleteProduct(id) {
  if (!id) throw new Error('ID proizvoda je obavezan');
  return adminCatalogApi.deleteProduct(id);
}
