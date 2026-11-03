// The regional storefront uses Serbian; other countries default to English.
export const SERBIAN_COUNTRIES = ['RS', 'ME', 'MK', 'BA', 'HR', 'BG', 'SI', 'AL', 'RO', 'HU', 'GR', 'XK'];
export const SERBIAN_HREFLANGS = ['sr', ...SERBIAN_COUNTRIES.filter(code => code !== 'XK').map(code => `sr-${code}`)];
export const LANGUAGE_COOKIE = 'daja_language_choice';

export function preferredRequestLanguage(request) {
  const choice = request.headers.get('Cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${LANGUAGE_COOKIE}=`))?.slice(LANGUAGE_COOKIE.length + 1);
  if (choice === 'sr' || choice === 'en') return choice;
  const country = request.cf?.country;
  if (!country || country === 'XX' || country === 'T1') return null;
  return SERBIAN_COUNTRIES.includes(country) ? 'sr' : 'en';
}
