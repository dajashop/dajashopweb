import { useState } from 'react';
import './WatchAlertControls.css';
import { createPortal } from 'react-dom';
import ConfirmModal from '../modals/ConfirmModal.jsx';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { privacyApi, productAlertsApi, productAlertSubscriptions } from '../../services/dajaPlatform.js';

export default function WatchAlertControls({ product, onSubscribe, status }) {
  const { t } = useStorefront();
  const { user } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [channel, setChannel] = useState('both');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const productId = product?.id;
  const variantId = product?.variantId;

  async function unsubscribe() {
    if (pending) return;
    setPending(true);
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
      setPending(false);
    }
  }

  if (!variantId) return null;
  const hasEmail = status.email.length > 0;
  const hasWhatsApp = status.whatsapp.length > 0;
  const subscribed = hasEmail || hasWhatsApp;
  if (!subscribed && !onSubscribe) return null;

  return <div className="watch-alert-controls">
    {subscribed ? (
      <div className="watch-alert-controls__active">
        <BellRing className="watch-alert-controls__bell" size={16} aria-hidden="true" />
        <div className="watch-alert-controls__details">
          <strong>{t('Praćenje uključeno')}</strong>
          <span>{hasEmail && hasWhatsApp ? 'Email · WhatsApp' : hasWhatsApp ? 'WhatsApp' : 'Email'}</span>
          {hasWhatsApp && status.whatsappWatchCode && (
            <span>{t('Šifra za odjavu')} <b>{status.whatsappWatchCode}</b></span>
          )}
        </div>
        <button type="button" className="watch-alert-controls__stop" disabled={pending} aria-busy={pending}
          title={t('Odjavi ovaj sat')} aria-label={t(pending ? 'Odjavljujemo…' : 'Odjavi ovaj sat')}
          onClick={() => { setChannel(hasWhatsApp && !hasEmail && user ? 'whatsapp' : 'both'); setConfirm(true); }}>
          <BellOff size={17} aria-hidden="true" />
        </button>
        {user && hasEmail && hasWhatsApp && (
          <button type="button" className="watch-alert-controls__stop-whatsapp" disabled={pending}
            onClick={() => { setChannel('whatsapp'); setConfirm(true); }}>
            {t('Odjavi samo WhatsApp')}
          </button>
        )}
      </div>
    ) : (
      <button type="button" className="wishlist-alert-btn" onClick={onSubscribe}>
        <Bell size={15} aria-hidden="true" />{t('Obavesti me')}
      </button>
    )}
    {confirm && createPortal(
      <ConfirmModal isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={() => void unsubscribe()}
        title={t('Odjavi ovaj sat')}
        description={t(channel === 'whatsapp' ? 'Isključi WhatsApp obaveštenja za {watch}.' : 'Isključi email i WhatsApp obaveštenja za {watch}.', { watch: product.name })}
        confirmText={t('Potvrdi odjavu')} isDanger />,
      document.body
    )}
    {error && <p role="alert">{t(error)}</p>}
  </div>;
}
