import { useEffect, useState } from 'react';
import { BellOff, BellRing, Mail, MessageCircle } from 'lucide-react';
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
  return <section className="wishlist-alert-settings" aria-label={t('Praćenje cena za celu listu želja')}>
    {hasItems && <div className="wishlist-alert-settings__card">
      <div className="wishlist-alert-settings__intro">
        <span className="wishlist-alert-settings__icon"><BellRing size={24} aria-hidden="true" /></span>
        <div>
          <h4>{t('Saznajte kad se cena promeni')}</h4>
          <p>{t('Pratite sve satove koji su sada na listi želja. Javićemo vam kad se cena nekog od njih promeni.')}</p>
        </div>
      </div>
      <div className="wishlist-alert-settings__form">
        <fieldset className="wishlist-alert-settings__channels" disabled={busy}>
          <legend>{t('Gde da vam javimo?')}</legend>
          <div>
            <label>
              <input type="radio" name="wishlist-alert-channel" checked={channel === 'email'} onChange={() => setChannel('email')} />
              <Mail size={16} aria-hidden="true" /> {t('Email')}
            </label>
            <label>
              <input type="radio" name="wishlist-alert-channel" checked={channel === 'whatsapp'} disabled={!whatsappAvailable} onChange={() => setChannel('whatsapp')} />
              <MessageCircle size={16} aria-hidden="true" /> WhatsApp
            </label>
          </div>
        </fieldset>
        <button className="wishlist-alert-settings__primary" type="button" disabled={busy || !canSubscribe} onClick={() => void change(true)}>
          {t(busy ? 'Čuvamo…' : 'Prati sve satove sa liste')}
        </button>
        {!canSubscribe && <p>{t(channel === 'email'
          ? 'Potvrdite email adresu naloga pre uključivanja email obaveštenja.'
          : 'Potvrdite broj telefona u profilu pre uključivanja WhatsApp obaveštenja.')}</p>}
      </div>
    </div>}
    <button type="button" className="wishlist-alert-settings__stop" disabled={busy} onClick={() => setConfirm(true)}>
      <BellOff size={15} aria-hidden="true" />{t('Odjavi sva obaveštenja o satovima')}
    </button>
    <ConfirmModal isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={() => void change(false)}
      title={t('Odjavi sva obaveštenja o satovima')}
      description={t('Isključićete sva email i WhatsApp obaveštenja o satovima. Prijava na novosti ostaje aktivna ako je uključena.')}
      confirmText={t('Potvrdi odjavu')} isDanger />
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{t(error)}</p>}
  </section>;
}
