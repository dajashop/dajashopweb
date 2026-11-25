import { catalogLandings } from '../data/catalogLandings.js';
import { stripLanguagePrefix } from '../localization/paths.js';

const flights = new Map();
const metaHeader = 'X-Daja-Catalog-Cache';
const publicRoot = '/public/catalog/';
const defaultPaths = new Set(['', '/catalog', '/muski-satovi', '/zenski-satovi', '/naocare', '/baterije', '/daljinski']);
const publicListingPaths = new Set([...defaultPaths, ...catalogLandings.map(({ path }) => path)]);
const bypass = request => request.headers.get('X-Daja-Catalog-Refresh') === '1' || /(?:^|,)\s*(?:no-cache|no-store)\s*(?:,|$)/i.test(request.headers.get('Cache-Control') || '');

export function edgeCatalogRoute(route) {
  if (!route.startsWith(publicRoot)) return null;
  const path = route.slice(publicRoot.length);
  if (/^(?:home|hero-slides|collections|brands|categories|products\/[a-z0-9][a-z0-9_-]{0,180}(?:\/variants)?)$/i.test(path))
    return route;
  if (!path.startsWith('page?')) return null;
  const query = new URLSearchParams(path.slice(5));
  if (query.get('page') !== '1' || !['', 'sort=newest'].includes(query.get('params') || '') ||
      !['satovi', 'naocare', 'baterije', 'daljinski'].includes(query.get('department')) ||
      !defaultPaths.has(query.get('pathname') || '') ||
      [...query.keys()].some(key => !['department', 'pathname', 'page', 'params', 'configurationVersion'].includes(key) ||
        query.getAll(key).length > 1)) return null;
  query.delete('configurationVersion');
  query.sort();
  return `${publicRoot}page?${query}`;
}

function cacheKey(request, scope, name) {
  const key = new URL(request.url);
  key.pathname = `/__daja-cache/v2/${scope}/${encodeURIComponent(name)}`;
  key.search = '';
  return new Request(key);
}

function metadata(response) {
  try {
    const data = JSON.parse(response.headers.get(metaHeader));
    if (Number.isFinite(data?.generatedAt) && Number.isFinite(data.freshUntil) &&
        Number.isFinite(data.staleUntil) && data.staleUntil <= data.generatedAt + 300_000 &&
        data.freshUntil <= data.staleUntil && typeof data.etag === 'string') return data;
  } catch { /* Older backends and non-catalog responses have no shared lifetime. */ }
  return null;
}

function withTiming(response, state) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.append('Server-Timing', `edge_catalog;desc="${state}"`);
  return new Response(response.body, { status: response.status, headers });
}

