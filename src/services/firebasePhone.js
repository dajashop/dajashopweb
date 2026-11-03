import { apiRequest } from './apiClient';

let configuration;
let runtime;
let pending;
let sending = false;

export async function firebasePhoneConfig() {
  configuration ??= apiRequest('/customer-auth/security-capabilities', { auth: false })
    .then(data => data?.firebasePhone || null)
    .catch(() => null);
  return configuration;
}

async function firebaseRuntime() {
  runtime ??= (async () => {
    const config = await firebasePhoneConfig();
    if (!config) throw new Error('SMS verifikacija trenutno nije dostupna. Koristite email ili Google prijavu.');
    const [{ initializeApp, getApps }, authSdk] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps().find(item => item.name === 'daja-phone') || initializeApp(config, 'daja-phone');
    const auth = authSdk.initializeAuth(app, { persistence: authSdk.inMemoryPersistence });
    auth.useDeviceLanguage();
    return { auth, authSdk };
  })();
  return runtime;
}

export async function requestFirebasePhone(phone, purpose) {
  if (sending) throw new Error('Sačekajte da se prethodno slanje završi.');
  sending = true;
  let verifier;
  let container;
  pending = null;
  try {
    const { auth, authSdk } = await firebaseRuntime();
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
    verifier?.clear();
    container?.remove();
    sending = false;
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
