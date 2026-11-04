import { Check, Mail, MessageCircle, MessageSquare } from 'lucide-react';
import { useId } from 'react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './NotificationChannelPicker.css';

export const notificationChannelLabels = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };

// Firebase Phone verifies identity; it does not deliver marketing messages.
// Enable each channel only when its delivery provider and confirmation flow exist.
export const notificationChannelAvailable = (channel) => channel === 'email';
export const notificationChannelNotice = (channel) => channel === 'whatsapp'
  ? 'WhatsApp obaveštenja još nisu dostupna. Za sada izaberite Email.'
  : 'SMS obaveštenja još nisu dostupna. Za sada izaberite Email.';

export default function NotificationChannelPicker({ value, onChange, disabled, contact = '', variant }) {
  const { t } = useStorefront();
  const id = useId();
  if (variant === 'cards') {
    const icons = { email: Mail, whatsapp: MessageCircle, sms: MessageSquare };
    return <fieldset disabled={disabled} className="alert-channel-cards">
      <legend>{t('Gde da vam javimo?')}</legend>
      <div className="alert-channel-cards__grid">
        {['email', 'whatsapp', 'sms'].map((channel) => {
          const Icon = icons[channel];
          const available = notificationChannelAvailable(channel);
          return <label key={channel} className={`alert-channel-cards__option ${value === channel ? 'is-selected' : ''} ${!available ? 'is-unavailable' : ''}`}>
            <input type="radio" name={id} value={channel} checked={value === channel} disabled={!available} onChange={() => onChange(channel)} />
            <Icon size={23} aria-hidden="true" />
            <strong>{t(notificationChannelLabels[channel])}</strong>
            {value === channel && <Check className="alert-channel-cards__check" size={14} aria-hidden="true" />}
          </label>;
        })}
      </div>
    </fieldset>;
  }
  return <div className="notification-channel">
    <fieldset disabled={disabled} className="notification-channel__options" aria-describedby={`${id}-summary`}>
      <legend>{t('Način obaveštavanja')}</legend>
      {Object.entries(notificationChannelLabels).map(([channel, label]) => <label key={channel} className={value === channel ? 'is-selected' : ''}>
        <input type="radio" name={id} value={channel} checked={value === channel} onChange={() => onChange(channel)} />
        <span>{t(label)}</span>
      </label>)}
    </fieldset>
    <div id={`${id}-summary`} className="notification-channel__summary" role="status" aria-live="polite" aria-atomic="true">
      <strong>{t('Izabrani kanal:')} {t(notificationChannelLabels[value])}</strong>
      {contact && <span className="notification-channel__contact">{contact}</span>}
      <span>{t(value === 'whatsapp' ? 'Izabrali ste WhatsApp poruke, ne SMS.' : value === 'sms' ? 'Izabrali ste SMS poruke.' : 'Izabrali ste email poruke.')}</span>
      {!notificationChannelAvailable(value) && <span>{t(notificationChannelNotice(value))}</span>}
    </div>
  </div>;
}
