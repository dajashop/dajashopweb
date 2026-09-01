import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Heart, Tag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import { productAlertsApi } from '../../services/dajaPlatform.js';
import './ProductActions.css';

const ALERT_COPY = {
  back_in_stock: 'Obavesti me kada bude na stanju',
  price_change: 'Prati promenu cene',
};

export default function ProductActions({ product, onAdd, onWishlist, isLiked }) {
  const { user } = useAuth();
  const { flash } = useFlash();
  const [alertType, setAlertType] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribedTypes, setSubscribedTypes] = useState([]);
  const inStock = product.availability?.inStock ?? product.inStock;

  useEffect(() => {
    setAlertType(null);
    setEmail('');
    setSubscribing(false);
    setSubscribedTypes([]);
  }, [product.id]);

  const subscribe = async (type, recipientEmail) => {
    if (!product.id || !product.variantId || !recipientEmail || subscribing) return;
    setSubscribing(true);
    try {
      await productAlertsApi.subscribe(product.id, {
        type,
        variantId: product.variantId,
        ...(user?.email ? {} : { email: recipientEmail }),
      });
      setSubscribedTypes((current) =>
        current.includes(type) ? current : [...current, type]
      );
      setAlertType(null);
      setEmail('');
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
      subscribe(type, user.email);
      return;
    }
    setAlertType(type);
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

      {alertType && !user?.email && (
        <form
          className="product-alert-form"
          onSubmit={(event) => {
            event.preventDefault();
            subscribe(alertType, email);
          }}
        >
          <label htmlFor="product-alert-email">
            Unesite email na koji želite obaveštenje
          </label>
          <div className="product-alert-form__controls">
            <input
              id="product-alert-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vas@email.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              autoFocus
            />
            <button type="submit" disabled={subscribing}>
              {subscribing ? 'Čuvamo...' : ALERT_COPY[alertType]}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
