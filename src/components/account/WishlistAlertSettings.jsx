import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { apiRequest } from '../../services/apiClient.js';
import { privacyApi, productAlertsApi } from '../../services/dajaPlatform.js';
import ConfirmModal from '../modals/ConfirmModal.jsx';

export default function WishlistAlertSettings({ hasItems, onBeforeSubscribe }) {
  const { t, language } = useStorefront();
  const { user } = useAuth();
  const { policy } = useConsent();
  const [channel, setChannel] = useState('email');
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/whatsapp/capabilities', { auth: false, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setWhatsappAvailable(result?.available === true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function change(enable) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    setConfirm(false);
    try {
      if (enable) {
        await onBeforeSubscribe();
        const { active, skipped } = await productAlertsApi.subscribeWishlist({
          channel, language, accepted: true, ...(policy?.version ? { policyVersion: policy.version } : {}),
        });
        setNotice(t('Praćenje cena uključeno za {active} satova. Nedostupnih: {skipped}.', { active, skipped }));
      } else {
        await privacyApi.unsubscribeProductAlerts('both', { kind: 'all' });
        setNotice(t('Isključena su sva obaveštenja o satovima.'));
      }
    } catch (requestError) {
      setError(requestError.message || 'Pokušajte ponovo.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  const canSubscribe = hasItems && (channel === 'email' ? user.emailVerified : whatsappAvailable && user.phoneVerified);
  return <section className="wishlist-alert-settings">
    {hasItems && <>
      <h4>{t('Praćenje cena za celu listu želja')}</h4>
      <p>{t('Uključite obaveštenja za satove koji su trenutno na listi. Svaki sat možete odjaviti zasebno.')}</p>
      <div className="wishlist-alert-settings__actions">
        <select value={channel} disabled={busy} onChange={event => setChannel(event.target.value)} aria-label={t('Način obaveštavanja')}>
          <option value="email">{t('Email')}</option>
          <option value="whatsapp" disabled={!whatsappAvailable}>WhatsApp</option>
        </select>
        <button className="wishlist-alert-btn" type="button" disabled={busy || !canSubscribe} onClick={() => void change(true)}>
          <Bell size={16} aria-hidden="true" />{t('Prati sve satove sa liste')}
        </button>
      </div>
      {!canSubscribe && <p>{t(channel === 'email'
        ? 'Potvrdite email adresu naloga pre uključivanja email obaveštenja.'
        : 'Potvrdite broj telefona u profilu pre uključivanja WhatsApp obaveštenja.')}</p>}
    </>}
    <button type="button" className="wishlist-alert-btn" disabled={busy} onClick={() => setConfirm(true)}>
      <BellOff size={16} aria-hidden="true" />{t('Odjavi sva obaveštenja o satovima')}
    </button>
    <ConfirmModal isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={() => void change(false)}
      title={t('Odjavi sva obaveštenja o satovima')}
      description={t('Isključićete sva email i WhatsApp obaveštenja o satovima. Prijava na novosti ostaje aktivna ako je uključena.')}
      confirmText={t('Potvrdi odjavu')} isDanger />
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{t(error)}</p>}
  </section>;
}
