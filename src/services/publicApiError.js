export function safeApiErrorMessage(status, data) {
  const fallback = status >= 500
    ? 'Usluga je privremeno nedostupna. Pokušajte ponovo kasnije.'
    : 'Zahtev nije uspeo. Proverite podatke i pokušajte ponovo.';
  // Only bounded JSON application messages from client errors reach the UI.
  const candidate = data && typeof data === 'object' ? data.message || data.error?.message : null;
  if (status < 500 && typeof candidate === 'string' && candidate.length <= 300
    && !/-----BEGIN|(?:postgres(?:ql)?|mysql):\/\/|\bat\s+\S+\s*\([^)]*:\d+:\d+\)|SQLSTATE|\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]*\b(?:FROM|INTO|SET)\b/i.test(candidate)) return candidate;
  return fallback;
}
