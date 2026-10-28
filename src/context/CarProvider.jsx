import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { CartCtx } from './CartContext.jsx';
import { useAuth } from '../hooks/useAuth';
import { customerApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform';
import { applyPublicProductRealtimeEvent } from '../services/products';
import { useConsent } from './ConsentContext.jsx';
import { readStoredValue, removeStoredValue, writeStoredValue } from '../services/consentStorage.js';

const initial = () => {
  try {
    const saved = JSON.parse(readStoredValue('cart', 'necessary') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const i = state.findIndex((x) => (x.lineId || x.id) === (action.item.lineId || action.item.id));
      if (i >= 0) {
        const next = [...state];
        next[i] = { ...next[i], qty: next[i].qty + (action.qty || 1) };
        return next;
      }
      return [
        ...state,
        {
          ...action.item,
          productId: action.item.productId ?? action.item.id,
          variantId: action.item.variantId ?? action.item.variants?.[0]?.id,
          qty: action.qty || 1,
        },
      ];
    }
    case 'REMOVE':
      return state.filter((x) => (x.lineId || x.id) !== action.id);
    case 'APPLY_ENGRAVING': {
      const index = state.findIndex((item) => (item.lineId || item.id) === action.lineId);
      if (index < 0) {
        const same = state.findIndex((item) => item.lineId === action.item.lineId);
        if (same >= 0) return state.map((item, i) => i === same ? { ...action.item, qty: item.qty + 1 } : item);
        return [...state, { ...action.item, qty: 1 }];
      }
      return state.map((item, i) => i === index ? { ...action.item, qty: item.qty } : item);
    }
    case 'REMOVE_PRODUCT':
      return state.filter(
        (item) =>
          (!action.productId || item.id !== action.productId) &&
          (!action.slug || item.slug !== action.slug),
      );
    case 'UPDATE_PRODUCT':
      return state.map((item) => {
        const product = action.product;
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
      });
    case 'SET_QTY':
      return state.map((x) =>
        (x.lineId || x.id) === action.id ? { ...x, qty: Math.max(1, action.qty) } : x,
      );
    case 'CLEAR':
      return [];
    case 'REPLACE':
      return action.items || [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [], initial);
  const { user, authReady } = useAuth();
  const userId = user?.uid || user?.id || null;
  const previousUserId = useRef(null);
  const { hasDecision } = useConsent();
  const loadedServerCart = useRef(false);
  const isServerUpdate = useRef(false);
  const cartChannel = useRef(null);
  const latestItems = useRef(items);
  const hasCrossTabState = useRef(false);
  const hydratedGuestCart = useRef(false);
  const guestCartPersistence = useRef(false);
  const pendingActions = useRef([]);
  const serverDirty = useRef(false);
  const accountController = useRef(null);
  const pendingLoad = useRef(null);

  useEffect(() => {
    latestItems.current = items;
  }, [items]);

  useEffect(() => {
    if (!hasDecision || !authReady) return undefined;
    loadedServerCart.current = false;
    hasCrossTabState.current = false;

    if (previousUserId.current && previousUserId.current !== userId) {
      removeStoredValue('cart');
      guestCartPersistence.current = false;
      hydratedGuestCart.current = true;
      isServerUpdate.current = true;
      latestItems.current = [];
      pendingActions.current = [];
      serverDirty.current = false;
      dispatch({ type: 'CLEAR' });
    }
    previousUserId.current = userId;

    if (!userId) {
      if (!hydratedGuestCart.current) {
        const localItems = guestCartPersistence.current ? latestItems.current : initial();
        guestCartPersistence.current = localItems.length > 0;
        dispatch({ type: 'REPLACE', items: localItems });
        hydratedGuestCart.current = true;
      }
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    accountController.current = controller;
    const load = () => customerApi
      .getCart({ signal: controller.signal })
      .then((serverCart) => {
        if (cancelled) return;
        const localItems = initial();
        let merged = [...(hasCrossTabState.current || serverCart)];
        localItems.forEach((localItem) => {
          const index = merged.findIndex((item) => (item.lineId || item.id) === (localItem.lineId || localItem.id));
          if (index < 0) merged.push(localItem);
          else merged[index] = { ...merged[index], qty: (Number(merged[index].qty) || 1) + (Number(localItem.qty) || 1) };
        });
        const actions = pendingActions.current;
        pendingActions.current = [];
        merged = actions.reduce(reducer, merged);
        isServerUpdate.current = true;
        latestItems.current = merged;
        dispatch({ type: 'REPLACE', items: merged });
        loadedServerCart.current = true;
        if (localItems.length || actions.length) {
          serverDirty.current = true;
          return customerApi.setCart(merged, { signal: controller.signal }).then(() => {
            if (cancelled) return;
            removeStoredValue('cart');
            guestCartPersistence.current = false;
            if (latestItems.current === merged) serverDirty.current = false;
            cartChannel.current?.postMessage({ type: 'replace-state', items: latestItems.current });
          });
        }
      });
    // Only one tab consumes the shared guest cart at a time.
    const pending = navigator.locks?.request
      ? navigator.locks.request(`daja:cart-merge:${userId}`, { signal: controller.signal }, load)
      : load();
    pendingLoad.current = pending;
    pending.catch((error) => { if (!cancelled) console.error('Cart load error:', error); });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hasDecision, authReady, userId]);

  useEffect(() => {
    if (!hasDecision || !userId) return undefined;

    return subscribePublicCatalogRealtime((event) => {
      void applyPublicProductRealtimeEvent(event);
    });
  }, [hasDecision, userId]);

  useEffect(() => {
    if (
      !hasDecision ||
      !userId ||
      typeof window === 'undefined' ||
      !('BroadcastChannel' in window)
    ) {
      return undefined;
    }

    const channel = new window.BroadcastChannel(`daja:cart:${userId}`);
    cartChannel.current = channel;
    channel.onmessage = ({ data }) => {
      if (data?.type === 'request-state') {
        if (loadedServerCart.current) {
          channel.postMessage({ type: 'replace-state', items: latestItems.current });
        }
        return;
      }
      if (data?.type === 'replace-state' && Array.isArray(data.items)) {
        hasCrossTabState.current = data.items;
        isServerUpdate.current = true;
        dispatch({ type: 'REPLACE', items: data.items });
      }
    };
    channel.postMessage({ type: 'request-state' });

    return () => {
      if (cartChannel.current === channel) cartChannel.current = null;
      channel.close();
    };
  }, [hasDecision, userId]);

  useEffect(() => {
    const applyProductChange = (event) => {
      const change = event.detail;
      if (change?.type === 'upsert' && change.product?.id) {
        dispatch({ type: 'UPDATE_PRODUCT', product: change.product });
      }
      if (change?.type === 'delete' && change.id) {
        dispatch({ type: 'REMOVE_PRODUCT', productId: change.id });
      }
      if (change?.type === 'deleteBySlug' && change.slug) {
        dispatch({ type: 'REMOVE_PRODUCT', slug: change.slug });
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
      if (!loadedServerCart.current) return;
      cartChannel.current?.postMessage({
        type: 'replace-state',
        items,
      });
      const controller = accountController.current;
      const t = setTimeout(() => {
        customerApi.setCart(items, { signal: controller.signal }).then(() => {
          if (latestItems.current === items) serverDirty.current = false;
        }).catch((error) => {
          if (!controller.signal.aborted) console.error('Cart save error:', error);
        });
      }, 500);
      return () => clearTimeout(t);
    }

    if (!hydratedGuestCart.current || !guestCartPersistence.current) return undefined;
    writeStoredValue('cart', JSON.stringify(items), 'necessary');
    return undefined;
  }, [hasDecision, authReady, items, userId]);

  useEffect(() => {
    const flush = (event) => {
      if (userId) {
        const controller = accountController.current;
        event.detail.push(Promise.resolve(pendingLoad.current).then(() => {
          if (controller && !controller.signal.aborted && loadedServerCart.current && serverDirty.current) {
            return customerApi.setCart(latestItems.current, { signal: controller.signal });
          }
        }));
      }
    };
    window.addEventListener('daja:before-logout', flush);
    return () => window.removeEventListener('daja:before-logout', flush);
  }, [userId]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const customerDispatch = useCallback((action) => {
    if (!['REPLACE', 'UPDATE_PRODUCT', 'REMOVE_PRODUCT'].includes(action?.type)) {
      latestItems.current = reducer(latestItems.current, action);
      if (!userId) {
        guestCartPersistence.current = true;
        writeStoredValue('cart', JSON.stringify(latestItems.current), 'necessary');
      } else {
        serverDirty.current = true;
        if (!loadedServerCart.current) pendingActions.current.push(action);
      }
    }
    dispatch(action);
  }, [userId]);

  return (
    <CartCtx.Provider value={{ items, cart: items, dispatch: customerDispatch, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}
