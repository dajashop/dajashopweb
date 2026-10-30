// Public CDN only. Writes go through the authenticated platform media API.
const SECURITY_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=2592000',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Referrer-Policy': 'no-referrer',
};

function failure(request, status, message, extra = {}) {
  return new Response(request.method === 'HEAD' ? null : message, {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

function objectKey(pathname) {
  if (!pathname.startsWith('/images/')) return null;
  // Keep existing R2 names (including percent escapes) intact.
  const key = pathname.slice('/images/'.length);
  let decoded;
  try { decoded = decodeURIComponent(key); } catch { return null; }
  if (!key || [...decoded].some(char => char.charCodeAt(0) < 32 || char === '\\')
      || decoded.split('/').some(part => !part || part.startsWith('.'))) return null;
  return key;
}

export default {
  async fetch(request, env) {
    const allow = 'GET, HEAD, OPTIONS';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return failure(request, 405, 'Method not allowed', { Allow: allow });
    }
    const key = objectKey(new URL(request.url).pathname);
    if (!key) return failure(request, 404, 'Not found');
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        ...SECURITY_HEADERS, 'Access-Control-Allow-Methods': allow,
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400',
      } });
    }
    try {
      const object = request.method === 'HEAD'
        ? await env.DAJASHOP_IMAGES.head(key)
        : await env.DAJASHOP_IMAGES.get(key);
      if (!object) return failure(request, 404, 'Not found');
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
      const type = (object.httpMetadata?.contentType || 'application/octet-stream').split(';')[0].trim().toLowerCase();
      headers.set('Content-Type', type);
      // Unknown/active types are downloads, never pages on the trusted origin.
      // SVG files additionally receive the sandbox CSP.
      if (!/^image\/(?:avif|webp|png|jpeg|gif|svg\+xml|x-icon)$/.test(type)) {
        headers.set('Content-Disposition', 'attachment');
      }
      headers.set('ETag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Content-Length', String(object.size));
      return new Response(request.method === 'HEAD' ? null : object.body, { headers });
    } catch {
      // Never persist URLs, credentials, keys or provider exceptions.
      console.error('CDN request failed', { event: 'r2_read_failure' });
      return failure(request, 503, 'Service unavailable', { 'Retry-After': '60' });
    }
  },
};
