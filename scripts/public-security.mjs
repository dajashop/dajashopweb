import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { isSensitivePath } from '../src/ssr/requestSecurity.js';

// Every VITE_* value is public browser code. Approve names explicitly instead
// of trying to recognize leaked secret values after publication.
const publicNames = new Set([
  'VITE_DAJA_BROWSER_SESSIONS',
  'VITE_ADMIN_EMAILS', 'VITE_BUSINESS_NAME', 'VITE_BUSINESS_STREET',
  'VITE_BUSINESS_PHONE', 'VITE_BUSINESS_EMAIL', 'VITE_BUSINESS_HOURS',
  'VITE_BUSINESS_CITY', 'VITE_BUSINESS_POSTAL_CODE', 'VITE_BUSINESS_COUNTRY',
  'VITE_BUSINESS_LAT', 'VITE_BUSINESS_LNG', 'VITE_BUSINESS_MAPS_URL',
  'VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN', 'VITE_DAJA_API_BASE_URL', 'VITE_DAJA_WS_URL',
  'VITE_GOOGLE_MAPS_KEY', 'VITE_GOOGLE_SITE_VERIFICATION',
  'VITE_OG_DEFAULT_IMAGE', 'VITE_SITE_DESCRIPTION', 'VITE_SITE_KEYWORDS',
  'VITE_SITE_LOCALE', 'VITE_SITE_LOCALE_ALT', 'VITE_SITE_LOGO_URL', 'VITE_SITE_NAME',
  'VITE_SITE_URL', 'VITE_TWITTER_HANDLE',
  'VITE_INSTAGRAM_PROFILE_URL',
  'VITE_GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_SHOP_PLACE_ID', 'VITE_DAJA_MOCK_FALLBACK',
  'VITE_STOREFRONT_DELIVERY_MAX_DAYS', 'VITE_STOREFRONT_DELIVERY_MIN_DAYS',
  'VITE_STOREFRONT_FREE_SHIPPING_THRESHOLD_RSD', 'VITE_STOREFRONT_RETURN_DAYS',
  'VITE_STOREFRONT_SHIPPING_COST_RSD',
]);

export async function assertPublicBuild() {
  const environment = loadEnv('production', process.cwd(), 'VITE_');
  const unapproved = Object.keys(environment).filter(name => !publicNames.has(name));
  if (unapproved.length) throw new Error(`Unapproved public environment variable names: ${unapproved.join(', ')}`);
  for (const name of ['VITE_DAJA_API_BASE_URL', 'VITE_DAJA_WS_URL', 'VITE_SITE_URL']) {
    if (!environment[name]) continue;
    const url = new URL(environment[name]);
    if (url.username || url.password || url.search || url.hash
      || !['https:', 'wss:'].includes(url.protocol)) {
      throw new Error(`${name} must be a public HTTPS/WSS URL without credentials, query or fragment.`);
    }
  }
  async function inspect(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink() || isSensitivePath(relative)) {
        throw new Error(`Refusing to publish private/source file: public${relative}`);
      }
      if (entry.isDirectory()) await inspect(join(directory, entry.name), relative);
      else if (/\.(?:json|txt|xml|html|svg|csv)$/i.test(entry.name)) {
        const content = await readFile(join(directory, entry.name), 'utf8');
        if (/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|(?:postgres(?:ql)?:\/\/)[^\s]+:[^\s]+@/.test(content)) {
          throw new Error(`Possible private credential in public${relative}`);
        }
      }
    }
  }
  await inspect('public');
}
