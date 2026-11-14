import { useEffect, useRef, useState } from 'react';
import { BellOff, BellRing, Mail, MessageCircle, X } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { apiRequest } from '../../services/apiClient.js';
import { privacyApi, productAlertsApi } from '../../services/dajaPlatform.js';
import ConfirmModal from '../modals/ConfirmModal.jsx';

export default function WishlistAlertSettings({ onBeforeSubscribe }) {
  const { t, language } = useStorefront();
  const { user } = useAuth();
  const { policy } = useConsent();
  const [tracking, setTracking] = useState(null);
  const [hintReady, setHintReady] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const settingsRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const account = user?.id;
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

  useEffect(() => {
    if (!account) return undefined;
    let controller;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      productAlertsApi.wishlistStatus({ signal }).then(result => {
        if (!signal.aborted) setTracking(result?.channels || []);
      }).catch(() => {});
    };
    setTracking(null);
    refresh();
    window.addEventListener('daja:product-alerts-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller?.abort();
      window.removeEventListener('daja:product-alerts-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [account]);

  useEffect(() => {
    if (!account) return undefined;
    setHintReady(false);
    setHintDismissed(false);
    const timer = window.setTimeout(() => setHintReady(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [account]);

  useEffect(() => {
    const closeOutside = (event) => {
      const menu = menuRef.current;
      if (menu?.open && !confirm && !settingsRef.current?.contains(event.target)) menu.open = false;
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (confirm) {
        setConfirm(false);
        return;
      }
      const menu = menuRef.current;
      if (menu?.open) {
        menu.open = false;
        triggerRef.current?.focus();
      } else if (hintReady && tracking?.length === 0 && settingsRef.current?.contains(event.target)) {
        setHintDismissed(true);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [confirm, hintReady, tracking]);

  async function change(enable) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    setConfirm(false);
    try {
      if (enable) {
        await onBeforeSubscribe();
        const { active, skipped, alreadyEnabled } = await productAlertsApi.subscribeWishlist({
          channel, language, accepted: true, ...(policy?.version ? { policyVersion: policy.version } : {}),
        });
        setTracking(current => [...new Set([...(current || []), channel])]);
        setNotice(alreadyEnabled ? t('Praćenje uključeno') : t('Automatsko praćenje je uključeno. Pratimo {active} satova, nedostupnih: {skipped}.', { active, skipped }));
      } else {
        await privacyApi.unsubscribeProductAlerts('both', { kind: 'all' });
        setTracking([]);
        setNotice(t('Isključena su sva obaveštenja o satovima.'));
      }
    } catch (requestError) {
      setError(requestError.message || 'Pokušajte ponovo.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  const canSubscribe = channel === 'email' ? user.emailVerified : whatsappAvailable && user.phoneVerified;
  const alreadyTracking = tracking?.includes(channel);
  const showHint = hintReady && !hintDismissed && tracking?.length === 0;
  return <div ref={settingsRef} className="wishlist-alert-settings">
    <details ref={menuRef} className="wishlist-alert-settings__menu"
      onToggle={event => { if (event.currentTarget.open) setHintDismissed(true); }}>
      <summary ref={triggerRef}>
        <BellRing className={showHint ? 'wishlist-alert-settings__bell--nudge' : undefined} size={16} aria-hidden="true" />
        {t('Prati listu')}
        {tracking?.length > 0 && <span className="wishlist-alert-settings__dot" title={t('Praćenje uključeno')} aria-label={t('Praćenje uključeno')} />}
      </summary>
      <section className="wishlist-alert-settings__card" aria-label={t('Praćenje cena za celu listu želja')}>
        <h4>{t('Praćenje cena za celu listu želja')}</h4>
        <p>{t('Novi satovi se prate automatski. Kad uklonite sat sa liste, njegovo automatsko praćenje prestaje.')}</p>
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
        <button className="wishlist-alert-settings__primary" type="button" disabled={busy || !canSubscribe || alreadyTracking} onClick={() => void change(true)}>
          {t(busy ? 'Čuvamo…' : alreadyTracking ? 'Praćenje uključeno' : 'Prati sve satove sa liste')}
        </button>
        {!canSubscribe && <p>{t(channel === 'email'
          ? 'Potvrdite email adresu naloga pre uključivanja email obaveštenja.'
          : 'Potvrdite broj telefona u profilu pre uključivanja WhatsApp obaveštenja.')}</p>}
        <button type="button" className="wishlist-alert-settings__stop" disabled={busy} onClick={() => setConfirm(true)}>
          <BellOff size={15} aria-hidden="true" />{t('Odjavi sva obaveštenja o satovima')}
        </button>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{t(error)}</p>}
      </section>
    </details>
    {showHint && <aside className="wishlist-alert-settings__hint">
      <p role="status">{t('Pratite listu želja i javićemo vam kad se cena nekog sata promeni.')}</p>
      <button type="button" aria-label={t('Zatvori obaveštenje')} onClick={() => setHintDismissed(true)}>
        <X size={16} aria-hidden="true" />
      </button>
    </aside>}
    <ConfirmModal isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={() => void change(false)}
      title={t('Odjavi sva obaveštenja o satovima')}
      description={t('Isključićete sva email i WhatsApp obaveštenja o satovima. Prijava na novosti ostaje aktivna ako je uključena.')}
      confirmText={t('Potvrdi odjavu')} isDanger />
  </div>;
}
