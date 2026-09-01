import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Heart, Tag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import { productAlertsApi } from '../../services/dajaPlatform.js';
import ProductAlertModal from '../modals/ProductAlertModal.jsx';
import './ProductActions.css';

export default function ProductActions({ product, onAdd, onWishlist, isLiked }) {
  const { user } = useAuth();
  const { flash } = useFlash();
  const [guestAlertType, setGuestAlertType] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribedTypes, setSubscribedTypes] = useState([]);
  const inStock = product.availability?.inStock ?? product.inStock;

  useEffect(() => {
    setGuestAlertType(null);
    setSubscribing(false);
    setSubscribedTypes([]);
  }, [product.id]);

  const subscribe = async (type) => {
    if (!product.id || !product.variantId || !user?.email || subscribing) return;
    setSubscribing(true);
    try {
      await productAlertsApi.subscribe(product.id, {
        type,
        variantId: product.variantId,
        email: user.email,
      });
      setSubscribedTypes((current) =>
        current.includes(type) ? current : [...current, type]
      );
      flash(
        'Obaveštenje je uključeno',
        type === 'back_in_stock'
          ? 'Javićemo vam emailom čim proizvod ponovo bude na stanju.'
          : 'Javićemo vam emailom čim se cena proizvoda promeni.',
        'success'
      );
    } catch (error) {
      flash('Nismo uspeli', error.message || 'Pokušajte ponovo za trenutak.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const requestAlert = (type) => {
    if (subscribedTypes.includes(type)) return;
    if (user?.email) {
      subscribe(type);
      return;
    }
    setGuestAlertType(type);
  };

  const handleGuestSubscription = ({ type, newsletterWarning }) => {
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
            disabled={subscribing || subscribedTypes.includes('back_in_stock')}
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
          disabled={subscribing || subscribedTypes.includes('price_change')}
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
        onSubscribed={handleGuestSubscription}
      />
    </div>
  );
}
