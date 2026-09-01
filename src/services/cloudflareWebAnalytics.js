const SCRIPT_ID = 'dajashop-cloudflare-web-analytics';
const SCRIPT_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

function configuredToken() {
  const token = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  return typeof token === 'string' ? token.trim() : '';
}

/**
 * Cloudflare automatic injection is deliberately disabled.  This loader is
 * called only after the visitor has given an explicit analytics consent.
 */
export function loadCloudflareWebAnalytics() {
  if (typeof document === 'undefined') return false;

  const token = configuredToken();
  if (!token) {
    if (import.meta.env.DEV) {
      console.warn('Cloudflare Web Analytics token is not configured.');
    }
    return false;
  }

  const existing = document.getElementById(SCRIPT_ID)
    || document.querySelector(`script[src^="${SCRIPT_SRC}"]`);
  if (existing) return true;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'module';
  script.async = true;
  script.src = SCRIPT_SRC;
  // Cloudflare's current SPA soft-navigation collector can throw inside its
  // own web-vitals code. Keep normal page-load analytics, but opt out of that
  // optional client-side route tracking until Cloudflare fixes the beacon.
  script.dataset.cfBeacon = JSON.stringify({ token, spa: false });
  document.head.appendChild(script);
  return true;
}

export function removeCloudflareWebAnalyticsScript() {
  if (typeof document === 'undefined') return;
  document.getElementById(SCRIPT_ID)?.remove();
}
