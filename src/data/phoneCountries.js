import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min';

const PRIORITY_COUNTRIES = [
  'RS', 'XK', 'ME', 'BA', 'HR', 'SI', 'MK', 'AL', 'BG', 'RO', 'GR', 'HU', 'TR',
  'AT', 'CH', 'DE', 'LU', 'BE', 'NL', 'FR', 'IT', 'ES', 'PT', 'DK', 'NO', 'SE',
  'FI', 'GB', 'IE', 'US', 'CA', 'AU', 'NZ',
];
const CODES_WITHOUT_LOCAL_FLAG = new Set(['AC', 'TA']);

const priority = new Map(PRIORITY_COUNTRIES.map((code, index) => [code, index]));
const countryNames = new Intl.DisplayNames(['sr-Latn'], { type: 'region', fallback: 'code' });

export const PHONE_COUNTRIES = Object.freeze(
  getCountries()
    .filter((code) => !CODES_WITHOUT_LOCAL_FLAG.has(code))
    .map((code) => ({
      code,
      dial: `+${getCountryCallingCode(code)}`,
      label: countryNames.of(code) || code,
    }))
    .sort((left, right) => {
      const leftPriority = priority.get(left.code);
      const rightPriority = priority.get(right.code);
      if (leftPriority !== undefined || rightPriority !== undefined) {
        return (leftPriority ?? Number.MAX_SAFE_INTEGER) - (rightPriority ?? Number.MAX_SAFE_INTEGER);
      }
      return left.label.localeCompare(right.label, 'sr-Latn');
    })
);

function normalizeForSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('sr-Latn');
}

export function filterPhoneCountries(query) {
  const needle = normalizeForSearch(query).trim();
  if (!needle) return PHONE_COUNTRIES;
  return PHONE_COUNTRIES.filter(({ code, dial, label }) =>
    normalizeForSearch(`${label} ${code} ${dial}`).includes(needle)
  );
}
