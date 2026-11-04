import { ChannelOptions } from './NotificationChannelPicker.jsx';

export default function PhoneVerificationPicker({ value, onChange, channels, disabled }) {
  return <div className="notification-channel">
    <ChannelOptions compact value={value} onChange={onChange} disabled={disabled}
      channels={['sms', 'whatsapp']} available={channel => Boolean(channels[channel])}
      title="Gde želite da primite kod?" />
  </div>;
}
