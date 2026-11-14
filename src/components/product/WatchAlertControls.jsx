import { useState } from 'react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { privacyApi, productAlertsApi, productAlertSubscriptions } from '../../services/dajaPlatform.js';

export default function WatchAlertControls({ product, onSubscribe, status }) {
  const { t } = useStorefront();
  const { user } = useAuth();
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const productId = product?.id;
  const variantId = product?.variantId;

  async function unsubscribe(channel) {
    if (pending) return;
    setPending(channel);
    setError('');
    try {
      if (user) {
        await privacyApi.unsubscribeProductAlerts(channel, { kind: 'watch', productId, variantId });
      } else {
        const { managementToken } = productAlertSubscriptions.contact();
        if (!managementToken) throw new Error('Prijavite se ili otvorite link za odjavu iz obaveštenja.');
        await productAlertsApi.unsubscribe(productId, { variantId, managementToken }, { auth: false });
        productAlertSubscriptions.replaceTypes(productId, variantId, []);
        window.dispatchEvent(new Event('daja:product-alerts-changed'));
      }
    } catch (requestError) {
      setError(requestError.message || 'Odjava od obaveštenja nije uspela.');
    } finally {
      setPending('');
    }
  }

  if (!variantId) return null;
  const channels = ['email', 'whatsapp'].filter(channel => status[channel].length > 0);
  if (channels.length === 2 && user) channels.push('both');
  const labels = {
    email: 'Odjavi email za ovaj sat',
    whatsapp: 'Odjavi WhatsApp za ovaj sat',
    both: 'Odjavi ovaj sat na oba kanala',
  };

  return <div className="watch-alert-controls">
    {onSubscribe && <button type="button" className="wishlist-alert-btn" onClick={onSubscribe}>{t('Obavesti me')}</button>}
    {channels.map(channel =>
      <button key={channel} type="button" className="wishlist-alert-btn is-subscribed" disabled={Boolean(pending)}
        onClick={() => void unsubscribe(channel)}>
        {t(pending === channel ? 'Odjavljujemo…' : labels[channel])}
      </button>
    )}
    {error && <p role="alert">{t(error)}</p>}
  </div>;
}
