import { useEffect, useMemo, useReducer, useRef } from 'react';
import { CartCtx } from './CartContext.jsx';
import { useAuth } from '../hooks/useAuth';
import { customerApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform';
import { applyPublicProductRealtimeEvent } from '../services/products';

const initial = () => {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch {
    return [];
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const i = state.findIndex((x) => x.id === action.item.id);
      if (i >= 0) {
        const next = [...state];
        next[i] = { ...next[i], qty: next[i].qty + (action.qty || 1) };
        return next;
      }
      return [...state, { ...action.item, qty: action.qty || 1 }];
    }
    case 'REMOVE':
      return state.filter((x) => x.id !== action.id);
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
        x.id === action.id ? { ...x, qty: Math.max(1, action.qty) } : x,
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
  const { user } = useAuth();
  const loadedServerCart = useRef(false);
  const isServerUpdate = useRef(false);
  const cartChannel = useRef(null);
  const latestItems = useRef(items);
  const hasCrossTabState = useRef(false);

  useEffect(() => {
    latestItems.current = items;
  }, [items]);

  useEffect(() => {
    loadedServerCart.current = false;
    hasCrossTabState.current = false;

    if (!user) {
      dispatch({ type: 'CLEAR' });
      localStorage.removeItem('cart');
      return;
    }

    let cancelled = false;
    customerApi
      .getCart()
      .then((serverCart) => {
        if (cancelled) return;
        if (hasCrossTabState.current) {
          loadedServerCart.current = true;
          return;
        }
        const localItems = initial();
        const merged = [...serverCart];
        localItems.forEach((localItem) => {
          if (!merged.some((item) => item.id === localItem.id)) merged.push(localItem);
        });
        isServerUpdate.current = true;
        dispatch({ type: 'REPLACE', items: merged });
        loadedServerCart.current = true;
        if (merged.length !== serverCart.length) customerApi.setCart(merged);
      })
      .catch((error) => console.error('Cart load error:', error));

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    return subscribePublicCatalogRealtime((event) => {
      void applyPublicProductRealtimeEvent(event);
    });
  }, [user]);

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (
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
        hasCrossTabState.current = true;
        isServerUpdate.current = true;
        dispatch({ type: 'REPLACE', items: data.items });
      }
    };
    channel.postMessage({ type: 'request-state' });

    return () => {
      if (cartChannel.current === channel) cartChannel.current = null;
      channel.close();
    };
  }, [user?.id, user?.uid]);

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
    if (isServerUpdate.current) {
      isServerUpdate.current = false;
      return;
    }

    if (user) {
      if (!loadedServerCart.current) return;
      cartChannel.current?.postMessage({
        type: 'replace-state',
        items,
      });
      const t = setTimeout(() => {
        customerApi.setCart(items).catch((error) =>
          console.error('Cart save error:', error),
        );
      }, 500);
      return () => clearTimeout(t);
    }

    localStorage.setItem('cart', JSON.stringify(items));
  }, [items, user]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  return (
    <CartCtx.Provider value={{ items, cart: items, dispatch, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}
