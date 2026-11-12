import { apiRequest } from './apiClient';
import { pathLanguage } from '../localization/paths.js';

let capabilitiesRequest;
let capabilitiesExpiresAt = 0;
let runtime;
let pending;
let sending = false;

export function readPhoneCapabilities() {
  if (!capabilitiesRequest || Date.now() >= capabilitiesExpiresAt) {
    capabilitiesExpiresAt = Date.now() + 60_000;
    capabilitiesRequest = apiRequest('/customer-auth/security-capabilities', { auth: false })
      .catch(() => {
        capabilitiesRequest = undefined;
        return null;
      });
  }
  return capabilitiesRequest;
}

export async function firebasePhoneConfig() {
  const data = await readPhoneCapabilities();
  return data?.firebasePhone || null;
}

async function firebaseRuntime() {
  runtime ??= (async () => {
    const config = await firebasePhoneConfig();
    if (!config) throw new Error('SMS verifikacija trenutno nije dostupna. Koristite email ili Google prijavu.');
    const [{ initializeApp, getApps }, authSdk] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps().find(item => item.name === 'daja-phone') || initializeApp(config, 'daja-phone');
    const auth = authSdk.initializeAuth(app, { persistence: authSdk.inMemoryPersistence });
    return { auth, authSdk };
  })().catch(error => {
    runtime = undefined;
    throw error;
  });
  return runtime;
}

export async function requestFirebasePhone(phone, purpose) {
  if (sending) throw new Error('Sačekajte da se prethodno slanje završi.');
  sending = true;
  let verifier;
  let container;
  try {
    const { auth, authSdk } = await firebaseRuntime();
    // Resolve on every send so changing the storefront language also changes
    // Firebase's SMS and reCAPTCHA locale, regardless of browser preferences.
    auth.languageCode = pathLanguage(window.location.pathname);
    const challenge = await apiRequest('/customer-auth/phone/start', {
      method: 'POST', auth: purpose === 'link', body: { phone, purpose },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    verifier = new authSdk.RecaptchaVerifier(auth, container, { size: 'invisible' });
    const confirmation = await authSdk.signInWithPhoneNumber(auth, phone, verifier);
    pending = { phone, purpose, confirmation, challengeToken: challenge.challengeToken };
    return { status: 'sent', expiresInSeconds: challenge.expiresInSeconds };
  } catch (error) {
    const messages = {
      'auth/too-many-requests': 'Previše zahteva. Pokušajte kasnije.',
      'auth/quota-exceeded': 'SMS trenutno nije dostupan. Pokušajte kasnije.',
      'auth/billing-not-enabled': 'SMS trenutno nije dostupan. Pokušajte kasnije.',
      'auth/invalid-phone-number': 'Unesite ispravan broj telefona.',
      'auth/captcha-check-failed': 'Potvrdite bezbednosnu proveru i pokušajte ponovo.',
    };
    throw new Error(messages[error.code] || error.message || 'Greška pri slanju SMS-a.');
  } finally {
    try {
      verifier?.clear();
    } finally {
      container?.remove();
      sending = false;
    }
  }
}

export async function confirmFirebasePhone(phone, code, purpose) {
  const attempt = pending;
  if (!attempt || attempt.phone !== phone || attempt.purpose !== purpose) {
    throw new Error('Kod je istekao ili nije ispravan. Zatražite novi kod.');
  }
  const { auth, authSdk } = await firebaseRuntime();
  // Firebase checks the SMS code. Only its signed proof goes to the DAJA API.
  let credential;
  try { credential = await attempt.confirmation.confirm(code); }
  catch { throw new Error('Kod je istekao ili nije ispravan. Zatražite novi kod.'); }
  pending = null;
  try {
    const firebaseIdToken = await credential.user.getIdToken();
    return await apiRequest('/customer-auth/phone/verify', {
      method: 'POST', auth: purpose === 'link',
      body: { phone, purpose, firebaseIdToken, challengeToken: attempt.challengeToken },
    });
  } finally {
    await authSdk.signOut(auth);
  }
}
