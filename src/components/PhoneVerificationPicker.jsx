import { useId } from 'react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import { whatsappVerificationUnavailable } from '../services/phoneVerification.js';
import './NotificationChannelPicker.css';

export default function PhoneVerificationPicker({ value, onChange, channels, disabled }) {
  const id = useId();
  const { t } = useStorefront();
  return <div className="notification-channel">
    <fieldset className="notification-channel__options" disabled={disabled} aria-describedby={`${id}-summary`}>
      <legend>{t('Gde želite da primite kod?')}</legend>
      {['sms', 'whatsapp'].map(channel => <label className={value === channel ? 'is-selected' : ''} key={channel}>
        <input type="radio" name={id} checked={value === channel} value={channel} onChange={() => onChange(channel)} />
        {channel === 'sms' ? 'SMS' : 'WhatsApp'}
      </label>)}
    </fieldset>
    <div id={`${id}-summary`} className="notification-channel__summary" role="status" aria-live="polite">
      <strong>{t('Izabrani kanal za kod:')} {value === 'sms' ? 'SMS' : 'WhatsApp'}</strong>
      <span>{t(value === 'sms'
        ? 'Google obrađuje broj telefona radi SMS potvrde i zaštite od zloupotrebe.'
        : 'Kod ćete primiti u WhatsApp aplikaciji. Meta obrađuje broj telefona radi slanja koda.')}</span>
      {!channels[value] && <span>{t(value === 'whatsapp' ? whatsappVerificationUnavailable : 'SMS verifikacija trenutno nije dostupna. Koristite email ili Google prijavu.')}</span>}
    </div>
  </div>;
}
