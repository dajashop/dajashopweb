import { useEffect, useMemo, useReducer, useRef } from 'react';
import { CartCtx } from './CartContext.jsx';
import { useAuth } from '../hooks/useAuth';
import { customerApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform';

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
  const invalidatedProductIds = useRef(new Set());
  const invalidatedProductSlugs = useRef(new Set());

  useEffect(() => {
    loadedServerCart.current = false;

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
        const localItems = initial();
        const merged = [...serverCart];
        localItems.forEach((localItem) => {
          if (
            !invalidatedProductIds.current.has(localItem.id) &&
            !invalidatedProductSlugs.current.has(localItem.slug) &&
            !merged.some((item) => item.id === localItem.id)
          ) {
            merged.push(localItem);
          }
        });
        const validItems = merged.filter(
          (item) =>
            !invalidatedProductIds.current.has(item.id) &&
            !invalidatedProductSlugs.current.has(item.slug),
        );
        isServerUpdate.current = true;
        dispatch({ type: 'REPLACE', items: validItems });
        loadedServerCart.current = true;
        if (validItems.length !== serverCart.length) customerApi.setCart(validItems);
      })
      .catch((error) => console.error('Cart load error:', error));

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    return subscribePublicCatalogRealtime((event) => {
      const productId = event?.data?.productId || event?.productId;
      const slug = event?.data?.slug || event?.slug;
      if (!productId && !slug) return;

      if (productId) invalidatedProductIds.current.add(productId);
      if (slug) invalidatedProductSlugs.current.add(slug);
      dispatch({ type: 'REMOVE_PRODUCT', productId, slug });
    });
  }, [user]);

  useEffect(() => {
    if (isServerUpdate.current) {
      isServerUpdate.current = false;
      return;
    }

    if (user) {
      if (!loadedServerCart.current) return;
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
    <CartCtx.Provider value={{ items, dispatch, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}
