import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useFlash } from '../hooks/useFlash';
import { useAuth } from '../hooks/useAuth';
import { customerApi } from '../services/dajaPlatform';
import { useConsent } from './ConsentContext.jsx';
import { readStoredValue, removeStoredValue, writeStoredValue } from '../services/consentStorage.js';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = readStoredValue('daja_wishlist', 'necessary');
      const items = saved ? JSON.parse(saved) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  });

  const { flash } = useFlash();
  const { user, authReady } = useAuth();
  const userId = user?.uid || user?.id || null;
  const previousUserId = useRef(null);
  const { hasDecision } = useConsent();
  const loadedServerWishlist = useRef(false);
  const isServerUpdate = useRef(false);
  const wishlistChannel = useRef(null);
  const latestWishlist = useRef(wishlist);
  const hasCrossTabState = useRef(false);
  const hydratedGuestWishlist = useRef(false);
  const guestWishlistPersistence = useRef(false);
  const pendingChanges = useRef([]);
  const serverDirty = useRef(false);
  const accountController = useRef(null);
  const pendingLoad = useRef(null);

  useEffect(() => {
    latestWishlist.current = wishlist;
  }, [wishlist]);

  useEffect(() => {
    if (!hasDecision || !authReady) return undefined;
    loadedServerWishlist.current = false;
    hasCrossTabState.current = false;

    if (previousUserId.current && previousUserId.current !== userId) {
      removeStoredValue('daja_wishlist');
      guestWishlistPersistence.current = false;
      hydratedGuestWishlist.current = true;
      isServerUpdate.current = true;
      latestWishlist.current = [];
      pendingChanges.current = [];
      serverDirty.current = false;
      setWishlist([]);
    }
    previousUserId.current = userId;

    if (!userId) {
      if (!hydratedGuestWishlist.current) {
        try {
          const saved = guestWishlistPersistence.current ? latestWishlist.current
            : JSON.parse(readStoredValue('daja_wishlist', 'necessary') || '[]');
          const localWishlist = Array.isArray(saved) ? saved : [];
          guestWishlistPersistence.current = localWishlist.length > 0;
          setWishlist(localWishlist);
        } catch {
          setWishlist([]);
        }
        hydratedGuestWishlist.current = true;
      }
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    accountController.current = controller;
    const load = () => customerApi
      .getWishlist({ signal: controller.signal })
      .then((serverList) => {
        if (cancelled) return;
        let localList = [];
        try {
          const saved = JSON.parse(readStoredValue('daja_wishlist', 'necessary') || '[]');
          localList = Array.isArray(saved) ? saved : [];
        } catch {
          localList = [];
        }
        let merged = [...(hasCrossTabState.current || serverList)];
        localList.forEach((localItem) => {
          if (!merged.some((item) => item.id === localItem.id)) merged.push(localItem);
        });
        const changes = pendingChanges.current;
        pendingChanges.current = [];
        merged = changes.reduce((current, change) => change(current), merged);
        isServerUpdate.current = true;
        latestWishlist.current = merged;
        setWishlist(merged);
        loadedServerWishlist.current = true;
        if (localList.length || changes.length) {
          serverDirty.current = true;
          return customerApi.setWishlist(merged, { signal: controller.signal }).then(() => {
            if (cancelled) return;
            removeStoredValue('daja_wishlist');
            guestWishlistPersistence.current = false;
            if (latestWishlist.current === merged) serverDirty.current = false;
            wishlistChannel.current?.postMessage({ type: 'replace-state', wishlist: latestWishlist.current });
          });
        }
      });
    const pending = navigator.locks?.request
      ? navigator.locks.request(`daja:wishlist-merge:${userId}`, { signal: controller.signal }, load)
      : load();
    pendingLoad.current = pending;
    pending.catch((error) => { if (!cancelled) console.error('Wishlist load error:', error); });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hasDecision, authReady, userId]);

  useEffect(() => {
    if (
      !hasDecision ||
      !userId ||
      typeof window === 'undefined' ||
      !('BroadcastChannel' in window)
    ) {
      return undefined;
    }

    const channel = new window.BroadcastChannel(`daja:wishlist:${userId}`);
    wishlistChannel.current = channel;
    channel.onmessage = ({ data }) => {
      if (data?.type === 'request-state') {
        if (loadedServerWishlist.current) {
          channel.postMessage({ type: 'replace-state', wishlist: latestWishlist.current });
        }
        return;
      }
      if (data?.type === 'replace-state' && Array.isArray(data.wishlist)) {
        hasCrossTabState.current = data.wishlist;
        isServerUpdate.current = true;
        setWishlist(data.wishlist);
      }
    };
    channel.postMessage({ type: 'request-state' });

    return () => {
      if (wishlistChannel.current === channel) wishlistChannel.current = null;
      channel.close();
    };
  }, [hasDecision, userId]);

  useEffect(() => {
    const applyProductChange = (event) => {
      const change = event.detail;
      if (change?.type === 'upsert' && change.product?.id) {
        const product = change.product;
        setWishlist((current) =>
          current.map((item) => {
            if (item.id !== product.id && item.slug !== product.slug) return item;
            return {
              ...item,
              id: product.id ?? item.id,
              productId: product.productId ?? product.id ?? item.productId,
              variantId: product.variantId ?? item.variantId,
              name: product.name ?? item.name,
              price: product.price ?? item.price,
              image:
                product.image ??
                product.mainImageUrl ??
                product.primaryImageUrl ??
                item.image,
              thumb:
                product.thumbnailUrl ??
                product.image ??
                product.primaryImageUrl ??
                item.thumb,
              brand: product.brand !== undefined ? product.brand : item.brand,
              slug: product.slug ?? item.slug,
            };
          }),
        );
      }
      if (change?.type === 'delete' && change.id) {
        setWishlist((current) => current.filter((item) => item.id !== change.id));
      }
      if (change?.type === 'deleteBySlug' && change.slug) {
        setWishlist((current) => current.filter((item) => item.slug !== change.slug));
      }
    };
    window.addEventListener('daja:products-changed', applyProductChange);
    return () => window.removeEventListener('daja:products-changed', applyProductChange);
  }, []);

  useEffect(() => {
    if (!hasDecision || !authReady) return undefined;
    if (isServerUpdate.current) {
      isServerUpdate.current = false;
      return;
    }

    if (userId) {
      if (!loadedServerWishlist.current) return;
      wishlistChannel.current?.postMessage({
        type: 'replace-state',
        wishlist,
      });
      const controller = accountController.current;
      const t = setTimeout(() => {
        customerApi.setWishlist(wishlist, { signal: controller.signal }).then(() => {
          if (latestWishlist.current === wishlist) serverDirty.current = false;
        }).catch((error) => {
          if (!controller.signal.aborted) console.error('Wishlist save error:', error);
        });
      }, 500);
      return () => clearTimeout(t);
    }

    if (!hydratedGuestWishlist.current || !guestWishlistPersistence.current) return undefined;
    writeStoredValue('daja_wishlist', JSON.stringify(wishlist), 'necessary');
    return undefined;
  }, [hasDecision, authReady, wishlist, userId]);

  useEffect(() => {
    const flush = (event) => {
      if (userId) {
        const controller = accountController.current;
        event.detail.push(Promise.resolve(pendingLoad.current).then(() => {
          if (controller && !controller.signal.aborted && loadedServerWishlist.current && serverDirty.current) {
            return customerApi.setWishlist(latestWishlist.current, { signal: controller.signal });
          }
        }));
      }
    };
    window.addEventListener('daja:before-logout', flush);
    return () => window.removeEventListener('daja:before-logout', flush);
  }, [userId]);

  const updateWishlist = (change) => {
    const next = change(latestWishlist.current);
    latestWishlist.current = next;
    setWishlist(next);
    if (!userId) {
      guestWishlistPersistence.current = true;
      writeStoredValue('daja_wishlist', JSON.stringify(next), 'necessary');
    } else {
      serverDirty.current = true;
      if (!loadedServerWishlist.current) pendingChanges.current.push(change);
    }
  };

  const toggleWishlist = (product) => {
    const exists = latestWishlist.current.find((item) => item.id === product.id);

    if (exists) {
      updateWishlist((prev) => prev.filter((item) => item.id !== product.id));
      flash('Uklonjeno', 'Proizvod uklonjen iz liste zelja.', 'info');
      return;
    }

    updateWishlist((prev) => [
      ...prev,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        brand: product.brand,
        slug: product.slug,
      },
    ]);
    flash('Sacuvano', 'Proizvod dodat u listu zelja.', 'success');
  };

  const removeFromWishlist = (id) => {
    updateWishlist((prev) => prev.filter((item) => item.id !== id));
    flash('Uklonjeno', 'Proizvod uklonjen iz liste zelja.', 'info');
  };

  const addToWishlist = (product) => {
    updateWishlist((prev) => {
      if (prev.some((item) => item.id === product.id)) return prev;
      return [...prev, product];
    });
    flash('Vraceno', 'Proizvod vracen u listu zelja.', 'success');
  };

  const isInWishlist = (id) => wishlist.some((item) => item.id === id);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        removeFromWishlist,
        addToWishlist,
        isInWishlist,
        count: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
