import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Heart, Tag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import {
  productAlertsApi,
  productAlertSubscriptions,
} from '../../services/dajaPlatform.js';
import ProductAlertModal from '../modals/ProductAlertModal.jsx';
import './ProductActions.css';

export default function ProductActions({ product, onAdd, onWishlist, isLiked }) {
  const { user } = useAuth();
  const { flash } = useFlash();
  const [guestAlertType, setGuestAlertType] = useState(null);
  const [subscribedTypes, setSubscribedTypes] = useState([]);
  const inStock = product.availability?.inStock ?? product.inStock;

  useEffect(() => {
    setGuestAlertType(null);
    const storedTypes = productAlertSubscriptions.typesFor(
      product.id,
      product.variantId,
    );
    setSubscribedTypes(storedTypes);

    if (!user?.email) return undefined;
    let cancelled = false;
    productAlertsApi
      .status(product.id, {
        variantId: product.variantId,
        email: user.email,
      })
      .then((response) => {
        if (cancelled) return;
        const activeTypes = Array.isArray(response?.types) ? response.types : [];
        activeTypes.forEach((type) =>
          productAlertSubscriptions.markSubscribed(
            product.id,
            product.variantId,
            type,
          ),
        );
        setSubscribedTypes(activeTypes);
      })
      .catch(() => {
        // The locally saved state remains available if the status lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, product.variantId, user?.email]);

  const requestAlert = (type) => {
    if (subscribedTypes.includes(type)) return;
    setGuestAlertType(type);
  };

  const handleGuestSubscription = ({ type, newsletterWarning }) => {
    productAlertSubscriptions.markSubscribed(product.id, product.variantId, type);
    setSubscribedTypes((current) =>
      current.includes(type) ? current : [...current, type],
    );
    setGuestAlertType(null);
    flash(
      'Obaveštenje je uključeno',
      newsletterWarning
        ? 'Obaveštenje je sačuvano, ali prijava na novosti nije uspela.'
        : 'Javićemo vam emailom čim se promeni stanje ili cena artikla.',
      newsletterWarning ? 'info' : 'success',
    );
  };

  return (
    <div className="product-actions">
      <div className="actions-container">
        {inStock ? (
          <button className="cta-button" onClick={onAdd}>
            Dodaj u korpu
          </button>
        ) : (
          <button
            type="button"
            className={`stock-alert-button${subscribedTypes.includes('back_in_stock') ? ' is-subscribed' : ''}`}
            onClick={() => requestAlert('back_in_stock')}
            disabled={subscribedTypes.includes('back_in_stock')}
          >
            {subscribedTypes.includes('back_in_stock') ? (
              <BellRing size={19} />
            ) : (
              <Bell size={19} />
            )}
            {subscribedTypes.includes('back_in_stock')
              ? 'Obaveštenje je uključeno'
              : 'Obavesti me kada bude na stanju'}
          </button>
        )}

        <button
          className="wishlist-button"
          onClick={onWishlist}
          title={isLiked ? 'Ukloni iz želja' : 'Dodaj u želje'}
        >
          <Heart
            size={24}
            className={isLiked ? 'heart-icon active' : 'heart-icon'}
          />
        </button>
      </div>

      {inStock && (
        <button
          type="button"
          className={`price-alert-button${subscribedTypes.includes('price_change') ? ' is-subscribed' : ''}`}
          onClick={() => requestAlert('price_change')}
          disabled={subscribedTypes.includes('price_change')}
        >
          {subscribedTypes.includes('price_change') ? <BellRing size={16} /> : <Tag size={16} />}
          {subscribedTypes.includes('price_change')
            ? 'Pratite promenu cene'
            : 'Obavesti me kada se cena promeni'}
        </button>
      )}

      <ProductAlertModal
        isOpen={Boolean(guestAlertType)}
        onClose={() => setGuestAlertType(null)}
        product={product}
        type={guestAlertType}
        initialEmail={user?.email ?? ''}
        onSubscribed={handleGuestSubscription}
      />
    </div>
  );
}
