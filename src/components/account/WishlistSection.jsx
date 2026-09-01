import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, Heart, Trash2, ShoppingCart } from 'lucide-react';
import { money } from '../../utils/currency.js';
import { useWishlist } from '../../context/WishlistProvider.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useFlash } from '../../hooks/useFlash.js';
import { useUndo } from '../../hooks/useUndo.js';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import useProduct from '../../hooks/useProduct.js';
import { productAlertsApi } from '../../services/dajaPlatform.js';
import './WishlistSection.css';
import ConfirmModal from '../modals/ConfirmModal.jsx';

function WishlistAlertButton({ item }) {
  const { product, loading } = useProduct(item.slug);
  const { user } = useAuth();
  const { flash } = useFlash();
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  if (loading || !product?.id || !product.variantId) return null;

  const inStock = product.availability?.inStock ?? product.inStock;
  const type = inStock ? 'price_change' : 'back_in_stock';
  const label = inStock
    ? 'Obavesti me kada se cena promeni'
    : 'Obavesti me kada bude na stanju';

  const subscribe = async () => {
    if (subscribing || subscribed) return;
    if (!user?.email) {
      flash('Dodaj email adresu', 'Potrebna je email adresa za obaveštenja.', 'info');
      return;
    }

    setSubscribing(true);
    try {
      await productAlertsApi.subscribe(product.id, {
        type,
        variantId: product.variantId,
      });
      setSubscribed(true);
      flash(
        'Obaveštenje je uključeno',
        inStock
          ? 'Javićemo vam emailom kada se cena promeni.'
          : 'Javićemo vam emailom kada proizvod ponovo bude na stanju.',
        'success',
      );
    } catch (error) {
      flash('Nismo uspeli', error.message || 'Pokušajte ponovo za trenutak.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={subscribing || subscribed}
      className={`wishlist-alert-btn${subscribed ? ' is-subscribed' : ''}`}
    >
      {subscribed ? <BellRing size={15} /> : <Bell size={15} />}
      {subscribed ? 'Obaveštenje uključeno' : label}
    </button>
  );
}

function WishlistSection() {
  const { wishlist, removeFromWishlist, addToWishlist } = useWishlist();
  const { dispatch } = useCart();
  const { flash } = useFlash();
  const { showUndo } = useUndo();
  const placeholderImage = '/images/product-placeholder.svg';

  const [deleteId, setDeleteId] = useState(null);

  const moveToCart = (item) => {
    dispatch({
      type: 'ADD',
      item: item,
    });
    flash('Prebačeno', 'Proizvod je sada u korpi.', 'cart');
    removeFromWishlist(item.id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      const itemToRemove = wishlist.find((i) => i.id === deleteId);
      removeFromWishlist(deleteId);

      if (itemToRemove) {
        showUndo(itemToRemove, () => {
          addToWishlist(itemToRemove);
        });
      }
      setDeleteId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="section-content"
    >
      <div className="section-header-row mb-6">
        <h3>
          Lista želja{' '}
          <span className="text-muted text-lg font-normal">
            ({wishlist.length})
          </span>
        </h3>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-state card glass flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 text-muted">
            <Heart size={32} />
          </div>
          <h4 className="text-xl font-bold mb-2">Vaša lista je prazna</h4>
          <p className="text-muted mb-6 max-w-md">
            Sačuvajte svoje omiljene modele ovde da biste ih kasnije lakše
            pronašli.
          </p>
          <Link
            to="/catalog"
            className="px-6 py-3 bg-neutral-300 text-neutral-900 rounded-xl font-bold hover:bg-neutral-400 transition-colors"
          >
            Istraži ponudu
          </Link>
        </div>
      ) : (
        // KORISTIMO GRID UMESTO LISTE
        <div className="wishlist-grid">
          {wishlist.map((item) => (
            <div key={item.id} className="wishlist-card group">
              {/* Dugme za brisanje (lebdi gore desno) */}
              <button
                onClick={() => setDeleteId(item.id)}
                className="wishlist-remove-btn"
                title="Ukloni iz liste"
              >
                <Trash2 size={16} />
              </button>

              {/* Slika */}
              <Link
                to={`/product/${item.slug}`}
                className="wishlist-img-wrapper"
              >
                <img
                  src={
                    item.image ||
                    item.images?.[0]?.url ||
                    item.imageUrl ||
                    placeholderImage
                  }
                  alt={item.name}
                  className="wishlist-img"
                />
                {/* Overlay na hover */}
                <div className="wishlist-overlay">
                  <span className="text-xs font-bold uppercase tracking-wider text-white border border-white/30 px-3 py-1 rounded-full backdrop-blur-md">
                    Detalji
                  </span>
                </div>
              </Link>

              {/* Podaci */}
              <div className="wishlist-body">
                <div className="mb-2">
                  {item.brand && (
                    <Link
                      to={`/catalog?brand=${encodeURIComponent(item.brand)}`}
                      className="inline-block text-[10px] font-bold uppercase tracking-widest text-muted mb-1 hover:text-primary transition-colors"
                    >
                      {item.brand}
                    </Link>
                  )}
                  <Link
                    to={`/product/${item.slug}`}
                    className="block font-bold text-base leading-snug hover:text-primary transition-colors line-clamp-2 min-h-[2.5em]"
                  >
                    {item.name}
                  </Link>
                </div>

                <div className="mt-auto">
                  <div className="font-mono font-bold text-lg mb-3">
                    {money(item.price)}
                  </div>

                  <WishlistAlertButton item={item} />

                  <button
                    onClick={() => moveToCart(item)}
                    className="w-full py-2.5 rounded-lg bg-neutral-300 text-neutral-900 font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-400 transition-all hover:shadow-lg active:scale-95"
                  >
                    <ShoppingCart size={16} /> Dodaj u korpu
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Ukloni proizvod"
        description="Da li želite da uklonite ovaj proizvod iz liste želja?"
        confirmText="Ukloni"
        isDanger={true}
      />
    </motion.div>
  );
}

export default WishlistSection;