export async function readEdgeCatalog(request, ctx, apiBase, route, originHeaders, timeout = 8000) {
  const normalized = edgeCatalogRoute(route);
  const fetchOrigin = (apiRoute, etag) => {
    const headers = new Headers(originHeaders);
    if (etag) headers.set('If-None-Match', etag);
    if (bypass(request)) headers.set('X-Daja-Catalog-Refresh', '1');
    return fetch(`${apiBase}${apiRoute}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(timeout), cache: 'no-store' });
  };
  if (!normalized || !ctx || typeof caches === 'undefined') return fetchOrigin(route);
  const force = bypass(request);
  const cache = caches.default;
  const key = cacheKey(request, 'data', apiBase + normalized);
  const retained = force ? null : await cache.match(key).catch(() => undefined);
  const previous = retained ? metadata(retained) : null;
  if (previous?.freshUntil > Date.now()) return withTiming(retained, 'hit');

  // Keep bytes in the shared promise so each visitor receives a new stream.
  const flightKey = `${key.url}:${force ? 'refresh' : 'normal'}`;
  let flight = flights.get(flightKey);
  if (!flight && flights.size >= 64) return fetchOrigin(normalized);
  if (!flight) {
    flight = (async () => {
      const response = await fetchOrigin(normalized, previous?.etag);
      const refreshed = response.status === 304 && retained ? metadata(response) : null;
      if (response.status === 304 && !refreshed) throw new Error('Catalog validation was incomplete');
      const source = refreshed ? retained : response;
      const headers = new Headers(source.headers);
      headers.delete('Content-Encoding');
      headers.delete('Content-Length');
      let body;
      if (refreshed) {
        const payload = await retained.json();
        if (payload?.data?._catalogCache) payload.data._catalogCache = refreshed;
        body = new TextEncoder().encode(JSON.stringify(payload));
        headers.set(metaHeader, JSON.stringify(refreshed));
        headers.set('Server-Timing', response.headers.get('Server-Timing') || 'catalog_cache;desc="confirmed"');
      } else {
        body = await source.arrayBuffer();
      }
      const data = refreshed || metadata(response);
      if (!force && flights.has(key.url + ':refresh')) return { body: body.byteLength ? body : null, status: source.status, headers, refreshed };
      if (source.status === 200 && data?.freshUntil > Date.now() && body.byteLength <= 512 * 1024 && !headers.has('Set-Cookie')) {
        const stored = new Headers(headers);
        stored.delete('Server-Timing');
        stored.set('Cache-Control', `public,max-age=${Math.ceil((data.staleUntil - Date.now()) / 1000)}`);
        ctx.waitUntil(cache.put(key, new Response(body, { headers: stored })).catch(() => {}));
      } else if (source.status === 200 || source.status === 404 || source.status === 410 || (source.status >= 300 && source.status < 400)) {
        ctx.waitUntil(cache.delete(key).catch(() => {}));
      }
      return { body: body.byteLength ? body : null, status: source.status, headers, refreshed };
    })().finally(() => flights.delete(flightKey));
    flights.set(flightKey, flight);
  }

  const allowsStale = /\/(?:home|products\/[^/]+)$/.test(normalized) || normalized.startsWith(publicRoot + 'page?');
  let result;
  try {
    result = await flight;
  } catch (error) {
    if (!allowsStale || !(previous?.staleUntil > Date.now())) throw error;
  }
  if ((!result || result.status >= 500) && allowsStale && previous?.staleUntil > Date.now()) {
    const headers = new Headers(retained.headers);
    headers.delete('Content-Encoding');
    const body = await retained.json();
    const stripExpiredSale = product => {
      if (!product?.salePrice || !(Date.parse(product.saleValidUntil) <= Date.now())) return product;
      return { ...product, price: product.regularPrice ?? product.price, salePrice: null, saleValidUntil: null };
    };
    if (body?.data && typeof body.data === 'object') {
      const data = stripExpiredSale(body.data);
      body.data = { ...data, _catalogCache: previous, _catalogStale: true,
        ...(Array.isArray(data.items) ? { items: data.items.map(stripExpiredSale) } : {}) };
    }
    headers.delete('Content-Length');
    headers.delete('ETag');
    return withTiming(Response.json(body, { headers }), 'stale');
  }
  return withTiming(new Response(result.body, { status: result.status, headers: result.headers }),
    result.refreshed ? 'revalidated' : 'miss');
}

export function publicHtmlKey(request, apiBase, release) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.search || request.headers.has('Authorization') ||
      /(?:^|;\s*)__Host-daja_[^=]+=/.test(request.headers.get('Cookie') || '') || bypass(request)) return null;
  const path = stripLanguagePrefix(url.pathname);
  if (path !== '/' && !publicListingPaths.has(path) &&
      !/^\/brend\/[a-z0-9][a-z0-9-]{0,180}$/.test(path) &&
      !/^\/product\/[a-z0-9][a-z0-9_-]{0,180}$/i.test(path)) return null;
  return cacheKey(request, 'html', release + ':' + apiBase + ':' + url.pathname);
}

export function storePublicHtml(ctx, key, html, response, deadline) {
  const seconds = Math.floor((deadline - Date.now()) / 1000);
  if (!key || !Number.isFinite(seconds) || seconds < 1 || html.length > 512 * 1024) return;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public,max-age=${seconds}`);
  headers.set('X-Daja-Html-Fresh-Until', String(deadline));
  headers.delete('Server-Timing');
  ctx.waitUntil(caches.default.put(key, new Response(html, { headers })).catch(() => {}));
}
