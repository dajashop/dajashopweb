import { PHONE_COUNTRIES } from '../data/phoneCountries.js';

const SUPPORTED_FLAGS = new Set(PHONE_COUNTRIES.map(({ code }) => code.toLowerCase()));

// Served from our own origin. Country selection must never contact FlagCDN.
export function getFlagUrl(code) {
  const normalized = String(code || 'rs').trim().toLowerCase();
  return `/images/flags/${SUPPORTED_FLAGS.has(normalized) ? normalized : 'rs'}.png`;
}
