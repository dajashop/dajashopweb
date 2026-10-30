const STORAGE_KEY = 'daja_oauth_browser_state';
const MAX_AGE = 10 * 60 * 1000;

export function createOAuthBrowserState(storage, random = crypto) {
  try {
    const target = storage ?? window.sessionStorage;
    const value = [...random.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    target.setItem(STORAGE_KEY, JSON.stringify({ value, createdAt: Date.now() }));
    return value;
  } catch {
    throw new Error('Prijavu nije moguće započeti. Omogućite čuvanje podataka i pokušajte ponovo.');
  }
}

export function consumeOAuthBrowserState(value, storage) {
  try {
    const target = storage ?? window.sessionStorage;
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return false;
    const saved = JSON.parse(target.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.value !== value || !Number.isFinite(saved.createdAt)
      || Date.now() < saved.createdAt || Date.now() - saved.createdAt > MAX_AGE) return false;
    target.removeItem(STORAGE_KEY);
    return true;
  } catch { return false; }
}
