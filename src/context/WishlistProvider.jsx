import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useFlash } from '../hooks/useFlash';
import { useAuth } from '../hooks/useAuth';
import { customerApi } from '../services/dajaPlatform';
import { useConsent } from './ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = readStoredValue('daja_wishlist', 'necessary');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { flash } = useFlash();
  const { user } = useAuth();
  const { hasDecision } = useConsent();
  const loadedServerWishlist = useRef(false);
  const isServerUpdate = useRef(false);
  const wishlistChannel = useRef(null);
  const latestWishlist = useRef(wishlist);
  const hasCrossTabState = useRef(false);
  const hydratedGuestWishlist = useRef(false);
  const guestWishlistPersistence = useRef(false);

  useEffect(() => {
    latestWishlist.current = wishlist;
  }, [wishlist]);

  useEffect(() => {
    if (!hasDecision) return undefined;
    loadedServerWishlist.current = false;
    hasCrossTabState.current = false;

    if (!user) {
      if (!hydratedGuestWishlist.current) {
        try {
          const localWishlist = JSON.parse(readStoredValue('daja_wishlist', 'necessary') || '[]');
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
    customerApi
      .getWishlist()
      .then((serverList) => {
        if (cancelled) return;
        if (hasCrossTabState.current) {
          loadedServerWishlist.current = true;
          return;
        }
        let localList = [];
        try {
          localList = JSON.parse(readStoredValue('daja_wishlist', 'necessary') || '[]');
        } catch {
          localList = [];
        }
        const merged = [...serverList];
        localList.forEach((localItem) => {
          if (!merged.some((item) => item.id === localItem.id)) merged.push(localItem);
        });
        isServerUpdate.current = true;
        setWishlist(merged);
        loadedServerWishlist.current = true;
        if (merged.length !== serverList.length) customerApi.setWishlist(merged);
      })
      .catch((error) => console.error('Wishlist load error:', error));

    return () => {
      cancelled = true;
    };
  }, [hasDecision, user]);

  useEffect(() => {
    const userId = user?.uid || user?.id;
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
        hasCrossTabState.current = true;
        isServerUpdate.current = true;
        setWishlist(data.wishlist);
      }
    };
    channel.postMessage({ type: 'request-state' });

    return () => {
      if (wishlistChannel.current === channel) wishlistChannel.current = null;
      channel.close();
    };
  }, [hasDecision, user?.id, user?.uid]);

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
    if (!hasDecision) return undefined;
    if (isServerUpdate.current) {
      isServerUpdate.current = false;
      return;
    }

    if (user) {
      if (!loadedServerWishlist.current) return;
      wishlistChannel.current?.postMessage({
        type: 'replace-state',
        wishlist,
      });
      const t = setTimeout(() => {
        customerApi.setWishlist(wishlist).catch((error) =>
          console.error('Wishlist save error:', error),
        );
      }, 500);
      return () => clearTimeout(t);
    }

    if (!hydratedGuestWishlist.current || !guestWishlistPersistence.current) return undefined;
    writeStoredValue('daja_wishlist', JSON.stringify(wishlist), 'necessary');
    return undefined;
  }, [hasDecision, wishlist, user]);

  const toggleWishlist = (product) => {
    if (!user) guestWishlistPersistence.current = true;
    const exists = wishlist.find((item) => item.id === product.id);

    if (exists) {
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      flash('Uklonjeno', 'Proizvod uklonjen iz liste zelja.', 'info');
      return;
    }

    setWishlist((prev) => [
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
    if (!user) guestWishlistPersistence.current = true;
    setWishlist((prev) => prev.filter((item) => item.id !== id));
    flash('Uklonjeno', 'Proizvod uklonjen iz liste zelja.', 'info');
  };

  const addToWishlist = (product) => {
    if (!user) guestWishlistPersistence.current = true;
    setWishlist((prev) => {
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
