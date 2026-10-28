export function pathLanguage(pathname = '/') {
  return /^\/en(?:\/|$)/i.test(pathname) ? 'en' : 'sr';
}

export function stripLanguagePrefix(pathname = '/') {
  return pathname.replace(/^\/en(?=\/|$)/i, '') || '/';
}

export function localizedPath(value = '/', language = 'sr') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return value;
  const match = value.match(/^([^?#]*)([\s\S]*)$/);
  const path = stripLanguagePrefix(match[1]);
  return `${language === 'en' ? path === '/' ? '/en' : `/en${path}` : path}${match[2]}`;
}

export function localizedSiteUrl(value, language, siteUrl) {
  const url = new URL(value || '/', siteUrl);
  if (url.origin !== new URL(siteUrl).origin) return url.toString();
  return `${url.origin}${localizedPath(`${url.pathname}${url.search}${url.hash}`, language)}`;
}
