import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import { productAlertSubscriptions } from '../../services/dajaPlatform.js';
import { storefrontFeatures } from '../../config/storefrontFeatures.js';
import ProductAlertModal from '../modals/ProductAlertModal.jsx';
import { useWatchAlertStatus } from '../../services/watchAlertStatus.js';
import './ProductActions.css';
import { isProcurementUnavailable } from '../../utils/productAvailability.js';

export default function ProductActions({ product, onAdd, onWishlist, isLiked, disabled = false }) {
  const { t: translateText } = useStorefront();

  const { user } = useAuth();
  const { flash } = useFlash();
  const [guestAlertType, setGuestAlertType] = useState(null);
  const alerts = useWatchAlertStatus(product.id, product.variantId);
  const subscribedTypes = [...alerts.email, ...alerts.whatsapp];
  const inStock = product.availability?.inStock ?? product.inStock;
  const procurementUnavailable = isProcurementUnavailable(product);
  const useStockAwareActions = storefrontFeatures.customerStockVisibility;
  const showPriceAlerts = storefrontFeatures.customerPriceAlerts;
  const outOfStockAlertType = 'back_in_stock';
  const outOfStockSubscribed = subscribedTypes.includes(outOfStockAlertType);

  useEffect(() => setGuestAlertType(null), [product.id, product.variantId]);

  const requestAlert = (type) => setGuestAlertType(type);

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
    window.dispatchEvent(new Event('daja:product-alerts-changed'));
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
        {procurementUnavailable ? (
          <button type="button" className="cta-button" disabled>{translateText('Nedostupno za poručivanje')}</button>
        ) : useStockAwareActions && !inStock ? (
          <button
            type="button"
            className={`stock-alert-button${outOfStockSubscribed ? ' is-subscribed' : ''}`}
            onClick={() => requestAlert(outOfStockAlertType)}
          >
            {outOfStockSubscribed ? (
              <BellRing size={19} />
            ) : (
              <Bell size={19} />
            )}
            {translateText(outOfStockSubscribed ? 'Obaveštenje je uključeno' : 'Obavesti me kada bude na stanju')}
          </button>
        ) : (
          <button className="cta-button" disabled={disabled} onClick={onAdd}>{translateText("Dodaj u korpu")}</button>
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
        {showPriceAlerts && !procurementUnavailable && (
        <button
          type="button"
          className={`price-alert-button${subscribedTypes.includes('price_change') ? ' is-subscribed' : ''}`}
          onClick={() => requestAlert('price_change')}
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
