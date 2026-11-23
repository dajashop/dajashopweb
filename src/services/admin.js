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
    let connected = false;
    let refreshAgain = false;
    let inFlight;
    let timer;

    async function load() {
      clearTimeout(timer);
      if (cancelled || document.hidden) return;
      if (inFlight) {
        refreshAgain = true;
        return;
      }
      refreshAgain = false;
      const controller = new AbortController();
      inFlight = controller;
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const items = await ordersApi.adminList(controller.signal);
        if (!cancelled) onData(items);
      } catch (error) {
        if (!cancelled) onError?.(error);
      } finally {
        clearTimeout(timeout);
        inFlight = undefined;
        if (!cancelled && !document.hidden) {
          if (refreshAgain) {
            refreshAgain = false;
            void load();
          } else {
            timer = setTimeout(load, connected ? 120_000 : 30_000);
          }
        }
      }
    }
    const onChange = () => {
      if (cancelled || document.hidden) return;
      if (inFlight) {
        refreshAgain = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(load, 250);
    };
    const wake = () => {
      clearTimeout(timer);
      if (!document.hidden) void load();
    };
    const stopRealtime = subscribeRealtime(
      ['orders.created', 'orders.updated'], onChange, onError, ready => {
        connected = ready;
        wake();
      },
    );
    void load();
    document.addEventListener('visibilitychange', wake);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      inFlight?.abort();
      document.removeEventListener('visibilitychange', wake);
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
