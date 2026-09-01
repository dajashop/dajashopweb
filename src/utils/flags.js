const SUPPORTED_FLAGS = new Set(['rs', 'me', 'ba', 'hr', 'mk', 'si', 'de', 'at', 'ch']);

// Served from our own origin. Country selection must never contact FlagCDN.
export function getFlagUrl(code) {
  const normalized = String(code || 'rs').trim().toLowerCase();
  return `/images/flags/${SUPPORTED_FLAGS.has(normalized) ? normalized : 'rs'}.svg`;
}
