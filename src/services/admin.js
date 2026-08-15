import {
  adminCatalogApi,
  createCollectionService,
  mediaApi,
  ordersApi,
  subscribeRealtime,
} from './dajaPlatform';

export const ordersService = {
  subscribe(onData, onError) {
    let cancelled = false;

    ordersApi
      .adminList()
      .then((items) => {
        if (!cancelled) onData(items);
      })
      .catch((error) => {
        if (!cancelled) onError?.(error);
      });

    const stopRealtime = subscribeRealtime(
      ['orders.created', 'orders.updated'],
      () => {
        ordersApi
          .adminList()
          .then((items) => {
            if (!cancelled) onData(items);
          })
          .catch((error) => {
            if (!cancelled) onError?.(error);
          });
      },
      onError,
    );
    const fallbackRefresh = window.setInterval(() => {
      ordersApi.adminList().then((items) => {
        if (!cancelled) onData(items);
      }).catch(() => {});
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(fallbackRefresh);
      stopRealtime?.();
    };
  },
  updateStatus: ordersApi.updateStatus,
  markAsRead: ordersApi.markAsRead,
};

export const uploadRemoteImage = async (url, productName) => {
  try {
    return await mediaApi.uploadRemoteImage(url, productName);
  } catch (error) {
    console.error('DAJA media remote upload error:', error);
    return { success: false, url, results: [] };
  }
};

export const repairProductImageUrls = (productId = '') =>
  adminCatalogApi.repairProductImageUrls(productId);

export const generateThumbnail = (storagePath) =>
  mediaApi.uploadProductImages({ storagePath, generateThumbnailOnly: true });

export const uploadProductImagesToR2 = (payload) =>
  mediaApi.uploadProductImages(payload);

export const deleteProductImagesFromR2 = (slug) =>
  mediaApi.deleteProductImages(slug);

export const brandService = createCollectionService('brands');
export const departmentService = createCollectionService('departments');
export const categoryService = createCollectionService('categories');
export const specKeyService = createCollectionService('spec_keys');
