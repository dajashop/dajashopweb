import { Check, Mail, MessageCircle, MessageSquare } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { apiRequest } from '../services/apiClient.js';
import WhatsAppSubscription from './WhatsAppSubscription.jsx';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './NotificationChannelPicker.css';

export const notificationChannelLabels = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' };

// Firebase Phone verifies identity; it does not deliver marketing messages.
// Enable each channel only when its delivery provider and confirmation flow exist.
export const notificationChannelAvailable = (channel) => channel === 'email';
export const notificationChannelNotice = (channel) => channel === 'whatsapp'
  ? 'WhatsApp obaveštenja još nisu dostupna. Za sada izaberite Email.'
  : 'SMS obaveštenja još nisu dostupna. Za sada izaberite Email.';

export function ChannelOptions({ value, onChange, disabled, channels, available, title, compact = false }) {
  const { t } = useStorefront();
  const id = useId();
  if (compact) return <fieldset className="phone-verification-options" disabled={disabled}>
    <legend>{t(title)}</legend>
    {channels.map(channel => <label key={channel} className={`${value === channel ? 'is-selected' : ''} ${!available(channel) ? 'is-unavailable' : ''}`}>
      <input type="radio" name={id} value={channel} checked={value === channel}
        disabled={!available(channel)} onChange={() => onChange(channel)} />
      <span>{t(notificationChannelLabels[channel])}</span>
    </label>)}
  </fieldset>;
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

export default function NotificationChannelPicker({ value, onChange, disabled, variant, contact, purpose, productId, variantId }) {
  const [whatsappAvailable, setWhatsAppAvailable] = useState(false);
  useEffect(() => {
    let current = true;
    apiRequest('/whatsapp/capabilities', { auth: false }).then(data => {
      if (current) setWhatsAppAvailable(data?.available === true);
    }).catch(() => {});
    return () => { current = false; };
  }, []);
  return <div className={variant === 'cards' ? undefined : 'notification-channel'}>
    <ChannelOptions value={value} onChange={onChange} disabled={disabled}
      compact={variant !== 'cards'}
      channels={['email', 'whatsapp', 'sms']} available={channel => channel === 'whatsapp' ? whatsappAvailable : notificationChannelAvailable(channel)}
      title={variant === 'cards' ? 'Gde da vam javimo?' : 'Način obaveštavanja'} />
    {value === 'whatsapp' && whatsappAvailable && <WhatsAppSubscription key={`${purpose || 'newsletter'}:${productId || ''}:${variantId || ''}`} contact={contact} purpose={purpose} productId={productId} variantId={variantId} />}
  </div>;
}
