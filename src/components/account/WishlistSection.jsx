import ProgressiveImage from '../ui/ProgressiveImage.jsx';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';

import { useWishlist } from '../../context/WishlistProvider.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useFlash } from '../../hooks/useFlash.js';
import { useUndo } from '../../hooks/useUndo.js';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import useProduct from '../../hooks/useProduct.js';
import { privacyApi } from '../../services/dajaPlatform.js';
import './WishlistSection.css';
import ConfirmModal from '../modals/ConfirmModal.jsx';
import ProductAlertModal from '../modals/ProductAlertModal.jsx';
import WatchAlertControls from '../product/WatchAlertControls.jsx';
import WishlistAlertSettings from './WishlistAlertSettings.jsx';

function WishlistAlertButton({ item, alerts }) {
  const { product: catalogProduct } = useProduct(item.slug);
  const { user } = useAuth();
  const { flash } = useFlash();
  const [open, setOpen] = useState(false);
  const variant = item.variantId && catalogProduct?.variants?.find(entry => entry.id === item.variantId);
  const product = variant && catalogProduct.variantId !== variant.id
    ? { ...catalogProduct, variantId: variant.id, name: variant.name ? `${catalogProduct.name} — ${variant.name}` : catalogProduct.name,
        price: variant.current_price_amount != null ? Number(variant.current_price_amount) / 100 : item.price, salePrice: undefined }
    : catalogProduct;
  if (!product?.variantId || (item.variantId && product.variantId !== item.variantId)) return null;

  const status = { email: [], whatsapp: [] };
  for (const alert of alerts) {
    if (alert.productId === product.id && alert.variantId === product.variantId) {
      status[alert.channel === 'whatsapp' ? 'whatsapp' : 'email'].push(alert.type);
    }
  }
  return <>
    <WatchAlertControls product={product} status={status} onSubscribe={() => setOpen(true)} />
    <ProductAlertModal
      isOpen={open} onClose={() => setOpen(false)} product={product} type="price_change"
      initialEmail={user?.email ?? ''} initialPhone={user?.phoneNumber ?? ''} authenticated={Boolean(user)}
      onSubscribed={result => {
        if (result.requiresConfirmation) flash('Potvrdite email adresu', 'Proverite email i potvrdite prijavu preko dugmeta u poruci. Obaveštenje će se tada uključiti.', 'info');
        window.dispatchEvent(new Event('daja:product-alerts-changed'));
      }}
    />
  </>;
}

function WishlistSection() {
  const { t: translateText, money } = useStorefront();

  const { wishlist, removeFromWishlist, addToWishlist, flushWishlist } = useWishlist();
  const { user } = useAuth();
  const accountId = user?.id;
  const [alerts, setAlerts] = useState(null);
  const { dispatch } = useCart();
  const { flash } = useFlash();
  const { showUndo } = useUndo();
  const placeholderImage = '/images/product-placeholder.svg';

  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (!accountId) return undefined;
    let controller;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      privacyApi.mine({ signal }).then(snapshot => {
        if (!signal.aborted) setAlerts({ accountId, items: snapshot?.alerts || [] });
      }).catch(() => {});
    };
    refresh();
    window.addEventListener('daja:product-alerts-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller?.abort();
      window.removeEventListener('daja:product-alerts-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [accountId]);

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
      className="section-content wishlist-section"
    >
      <div className="section-header-row wishlist-header">
        <h3>{translateText("Lista želja")}{' '}
          <span className="wishlist-count">{wishlist.length}</span>
        </h3>
      </div>

      <WishlistAlertSettings hasItems={wishlist.length > 0} onBeforeSubscribe={flushWishlist} />

      {wishlist.length === 0 ? (
        <div className="empty-state card glass flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 text-muted">
            <Heart size={32} />
          </div>
          <h4 className="text-xl font-bold mb-2">{translateText("Vaša lista je prazna")}</h4>
          <p className="text-muted mb-6 max-w-md">{translateText("Sačuvajte svoje omiljene modele ovde da biste ih kasnije lakše pronašli.")}</p>
          <Link
            to="/catalog"
            className="px-6 py-3 bg-neutral-300 text-neutral-900 rounded-xl font-bold hover:bg-neutral-400 transition-colors"
          >{translateText("Istraži ponudu")}</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map((item) => (
            <article key={item.id} className="wishlist-card">
              <button
                type="button"
                onClick={() => setDeleteId(item.id)}
                className="wishlist-remove-btn"
                title={translateText("Ukloni iz liste")}
                aria-label={translateText('Ukloni iz liste') + ': ' + item.name}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>

              <Link
                to={`/product/${item.slug}`}
                className="wishlist-img-wrapper"
              >
                <ProgressiveImage
                  src={
                    item.image ||
                    item.images?.[0]?.url ||
                    item.imageUrl ||
                    placeholderImage
                  }
                  alt={translateText(item.name)}
                  className="wishlist-img"
                  thumbSrc={placeholderImage}
                />
              </Link>

              <div className="wishlist-body">
                <div className="wishlist-info">
                  {item.brand && (
                    <Link
                      to={`/catalog?brand=${encodeURIComponent(item.brand)}`}
                      className="wishlist-brand"
                    >
                      {translateText(item.brand)}
                    </Link>
                  )}
                  <Link
                    to={`/product/${item.slug}`}
                    className="wishlist-name"
                  >
                    {translateText(item.name)}
                  </Link>
                </div>

                <div className="wishlist-price">{money(item.price)}</div>

                <div className="wishlist-actions">
                  <WishlistAlertButton item={item} alerts={alerts?.accountId === accountId ? alerts?.items || [] : []} />

                  <button
                    type="button"
                    onClick={() => moveToCart(item)}
                    className="wishlist-cart-btn"
                  >
                    <ShoppingCart size={16} aria-hidden="true" />
                    {translateText("Dodaj u korpu")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title={translateText("Ukloni proizvod")}
        description={translateText("Da li želite da uklonite ovaj proizvod iz liste želja?")}
        confirmText="Ukloni"
        isDanger={true}
      />
    </motion.div>
  );
}

export default WishlistSection;
