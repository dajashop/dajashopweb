/* global HTMLRewriter */
import { renderDocument, renderPage } from './entry-server.jsx';
import { catalogDepartment, isProductPath, loadPage, PUBLIC_PATHS, publicCacheSeconds } from './loadPage.js';
import { isBrandPath, catalogUrl, decodeCatalogParams, filterUrlEntries, urlSlug } from '../utils/catalogUrls.js';
import { configuredFilterParams } from '../utils/filterConfiguration.js';
import { PUBLIC_SITE_URL } from '../config/publicSite.js';

const PRIVATE_PATHS = new Set(['/cart', '/checkout', '/account', '/orders', '/admin',
  '/verify-email', '/reset-password', '/logout', '/unsubscribe', '/privacy', '/cookies', '/terms', '/search']);

async function errorPage(status, request, env) {
  try {
    const url = new URL(request.url);
    const templateResponse = await env.ASSETS.fetch(new Request(new URL('/', url)));
    if (!templateResponse.ok) throw new Error('Page template unavailable');
    const siteUrl = PUBLIC_SITE_URL;
    const rendered = renderPage(`${url.pathname}${url.search}`, {
      errorStatus: status, errorPath: url.pathname,
    }, siteUrl);
    const html = renderDocument(await templateResponse.text(), rendered);
    const headers = new Headers(templateResponse.headers);
    for (const name of ['Content-Length', 'Content-Encoding', 'ETag', 'Set-Cookie']) headers.delete(name);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Robots-Tag', 'noindex,follow');
    if (status === 503) headers.set('Retry-After', '60');
    return new Response(request.method === 'HEAD' ? null : html, { status, headers });
  } catch (error) {
    console.error('Error page rendering failed', { status, message: error.message });
  }
  // Last resort if the asset template or renderer itself is unavailable.
  const title = status === 404 ? 'Stranica nije pronađena' : 'Stranica je privremeno nedostupna';
  return new Response(`<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title} | DajaShop</title></head><body><h1>${title}</h1><p>${status === 404 ? 'Proverite adresu ili otvorite katalog.' : 'Pokušajte ponovo za nekoliko trenutaka.'}</p><a href="/catalog">Otvori katalog</a></body></html>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      ...(status === 503 ? { 'Retry-After': '60' } : {}) },
  });
}

async function cachedData(request, name, loader, ttl) {
  const key = new URL(request.url);
  key.pathname = `/__ssr-data/v1/${name}`;
  key.search = '';
  const cacheRequest = new Request(key.toString());
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cached = await cache?.match(cacheRequest);
  if (cached) return cached.json();
  const value = await loader();
  const seconds = ttl(value);
  if (cache && seconds > 0 && !value?.missing && !value?.redirectTo) {
    await cache.put(cacheRequest, new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public,max-age=${seconds}` },
    }));
  }
  return value;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/assets/')) {
      const asset = await env.ASSETS.fetch(request);
      // Pages can serve the SPA HTML fallback for a removed build chunk.
      // Never cache that fallback under an immutable JavaScript/CSS URL.
      if (!asset.ok || /text\/html/i.test(asset.headers.get('Content-Type') || '')) {
        return new Response(request.method === 'HEAD' ? null : 'Asset not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        });
      }
      return asset;
    }
    const apiBase = (env.DAJA_API_BASE_URL || import.meta.env.VITE_DAJA_API_BASE_URL || 'https://daja-platform-api.onrender.com/api/v1').replace(/\/$/, '');
    if (path === '/api/v1/customer-auth/oauth/google/callback') {
      const callback = new URL(`${apiBase}/customer-auth/oauth/google/callback`);
      callback.search = url.search;
      return fetch(new Request(callback, request));
    }
    if (path === '/sitemap.xml' || path === '/merchant-feed.xml') {
      return fetch(`${apiBase}/public/catalog${path}`, { headers: { 'Cache-Control': 'no-cache' } });
    }
    if (/\.\w{1,8}$/.test(path) && !isProductPath(path)) return env.ASSETS.fetch(request);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    if (PRIVATE_PATHS.has(path) || path.startsWith('/account/') || path.startsWith('/admin/')) {
      const asset = await env.ASSETS.fetch(new Request(new URL('/', url)));
      const headers = new Headers(asset.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Robots-Tag', 'noindex,follow');
      const response = new Response(asset.body, { status: asset.status, headers });
      const rendered = new HTMLRewriter().on('meta[name="robots"]', { element(element) {
        element.setAttribute('content', 'noindex,follow');
      } }).transform(response);
      return request.method === 'HEAD' ? new Response(null, { status: rendered.status, headers: rendered.headers }) : rendered;
    }
    if (!PUBLIC_PATHS.has(path) && !isProductPath(path) && !isBrandPath(path)) return errorPage(404, request, env);
    const siteUrl = PUBLIC_SITE_URL;
    try {
      const snapshot = await loadPage(url, apiBase,
        loader => cachedData(request, `product/${encodeURIComponent(path.split('/')[2])}`, loader,
          product => publicCacheSeconds({ product })),
        loader => cachedData(request, 'catalog', loader, catalog => publicCacheSeconds({ catalog })),
        loader => cachedData(request, `related/${encodeURIComponent(path.split('/')[2])}`, loader,
          relatedProducts => publicCacheSeconds({ relatedProducts })),
      );
      if (snapshot.missing) return errorPage(404, request, env);
      if (snapshot.redirectTo) return Response.redirect(new URL(snapshot.redirectTo, siteUrl).toString(), 301);
      const department = catalogDepartment(path);
      if (department && snapshot.filters[department]) {
        const configuration = snapshot.filters[department];
        if (isBrandPath(path)) {
          const slug = decodeURIComponent(path.split('/')[2]);
          const brand = filterUrlEntries(configuration).find(entry => entry.node.sources.includes('brand'));
          if (!brand?.options.some(entry => entry.option.visible && (entry.slug === slug || urlSlug(entry.option.label) === urlSlug(slug)))) return errorPage(404, request, env);
        }
        const gender = path === '/muski-satovi' ? 'Muški' : path === '/zenski-satovi' ? 'Ženski' : undefined;
        const params = configuredFilterParams(decodeCatalogParams(url.searchParams, configuration, path), configuration, gender);
        const readable = catalogUrl(params, configuration, path);
        if (readable !== `${url.pathname}${url.search}`) return Response.redirect(new URL(readable, siteUrl).toString(), 301);
      }
      const templateResponse = await env.ASSETS.fetch(new Request(new URL('/', url)));
      if (!templateResponse.ok) throw new Error('Page template unavailable');
      const template = await templateResponse.text();
      const rendered = renderPage(`${url.pathname}${url.search}`, snapshot, siteUrl);
      let html = renderDocument(template, rendered);
      // Query pages remain crawlable so bots can read noindex. Pagination is
      // deliberately excluded from this rule and gets a self canonical.
      const filtered = [...url.searchParams.keys()].some(key => !['page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].includes(key));
      if ((catalogDepartment(path) && filtered) || (path === '/graviranje' && url.search)) {
        html = html.replace(/(<meta\b[^>]*name="robots"[^>]*content=")[^"]*/g, '$1noindex,follow,max-image-preview:large');
      }
      const headers = new Headers(templateResponse.headers);
      headers.delete('Content-Length'); headers.delete('Content-Encoding');
      headers.delete('ETag'); headers.delete('Set-Cookie');
      headers.set('Content-Type', 'text/html; charset=utf-8');
      // Only anonymous public data is serialized. Customer tokens, receipts,
      // drafts and cart contents never enter the shared cache or HTML.
      const ttl = publicCacheSeconds(snapshot);
      headers.set('Cache-Control', url.search || !ttl ? 'no-store' : `public,max-age=0,s-maxage=${ttl},must-revalidate`);
      return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
    } catch (error) {
      console.error('Public page rendering failed', { path, message: error.message });
      return errorPage(503, request, env);
    }
  },
};
