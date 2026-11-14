import { useId, useState } from 'react';
import { Bell, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { productAlertsApi } from '../../services/dajaPlatform.js';
import { apiRequest } from '../../services/apiClient.js';
import {
  confirmPhoneCode, phoneVerificationCapabilities, requestPhoneCode,
} from '../../services/phoneVerification.js';

export default function WhatsAppPriceAlertForm({ product, initialPhone = '', onSignIn, onBeforeSubscribe, onWishlistSubscribed }) {
  const { user, refreshUser } = useAuth();
  const { policy } = useConsent();
  const { t, language, localizePath } = useStorefront();
  const id = useId();
  const [phone, setPhone] = useState(user?.phoneNumber || initialPhone);
  const [code, setCode] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [verifiedNumber, setVerifiedNumber] = useState(null);
  const [wishlistResult, setWishlistResult] = useState(null);
  const followsWishlist = Boolean(onBeforeSubscribe);
  const [error, setError] = useState('');
  const number = phone.replace(/[\s()-]/g, '');
  const canSubmit = number.length > 0 && (!attempt || /^\d{6}$/.test(code));

  async function activate(confirmedNumber = verifiedNumber) {
    if (followsWishlist) {
      const accountNumber = user?.phoneVerified ? user.phoneNumber?.replace(/[\s()-]/g, '') : null;
      if (number !== confirmedNumber && number !== accountNumber) return false;
      await onBeforeSubscribe();
      const result = await productAlertsApi.subscribeWishlist({
        channel: 'whatsapp', phone: number, language, accepted: true,
        ...(policy?.version ? { policyVersion: policy.version } : {}),
      });
      setWishlistResult(result);
      setActive(true);
      onWishlistSubscribed?.(result);
      return true;
    }
    const result = await apiRequest('/whatsapp/subscriptions/verified-account', {
      method: 'POST',
      body: {
        phone: number, purpose: 'price_change', language,
        productId: product.id, variantId: product.variantId,
        acceptedMarketing: true,
        ...(policy?.version ? { policyVersion: policy.version } : {}),
      },
    });
    if (result?.active) {
      setActive(true);
      window.dispatchEvent(new Event('daja:product-alerts-changed'));
      return true;
    }
    if (result?.requiresPhoneVerification) return false;
    throw new Error('Ova WhatsApp prijava nije dostupna.');
  }

  async function sendCode() {
    const channels = await phoneVerificationCapabilities();
    const channel = channels.whatsapp ? 'whatsapp' : channels.sms ? 'sms' : null;
    if (!channel) throw new Error('Kod trenutno nije dostupan. Izaberite Email za obaveštenje.');
    await requestPhoneCode(number, 'link', channel);
    setCode('');
    setAttempt({ channel });
  }

  async function submit(event, resend = false) {
    event.preventDefault();
    if (busy || active || (!resend && !canSubmit)) return;
    if (!user) { onSignIn(); return; }
    setBusy(true);
    setError('');
    try {
      if (!/^\+381[1-9]\d{6,11}$/.test(number)) throw new Error('Unesite broj u formatu +381601234567.');
      if (resend) {
        await sendCode();
      } else if (attempt) {
        await confirmPhoneCode(number, code, 'link', attempt.channel);
        setAttempt(null);
        setCode('');
        setVerifiedNumber(number);
        try {
          if (!await activate(number)) throw new Error('Ova WhatsApp prijava nije dostupna.');
        } finally {
          void refreshUser().catch(() => {});
        }
      } else if (!await activate()) {
        await sendCode();
      }
    } catch (requestError) {
      setError(requestError.message || 'Prijava za obaveštenje nije uspela.');
    } finally {
      setBusy(false);
    }
  }

  if (active) return <p role="status">{wishlistResult
    ? t(wishlistResult.alreadyEnabled ? 'Praćenje uključeno' : 'Automatsko praćenje je uključeno. Pratimo {active} satova, nedostupnih: {skipped}.', wishlistResult)
    : t('Obaveštenje o promeni cene je uključeno.')}</p>;

  return (
    <form className="product-alert-modal__whatsapp-form" onSubmit={event => void submit(event)}>
      <p id={`${id}-instructions`} className="product-alert-modal__whatsapp-instructions" role="status">
        {attempt
          ? t(attempt.channel === 'sms' ? 'Kod je poslat SMS-om na {number}.' : 'Kod je poslat preko WhatsApp-a na {number}.', { number })
          : t(user ? 'Unesite broj za WhatsApp obaveštenja o ceni. Ako broj nije potvrđen na vašem nalogu, poslaćemo vam kod.' : 'Prijavite se da potvrdite svoj broj i uključite WhatsApp obaveštenja o ceni.')}
      </p>
      {user && <>
        <label htmlFor={`${id}-entry`}>{t(attempt ? 'Verifikacioni kod' : 'Broj telefona')}</label>
        <input id={`${id}-entry`} type="tel"
          inputMode={attempt ? 'numeric' : 'tel'}
          autoComplete={attempt ? 'one-time-code' : 'tel'}
          placeholder={attempt ? undefined : '+381601234567'}
          maxLength={attempt ? 6 : undefined}
          aria-describedby={`${id}-instructions`} value={attempt ? code : phone} disabled={busy}
          onChange={event => {
            if (attempt) setCode(event.target.value.replace(/\D/g, ''));
            else setPhone(event.target.value);
            setError('');
          }} />
      </>}
      {followsWishlist && user && user.phoneNumber && user.phoneNumber.replace(/[\s()-]/g, '') !== number && number &&
        <p className="product-alert-modal__whatsapp-instructions">{t('Potvrdom novog broja menjate broj telefona na nalogu.')}</p>}
      {user && attempt && <div className="product-alert-modal__whatsapp-actions">
        <button type="button" disabled={busy} onClick={event => void submit(event, true)}>{t('Pošalji novi kod')}</button>
        <button type="button" disabled={busy} onClick={() => { setAttempt(null); setCode(''); setError(''); }}>{t('Promeni broj')}</button>
      </div>}
      <p className="product-alert-modal__privacy-note">
        <ShieldCheck size={17} aria-hidden="true" />
        <span>{t('Za odjavu ovog sata odgovorite na njegovu WhatsApp poruku sa STOP SAT. Za sve satove pošaljite STOP SATOVI.')} <a href={localizePath('/whatsapp-privacy')}>{t('Politika privatnosti')}</a></span>
      </p>
      {error && <p role="alert" className="product-alert-modal__error">{t(error)}</p>}
      <div className="product-alert-modal__footer product-alert-modal__footer--whatsapp">
        <button type="submit" disabled={busy || (Boolean(user) && !canSubmit)}>
          {busy ? <LoaderCircle size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}
          {t(!user ? 'Prijavi se' : busy ? 'Čuvamo…' : attempt ? 'Potvrdi kod i uključi obaveštenje' : followsWishlist ? 'Prati sve satove sa liste' : 'Obavesti me preko WhatsApp-a')}
        </button>
      </div>
    </form>
  );
}
