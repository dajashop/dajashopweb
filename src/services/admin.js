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

    let inFlight = false;
    let refreshAgain = false;
    const load = async () => {
      if (cancelled) return;
      if (inFlight) { refreshAgain = true; return; }
      inFlight = true;
      try {
        const items = await ordersApi.adminList();
        if (!cancelled) onData(items);
      } catch (error) {
        if (!cancelled) onError?.(error);
      } finally {
        inFlight = false;
        if (refreshAgain && !cancelled) {
          refreshAgain = false;
          void load();
        }
      }
    };
    void load();
    const stopRealtime = subscribeRealtime(
      ['orders.created', 'orders.updated'], load, onError,
    );
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const fallbackRefresh = window.setInterval(refreshVisible, 30_000);
    document.addEventListener('visibilitychange', refreshVisible);

    return () => {
      cancelled = true;
      window.clearInterval(fallbackRefresh);
      document.removeEventListener('visibilitychange', refreshVisible);
      stopRealtime?.();
    };
  },
  updateStatus: ordersApi.updateStatus,
  markAsRead: ordersApi.markAsRead,
  retryEmail: ordersApi.retryEmail,
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
