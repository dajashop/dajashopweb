import { apiRequest } from './apiClient';
import { pathLanguage } from '../localization/paths.js';
import { requestFirebasePhone, confirmFirebasePhone, readPhoneCapabilities } from './firebasePhone.js';

let pending;
let sending = false;
export const whatsappVerificationUnavailable = 'WhatsApp verifikacija trenutno nije dostupna. Izaberite SMS ili email.';

export async function phoneVerificationCapabilities() {
  const data = await readPhoneCapabilities();
  return { sms: Boolean(data?.firebasePhone), whatsapp: data?.whatsappPhone?.available === true };
}

export async function requestPhoneCode(phone, purpose, channel = 'sms') {
  if (sending) throw new Error('Sačekajte da se prethodno slanje završi.');
  if (!['sms', 'whatsapp'].includes(channel)) throw new Error('Izaberite SMS ili WhatsApp.');
  sending = true;
  try {
    const available = await phoneVerificationCapabilities();
    if (!available[channel]) throw new Error(channel === 'whatsapp' ? whatsappVerificationUnavailable : 'SMS verifikacija trenutno nije dostupna. Koristite email ili Google prijavu.');
    const result = channel === 'sms'
      ? await requestFirebasePhone(phone, purpose)
      : await apiRequest('/customer-auth/phone/start', {
        method: 'POST', auth: purpose === 'link',
        body: { phone, purpose, channel, language: pathLanguage(window.location.pathname) },
      });
    if (channel === 'whatsapp' && (result?.status !== 'sent' || !result.challengeToken)) throw new Error(whatsappVerificationUnavailable);
    pending = { phone, purpose, channel, challengeToken: result.challengeToken };
    return result;
  } finally { sending = false; }
}

export async function confirmPhoneCode(phone, code, purpose, channel = 'sms') {
  const attempt = pending;
  if (!attempt || attempt.phone !== phone || attempt.purpose !== purpose || attempt.channel !== channel) {
    throw new Error('Kod je istekao ili nije ispravan. Zatražite novi kod.');
  }
  const result = channel === 'sms' ? await confirmFirebasePhone(phone, code, purpose)
    : await apiRequest('/customer-auth/phone/verify', {
      method: 'POST', auth: purpose === 'link',
      body: { phone, code, purpose, channel, challengeToken: attempt.challengeToken },
    });
  pending = null;
  return result;
}
