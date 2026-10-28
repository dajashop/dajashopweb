import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import {
  productAlertsApi,
  productAlertSubscriptions,
} from '../../services/dajaPlatform.js';
import { storefrontFeatures } from '../../config/storefrontFeatures.js';
import ProductAlertModal from '../modals/ProductAlertModal.jsx';
import './ProductActions.css';

export default function ProductActions({ product, onAdd, onWishlist, isLiked }) {
  const { t: translateText } = useStorefront();

  const { user } = useAuth();
  const { flash } = useFlash();
  const [guestAlertType, setGuestAlertType] = useState(null);
  const [subscribedTypes, setSubscribedTypes] = useState([]);
  const inStock = product.availability?.inStock ?? product.inStock;
  const useStockAwareActions = storefrontFeatures.customerStockVisibility;
  const showPriceAlerts = storefrontFeatures.customerPriceAlerts;
  const outOfStockAlertType = subscribedTypes.includes('price_change')
    ? 'price_change'
    : 'back_in_stock';
  const outOfStockSubscribed = subscribedTypes.includes(outOfStockAlertType);

  useEffect(() => {
    setGuestAlertType(null);
    if (!useStockAwareActions && !showPriceAlerts) {
      setSubscribedTypes([]);
      return undefined;
    }
    const authenticated = Boolean(user?.email || user?.phoneNumber);
    const storedTypes = authenticated
      ? []
      : productAlertSubscriptions.typesFor(product.id, product.variantId);
    setSubscribedTypes(storedTypes);

    const contact = productAlertSubscriptions.contact();
    if (!authenticated && !contact.managementToken) return undefined;
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
  }, [product.id, product.variantId, showPriceAlerts, useStockAwareActions, user?.email, user?.phoneNumber]);

  const requestAlert = (type) => {
    if (subscribedTypes.includes(type)) return;
    setGuestAlertType(type);
  };

  const handleGuestSubscription = ({ type, deliveryChannel, newsletterWarning, contact, requiresConfirmation }) => {
    if (requiresConfirmation) {
      setGuestAlertType(null);
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
    setGuestAlertType(null);
    flash(
      'Obaveštenje je uključeno',
      newsletterWarning
        ? 'Obaveštenje je sačuvano, ali prijava na novosti nije uspela.'
        : deliveryChannel === 'sms'
          ? 'Javićemo vam SMS-om čim se promeni stanje ili cena artikla.'
          : 'Javićemo vam emailom čim se promeni stanje ili cena artikla.',
      newsletterWarning ? 'info' : 'success',
    );
  };

  return (
    <div className="product-actions">
      <div className="actions-container">
        {useStockAwareActions && !inStock ? (
          <button
            type="button"
            className={`stock-alert-button${outOfStockSubscribed ? ' is-subscribed' : ''}`}
            onClick={() => requestAlert(outOfStockAlertType)}
            disabled={outOfStockSubscribed}
          >
            {outOfStockSubscribed ? (
              <BellRing size={19} />
            ) : (
              <Bell size={19} />
            )}
            {translateText(outOfStockSubscribed
              ? outOfStockAlertType === 'price_change'
                ? 'Pratite promenu cene'
                : 'Obaveštenje je uključeno'
              : 'Obavesti me kada bude na stanju')}
          </button>
        ) : (
          <button className="cta-button" onClick={onAdd}>{translateText("Dodaj u korpu")}</button>
        )}

        <button
          className="wishlist-button"
          onClick={onWishlist}
          title={translateText(isLiked ? 'Ukloni iz želja' : 'Dodaj u želje')}
        >
          <Heart
            size={24}
            className={isLiked ? 'heart-icon active' : 'heart-icon'}
          />
        </button>
        {showPriceAlerts && (
        <button
          type="button"
          className={`price-alert-button${subscribedTypes.includes('price_change') ? ' is-subscribed' : ''}`}
          onClick={() => requestAlert('price_change')}
          disabled={subscribedTypes.includes('price_change')}
          title={translateText(subscribedTypes.includes('price_change') ? 'Pratite promenu cene' : 'Obavesti me kada se cena promeni')}
          aria-label={translateText(subscribedTypes.includes('price_change') ? 'Pratite promenu cene' : 'Obavesti me kada se cena promeni')}
        >
          {subscribedTypes.includes('price_change') ? <BellRing size={22} aria-hidden="true" /> : <Bell size={22} aria-hidden="true" />}
        </button>
        )}
      </div>

      <ProductAlertModal
        isOpen={Boolean(guestAlertType)}
        onClose={() => setGuestAlertType(null)}
        product={product}
        type={guestAlertType}
        initialEmail={user?.email ?? ''}
        initialPhone={user?.phoneNumber ?? ''}
        authenticated={Boolean(user?.email || user?.phoneNumber)}
        onSubscribed={handleGuestSubscription}
      />
    </div>
  );
}
