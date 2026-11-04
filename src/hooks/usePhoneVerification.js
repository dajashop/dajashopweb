import { useEffect, useState } from 'react';
import { phoneVerificationCapabilities } from '../services/phoneVerification.js';

export function usePhoneVerification() {
  const [channels, setChannels] = useState({ sms: false, whatsapp: false });
  useEffect(() => {
    let active = true;
    phoneVerificationCapabilities().then(value => { if (active) setChannels(value); });
    return () => { active = false; };
  }, []);
  return channels;
}
