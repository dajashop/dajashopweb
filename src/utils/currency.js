export function formatMoney(amount, { locale = 'sr-RS', currency = 'RSD', eurRsdRate } = {}) {
  const value = Number(amount) || 0;
  const useEuro = currency === 'EUR' && Number.isFinite(eurRsdRate) && eurRsdRate > 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: useEuro ? 'EUR' : 'RSD',
    minimumFractionDigits: useEuro ? 2 : 0,
    maximumFractionDigits: useEuro ? 2 : 0,
  }).format(useEuro ? value / eurRsdRate : value);
}

// Administration, stored prices and order calculations retain the base currency.
export const money = amount => formatMoney(amount);
