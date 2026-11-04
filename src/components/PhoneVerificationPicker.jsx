import { useId } from 'react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './NotificationChannelPicker.css';

export default function PhoneVerificationPicker({ value, onChange, channels, disabled }) {
  const id = useId();
  const { t } = useStorefront();
  return <div className="notification-channel">
    <fieldset className="phone-verification-options" disabled={disabled}>
      <legend>{t('Gde želite da primite kod?')}</legend>
      {['sms', 'whatsapp'].map(channel => <label key={channel} className={`${value === channel ? 'is-selected' : ''} ${!channels[channel] ? 'is-unavailable' : ''}`}>
        <input type="radio" name={id} value={channel} checked={value === channel}
          disabled={!channels[channel]} onChange={() => onChange(channel)} />
        <span>{channel === 'sms' ? 'SMS' : 'WhatsApp'}</span>
      </label>)}
    </fieldset>
  </div>;
}
