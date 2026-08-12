import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useFlash } from '../hooks/useFlash';
import { useAuth } from '../hooks/useAuth';
import { customerApi } from '../services/dajaPlatform';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('daja_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { flash } = useFlash();
  const { user } = useAuth();
  const loadedServerWishlist = useRef(false);
  const isServerUpdate = useRef(false);

  useEffect(() => {
    loadedServerWishlist.current = false;

    if (!user) {
      setWishlist([]);
      localStorage.removeItem('daja_wishlist');
      return;
    }

    let cancelled = false;
    customerApi
      .getWishlist()
      .then((serverList) => {
        if (cancelled) return;
        let localList = [];
        try {
          localList = JSON.parse(localStorage.getItem('daja_wishlist') || '[]');
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
  }, [user]);

  useEffect(() => {
    if (isServerUpdate.current) {
      isServerUpdate.current = false;
      return;
    }

    if (user) {
      if (!loadedServerWishlist.current) return;
      const t = setTimeout(() => {
        customerApi.setWishlist(wishlist).catch((error) =>
          console.error('Wishlist save error:', error),
        );
      }, 500);
      return () => clearTimeout(t);
    }

    localStorage.setItem('daja_wishlist', JSON.stringify(wishlist));
  }, [wishlist, user]);

  const toggleWishlist = (product) => {
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
    setWishlist((prev) => prev.filter((item) => item.id !== id));
    flash('Uklonjeno', 'Proizvod uklonjen iz liste zelja.', 'info');
  };

  const addToWishlist = (product) => {
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
