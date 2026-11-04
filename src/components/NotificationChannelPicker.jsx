import { Check, Mail, MessageCircle, MessageSquare } from 'lucide-react';
import { useId } from 'react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './NotificationChannelPicker.css';

export const notificationChannelLabels = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' };

// Firebase Phone verifies identity; it does not deliver marketing messages.
// Enable each channel only when its delivery provider and confirmation flow exist.
export const notificationChannelAvailable = (channel) => channel === 'email';
export const notificationChannelNotice = (channel) => channel === 'whatsapp'
  ? 'WhatsApp obaveštenja još nisu dostupna. Za sada izaberite Email.'
  : 'SMS obaveštenja još nisu dostupna. Za sada izaberite Email.';

export function ChannelOptions({ value, onChange, disabled, channels, available, title }) {
  const { t } = useStorefront();
  const id = useId();
  const icons = { email: Mail, whatsapp: MessageCircle, sms: MessageSquare };
  return <fieldset disabled={disabled} className="alert-channel-cards">
    <legend>{t(title)}</legend>
    <div className="alert-channel-cards__grid" style={{ '--channel-count': channels.length }}>
      {channels.map((channel) => {
        const Icon = icons[channel];
        const enabled = available(channel);
        return <label key={channel} className={`alert-channel-cards__option ${value === channel ? 'is-selected' : ''} ${!enabled ? 'is-unavailable' : ''}`}>
          <input type="radio" name={id} value={channel} checked={value === channel} disabled={!enabled} onChange={() => onChange(channel)} />
          <Icon size={20} aria-hidden="true" />
          <strong>{t(notificationChannelLabels[channel])}</strong>
          {value === channel && <Check className="alert-channel-cards__check" size={14} aria-hidden="true" />}
        </label>;
      })}
    </div>
  </fieldset>;
}

export default function NotificationChannelPicker({ value, onChange, disabled, variant }) {
  return <div className={variant === 'cards' ? undefined : 'notification-channel'}>
    <ChannelOptions value={value} onChange={onChange} disabled={disabled}
      channels={['email', 'whatsapp', 'sms']} available={notificationChannelAvailable}
      title={variant === 'cards' ? 'Gde da vam javimo?' : 'Način obaveštavanja'} />
  </div>;
}
