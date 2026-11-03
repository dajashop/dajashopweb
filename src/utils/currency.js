export function formatMoney(amount, { locale = 'sr-RS', currency = 'RSD', rates = {}, eurRsdRate, precision } = {}) {
  const value = Number(amount) || 0;
  const multiplier = currency === 'RSD' ? 1 : Number(rates[currency] ?? (currency === 'EUR' && eurRsdRate > 0 ? 1 / eurRsdRate : NaN));
  const code = Number.isFinite(multiplier) && multiplier > 0 ? currency : 'RSD';
  const fractions = precision === 2 ? 2 : code === 'RSD' ? 0 : 2;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: fractions,
    maximumFractionDigits: fractions,
  });
  const converted = code === 'RSD' ? value : value * multiplier;
  // A dot/comma thousands separator can be read as a decimal by search
  // snippets in another locale. Keep full RSD amounts grouped with spaces.
  if (code === 'RSD') {
    return formatter.formatToParts(converted)
      .map(part => part.type === 'group' ? '\u202f' : part.value).join('');
  }
  return formatter.format(converted);
}

// Administration, stored prices and order calculations retain the base currency.
export const money = amount => formatMoney(amount);
