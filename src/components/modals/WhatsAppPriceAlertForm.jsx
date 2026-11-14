import { useId, useState } from 'react';
import { Bell, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { apiRequest } from '../../services/apiClient.js';
import {
  confirmPhoneCode, phoneVerificationCapabilities, requestPhoneCode,
} from '../../services/phoneVerification.js';

export default function WhatsAppPriceAlertForm({ product, initialPhone, onSignIn }) {
  const { user, refreshUser } = useAuth();
  const { policy } = useConsent();
  const { t, language, localizePath } = useStorefront();
  const id = useId();
  const [phone, setPhone] = useState(user?.phoneNumber || initialPhone);
  const [code, setCode] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const number = phone.replace(/[\s()-]/g, '');
  const canSubmit = number.length > 0 && (!attempt || /^\d{6}$/.test(code));

  async function activate() {
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
        void refreshUser().catch(() => {});
        if (!await activate()) throw new Error('Ova WhatsApp prijava nije dostupna.');
      } else if (!await activate()) {
        await sendCode();
      }
    } catch (requestError) {
      setError(requestError.message || 'Prijava za obaveštenje nije uspela.');
    } finally {
      setBusy(false);
    }
  }

  if (active) return <p role="status">{t('Obaveštenje o promeni cene je uključeno.')}</p>;

  return (
    <form className="product-alert-modal__whatsapp-form" onSubmit={event => void submit(event)}>
      <p id={`${id}-instructions`} className="product-alert-modal__whatsapp-instructions">
        {t(user ? 'Unesite broj za WhatsApp obaveštenja o ceni. Ako broj nije potvrđen na vašem nalogu, poslaćemo vam kod.' : 'Prijavite se da potvrdite svoj broj i uključite WhatsApp obaveštenja o ceni.')}
      </p>
      {user && <>
      <label htmlFor={`${id}-phone`}>{t('Broj telefona')}</label>
      <input id={`${id}-phone`} type="tel" autoComplete="tel" placeholder="+381601234567"
        aria-describedby={`${id}-instructions`} value={phone} disabled={busy}
        onChange={event => {
          setPhone(event.target.value);
          setAttempt(null);
          setCode('');
          setError('');
        }} />
      </>}
      {user && attempt && <>
        <p className="product-alert-modal__whatsapp-instructions" role="status">
          {t(attempt.channel === 'sms' ? 'Kod smo poslali SMS-om.' : 'Kod smo poslali preko WhatsApp-a.')}
        </p>
        <label htmlFor={`${id}-code`}>{t('Verifikacioni kod')}</label>
        <input id={`${id}-code`} type="tel" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code} disabled={busy} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} />
        <button type="button" disabled={busy} onClick={event => void submit(event, true)}>{t('Pošalji novi kod')}</button>
      </>}
      <p className="product-alert-modal__privacy-note">
        <ShieldCheck size={17} aria-hidden="true" />
        <span>{t('Odjava: pošaljite STOP u WhatsApp-u.')} <a href={localizePath('/whatsapp-privacy')}>{t('Politika privatnosti')}</a></span>
      </p>
      {error && <p role="alert" className="product-alert-modal__error">{t(error)}</p>}
      <div className="product-alert-modal__footer product-alert-modal__footer--whatsapp">
        <button type="submit" disabled={busy || (Boolean(user) && !canSubmit)}>
          {busy ? <LoaderCircle size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}
          {t(!user ? 'Prijavi se' : busy ? 'Čuvamo…' : attempt ? 'Potvrdi kod i uključi obaveštenje' : 'Obavesti me preko WhatsApp-a')}
        </button>
      </div>
    </form>
  );
}
