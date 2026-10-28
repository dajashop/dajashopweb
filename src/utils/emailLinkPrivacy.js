export const EMAIL_LINK_PATHS = new Set([
  '/verify-email', '/reset-password', '/newsletter-confirm', '/product-alert-confirm', '/unsubscribe',
]);

export function isEmailLinkPath(pathname) {
  return EMAIL_LINK_PATHS.has(stripLanguagePrefix(pathname).replace(/\/$/, '') || '/');
}
import { stripLanguagePrefix } from '../localization/paths.js';
