const attempts = new Map();

function storageKey(accountId) {
  return 'daja:checkout-attempt:' + (accountId || 'guest');
}

function hex(bytes) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export async function checkoutCartHash(items, proof) {
  const cart = items.map(item => [
    item.productId ?? item.id ?? null, item.variantId ?? null,
    Number(item.qty ?? item.quantity ?? 1), item.engraving ?? null,
  ]);
  const encoded = new TextEncoder().encode(proof + JSON.stringify(cart));
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoded)));
}

export function readCheckoutAttempt(accountId) {
  const key = storageKey(accountId);
  if (attempts.has(key)) return attempts.get(key);
  try {
    const attempt = JSON.parse(sessionStorage.getItem(key));
    if (/^[a-f0-9-]{36}$/.test(attempt?.key) && /^[a-f0-9]{64}$/.test(attempt.proof) &&
        /^[a-f0-9]{64}$/.test(attempt.cartHash)) return attempt;
  } catch { /* Unavailable or invalid storage. */ }
  return null;
}

export async function beginCheckoutAttempt(accountId, items) {
  const key = crypto.randomUUID();
  const proof = hex(crypto.getRandomValues(new Uint8Array(32)));
  const attempt = { key, proof, cartHash: await checkoutCartHash(items, proof) };
  const name = storageKey(accountId);
  attempts.set(name, attempt);
  try { sessionStorage.setItem(name, JSON.stringify(attempt)); } catch { /* Keep the attempt in memory. */ }
  return attempt;
}

export function forgetCheckoutAttempt(accountId, attempt) {
  if (!attempt || readCheckoutAttempt(accountId)?.key !== attempt.key) return;
  const key = storageKey(accountId);
  attempts.delete(key);
  try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
}
