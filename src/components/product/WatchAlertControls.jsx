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
  const subscribed = status.email.length > 0 || status.whatsapp.length > 0;
  if (!subscribed && !onSubscribe) return null;

  return <div className="watch-alert-controls">
    {subscribed ? (
      <button type="button" className="wishlist-alert-btn is-subscribed" disabled={pending} aria-busy={pending} aria-label={t('Odjavi ovaj sat')}
        onClick={() => { setChannel('both'); setConfirm(true); }}>
        <span className="watch-alert-controls__tracking"><BellRing size={15} aria-hidden="true" />{t('Praćenje uključeno')}</span>
        <span className="watch-alert-controls__unsubscribe"><BellOff size={15} aria-hidden="true" />{t(pending ? 'Odjavljujemo…' : 'Odjavi ovaj sat')}</span>
      </button>
    ) : (
      <button type="button" className="wishlist-alert-btn" onClick={onSubscribe}>
        <Bell size={15} aria-hidden="true" />{t('Obavesti me')}
      </button>
    )}
    {status.whatsappWatchCode && <p>{t('WhatsApp šifra za odjavu: {code}', { code: status.whatsappWatchCode })}</p>}
    {user && status.whatsapp.length > 0 && (
      <button type="button" className="wishlist-alert-btn" disabled={pending}
        onClick={() => { setChannel('whatsapp'); setConfirm(true); }}>
        {t('Odjavi samo WhatsApp za ovaj sat')}
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
