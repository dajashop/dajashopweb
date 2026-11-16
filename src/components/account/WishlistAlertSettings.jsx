import { useEffect, useRef, useState } from 'react';
import { BellOff, BellRing, Mail, MessageCircle, X } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { apiRequest } from '../../services/apiClient.js';
import { privacyApi, productAlertsApi } from '../../services/dajaPlatform.js';
import WhatsAppPriceAlertForm from '../modals/WhatsAppPriceAlertForm.jsx';
import ConfirmModal from '../modals/ConfirmModal.jsx';

export default function WishlistAlertSettings({ onBeforeSubscribe }) {
  const { t, language } = useStorefront();
  const { user, showAuth } = useAuth();
  const { policy } = useConsent();
  const [tracking, setTracking] = useState(null);
  const [hintReady, setHintReady] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const settingsRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [statusRetry, setStatusRetry] = useState(0);
  const triggerRef = useRef(null);
  const account = user?.id;
  const [channel, setChannel] = useState('email');
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);
  const [couponAvailable, setCouponAvailable] = useState(false);
  const [couponConsent, setCouponConsent] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/whatsapp/capabilities', { auth: false, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setWhatsappAvailable(result?.available === true &&
        (result?.priceAlertLanguages ?? ['sr']).includes('sr')); })
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
        if (signal.aborted) return;
        if (!Array.isArray(result?.channels)) throw new Error('Wishlist tracking status is missing');
        setTracking(result.channels);
        setCouponAvailable(result.couponAvailable === true);
        setCouponConsent(result.couponConsent === true);
        setStatusError(null);
      }).catch(err => {
        if (!signal.aborted) setStatusError(err.status === 401 ? 'session' : 'unavailable');
      });
    };
    refresh();
    window.addEventListener('daja:product-alerts-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller?.abort();
      window.removeEventListener('daja:product-alerts-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [account, statusRetry]);

  useEffect(() => {
    if (!account) return undefined;
    setTracking(null);
    setCouponAvailable(false);
    setCouponConsent(false);
    setStatusError(null);
    setMenuOpen(false);
    setHintReady(false);
    setHintDismissed(false);
    const timer = window.setTimeout(() => setHintReady(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [account]);

  useEffect(() => {
    if (!menuOpen && !confirm) return undefined;
    const closeOutside = (event) => {
      if (!confirm && !settingsRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (confirm) setConfirm(false);
      else {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen, confirm]);

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
        setStatusError(null);
        setTracking(current => [...new Set([...(current || []), channel])]);
        setNotice(alreadyEnabled ? t('Praćenje uključeno') : t('Automatsko praćenje je uključeno. Pratimo {active} satova, nedostupnih: {skipped}.', { active, skipped }));
      } else {
        await privacyApi.unsubscribeProductAlerts('both', { kind: 'all' });
        setStatusError(null);
        setTracking([]);
        setNotice(t('Isključena su sva obaveštenja o satovima.'));
      }
    } catch (requestError) {
      if (requestError.status === 401) setStatusError('session');
      else setError(requestError.message || 'Pokušajte ponovo.');
    } finally {
      setBusy(false);
    }
  }

  async function changeCouponConsent(accepted) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/product-alerts/wishlist/coupons', { method: 'PATCH', body: { accepted } });
      setCouponConsent(result.couponConsent === true);
    } catch (requestError) {
      setError(requestError.message || t('Pokušajte ponovo.'));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const alreadyTracking = tracking?.includes(channel);
  const showWhatsAppForm = channel === 'whatsapp' && whatsappAvailable && !alreadyTracking;
  const showHint = hintReady && !hintDismissed && !menuOpen && !confirm && tracking?.length === 0;
  return <div ref={settingsRef} className="wishlist-alert-settings">
    <button ref={triggerRef} type="button" className={`wishlist-alert-settings__trigger${tracking?.length > 0 ? ' is-tracking' : ''}`} aria-expanded={menuOpen}
      onClick={() => setMenuOpen(open => !open)}>
        <BellRing className={showHint ? 'wishlist-alert-settings__bell--nudge' : undefined} size={16} aria-hidden="true" />
        {t('Prati listu')}
        {tracking?.length > 0 && <span className="wishlist-alert-settings__dot" title={t('Praćenje uključeno')} aria-label={t('Praćenje uključeno')} />}
    </button>
    {menuOpen && <section className="wishlist-alert-settings__card" aria-label={t('Praćenje cena za celu listu želja')}>
        <div className="wishlist-alert-settings__heading">
          <h4>{t('Praćenje cena za celu listu želja')}</h4>
          <button type="button" aria-label={t('Zatvori')} onClick={() => {
            setMenuOpen(false);
            triggerRef.current?.focus();
          }}><X size={16} aria-hidden="true" /></button>
        </div>
        <p>{t('Novi satovi se prate automatski. Kad uklonite sat sa liste, njegovo automatsko praćenje prestaje.')}</p>
        {channel === 'whatsapp' && <p>{t('Pošaljite STOP CENE da isključite sva WhatsApp praćenja cena ili MOJI SATOVI za pojedinačne šifre.')}</p>}
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
        {showWhatsAppForm ? (
          <WhatsAppPriceAlertForm key={account} onBeforeSubscribe={onBeforeSubscribe}
            onWishlistSubscribed={() => {
              setStatusError(null);
              setNotice(t('Praćenje uključeno'));
              setTracking(current => [...new Set([...(current || []), 'whatsapp'])]);
            }} />
        ) : (
          <button className="wishlist-alert-settings__primary" type="button" disabled={busy || channel !== 'email' || !user.emailVerified || alreadyTracking} onClick={() => void change(true)}>
          {t(busy ? 'Čuvamo…' : alreadyTracking ? 'Praćenje uključeno' : 'Prati sve satove sa liste')}
          </button>
        )}
        {channel === 'email' && !user.emailVerified &&
          <p>{t('Potvrdite email adresu naloga pre uključivanja email obaveštenja.')}</p>}
        {channel === 'whatsapp' && alreadyTracking && (couponConsent || (couponAvailable && language === 'sr')) &&
          <label>
            <input type="checkbox" checked={couponConsent} disabled={busy}
              onChange={event => void changeCouponConsent(event.target.checked)} />
            {t('Želim da mi DajaShop preko WhatsApp-a šalje lične kupone za satove sa liste želja kada im poraste redovna cena.')}
          </label>}
        <button type="button" className="wishlist-alert-settings__stop" disabled={busy} onClick={() => setConfirm(true)}>
          <BellOff size={15} aria-hidden="true" />{t('Odjavi sva obaveštenja o satovima')}
        </button>
        {statusError && <p role="alert">
          {t(statusError === 'session' ? 'Za praćenje liste prijavite se ponovo.' : 'Status praćenja trenutno nije dostupan.')}{' '}
          <button type="button" className="wishlist-alert-settings__stop" onClick={() => {
            if (statusError === 'session') {
              setMenuOpen(false);
              showAuth('login');
            } else {
              setStatusRetry(value => value + 1);
            }
          }}>{t(statusError === 'session' ? 'Prijavite se ponovo' : 'Proveri ponovo')}</button>
        </p>}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{t(error)}</p>}
    </section>}
    {showHint && <aside className="wishlist-alert-settings__hint" onKeyDown={event => {
      if (event.key === 'Escape') {
        setHintDismissed(true);
        triggerRef.current?.focus();
      }
    }}>
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
