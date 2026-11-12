import ProgressiveImage from '../ui/ProgressiveImage.jsx';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, BellRing, Heart, Trash2, ShoppingCart } from 'lucide-react';

import { useWishlist } from '../../context/WishlistProvider.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useFlash } from '../../hooks/useFlash.js';
import { useUndo } from '../../hooks/useUndo.js';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import useProduct from '../../hooks/useProduct.js';
import {
  productAlertsApi,
  productAlertSubscriptions,
} from '../../services/dajaPlatform.js';
import './WishlistSection.css';
import ConfirmModal from '../modals/ConfirmModal.jsx';
import ProductAlertModal from '../modals/ProductAlertModal.jsx';

function WishlistAlertButton({ item }) {
  const { t: translateText } = useStorefront();

  const { product, loading } = useProduct(item.slug);
  const { user } = useAuth();
  const { flash } = useFlash();
  const [subscribedTypes, setSubscribedTypes] = useState([]);
  const [showGuestAlertModal, setShowGuestAlertModal] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);

  const inStock = product?.availability?.inStock ?? product?.inStock;
  const type = inStock ? 'price_change' : 'back_in_stock';

  useEffect(() => {
    const authenticated = Boolean(user?.email || user?.phoneNumber);
    const storedTypes = authenticated
      ? []
      : productAlertSubscriptions.typesFor(product?.id, product?.variantId);
    setSubscribedTypes(storedTypes);

    const contact = productAlertSubscriptions.contact();
    if ((!authenticated && !contact.managementToken) || !product?.id || !product?.variantId) return undefined;
    let cancelled = false;
    productAlertsApi
      .status(product.id, {
        variantId: product.variantId,
        ...(!authenticated && contact.managementToken ? { managementToken: contact.managementToken } : {}),
      }, { auth: authenticated })
      .then((response) => {
        if (cancelled) return;
        const activeTypes = Array.isArray(response?.types) ? response.types : [];
        if (!authenticated) {
          productAlertSubscriptions.replaceTypes(product.id, product.variantId, activeTypes);
        }
        setSubscribedTypes(activeTypes);
      })
      .catch((error) => {
        if (!cancelled && !authenticated && [400, 422].includes(error?.status)) {
          productAlertSubscriptions.clearContact();
          setSubscribedTypes([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product?.id, product?.variantId, type, user?.email, user?.phoneNumber]);

  const alertReady = !loading && Boolean(product?.id && product.variantId);

  const activeType = subscribedTypes.includes(type)
    ? type
    : subscribedTypes[0] || type;
  const subscribed = subscribedTypes.includes(activeType);
  const label = activeType === 'price_change'
    ? 'Obavesti me kada se cena promeni'
    : 'Obavesti me kada bude na stanju';

  const requestAlert = () => {
    if (!subscribed) setShowGuestAlertModal(true);
  };

  const unsubscribeAlert = async () => {
    const contact = productAlertSubscriptions.contact();
    const authenticated = Boolean(user?.email || user?.phoneNumber);
    if (!authenticated && !contact.managementToken) {
      flash(
        'Email nije dostupan',
        'Prijavite se ponovo da biste isključili ovo obaveštenje.',
        'error',
      );
      return;
    }
    setUnsubscribing(true);
    try {
      await productAlertsApi.unsubscribe(
        product.id,
        {
          variantId: product.variantId,
          type: activeType,
          ...(!authenticated && contact.managementToken ? { managementToken: contact.managementToken } : {}),
        },
        { auth: authenticated },
      );
      if (!authenticated) {
        productAlertSubscriptions.markUnsubscribed(
          product.id,
          product.variantId,
          activeType,
        );
      }
      setSubscribedTypes((current) =>
        current.filter((currentType) => currentType !== activeType),
      );
      flash('Obaveštenje je isključeno', 'Više nećemo slati ovu obavest.', 'success');
    } catch (error) {
      flash(
        'Isključivanje nije uspelo',
        error?.message || 'Pokušajte ponovo.',
        'error',
      );
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleGuestSubscription = ({ deliveryChannel, newsletterWarning, contact, requiresConfirmation }) => {
    if (requiresConfirmation) {
      setShowGuestAlertModal(false);
      flash('Potvrdite email adresu', 'Proverite email i potvrdite prijavu preko dugmeta u poruci. Obaveštenje će se tada uključiti.', 'info');
      return;
    }
    if (!user?.email && !user?.phoneNumber) {
      productAlertSubscriptions.markSubscribed(
        product.id,
        product.variantId,
        type,
        contact,
      );
    }
    setSubscribedTypes((current) =>
      current.includes(type) ? current : [...current, type],
    );
    setShowGuestAlertModal(false);
    flash(
      'Obaveštenje je uključeno',
      newsletterWarning
        ? 'Obaveštenje je sačuvano, ali prijava na novosti nije uspela.'
        : deliveryChannel === 'sms'
          ? inStock
            ? 'Javićemo vam SMS-om kada se cena promeni.'
            : 'Javićemo vam SMS-om kada proizvod ponovo bude na stanju.'
          : inStock
            ? 'Javićemo vam emailom kada se cena promeni.'
            : 'Javićemo vam emailom kada proizvod ponovo bude na stanju.',
      newsletterWarning ? 'info' : 'success',
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={subscribed ? unsubscribeAlert : requestAlert}
        disabled={!alertReady || unsubscribing}
        aria-busy={loading || unsubscribing}
        className={`wishlist-alert-btn${subscribed ? ' is-subscribed' : ''}`}
        title={translateText(loading ? 'Učitavanje…' : !alertReady ? 'Trenutno nije dostupno' : subscribed ? 'Isključi obaveštenje' : label)}
      >
        {subscribed ? (
          <>
            <span className="wishlist-alert-btn__status">
              <BellRing size={15} />
              {translateText(activeType === 'price_change'
                ? 'Promena cene: uključeno'
                : 'Stanje: uključeno')}
            </span>
            <span className="wishlist-alert-btn__unsubscribe">
              <BellOff size={15} />
              {translateText(unsubscribing ? 'Isključujemo…' : 'Isključi obaveštenje')}
            </span>
          </>
        ) : (
          <>
            <Bell size={15} />
            {translateText('Obavesti me')}
          </>
        )}
      </button>
      <ProductAlertModal
        isOpen={showGuestAlertModal}
        onClose={() => setShowGuestAlertModal(false)}
        product={product}
        type={type}
        initialEmail={user?.email ?? ''}
        initialPhone={user?.phoneNumber ?? ''}
        authenticated={Boolean(user?.email || user?.phoneNumber)}
        onSubscribed={handleGuestSubscription}
      />
    </>
  );
}

function WishlistSection() {
  const { t: translateText, money } = useStorefront();

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
      className="section-content wishlist-section"
    >
      <div className="section-header-row wishlist-header">
        <h3>{translateText("Lista želja")}{' '}
          <span className="wishlist-count">{wishlist.length}</span>
        </h3>
      </div>

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
                  <WishlistAlertButton item={item} />

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
