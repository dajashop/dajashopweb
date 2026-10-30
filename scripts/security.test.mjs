import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import cdn from '../src/workers/r2-image-worker.js';
import { isSensitivePath } from '../src/ssr/requestSecurity.js';
import { assertPublicBuild } from './public-security.mjs';
import { descriptionHtml } from '../src/components/description.js';
import { safeApiErrorMessage } from '../src/services/publicApiError.js';

const attacks = ['/.env', '/en/.env.production', '/.git/config', '/backup.sql',
  '/.dev.vars', '/package-lock.json', '/src/main.jsx', '/scripts/build.mjs',
  '/node_modules/a/index.js', '/key.pem', '/db.sqlite', '/assets/main.js.map',
  '/%252eenv', '/%2egit/config', '/%00env', '/%ZZ', '/foo%5c.env', '/__ssr-data/v1/catalog'];

test('API errors hide server diagnostics and proxy HTML while preserving safe validation messages', () => {
  for (const data of [{ message: 'SELECT secret FROM users' }, { error: { message: 'internal password' } }, '<h1>Proxy stack trace</h1>']) {
    assert.equal(safeApiErrorMessage(500, data), 'Usluga je privremeno nedostupna. Pokušajte ponovo kasnije.');
  }
  for (const data of ['<h1>Proxy error</h1>', { message: 'postgres://user:password@private/db' },
    { message: 'at handler (/private/server.js:12:34)' }, { message: 'x'.repeat(301) }]) {
    assert.equal(safeApiErrorMessage(400, data), 'Zahtev nije uspeo. Proverite podatke i pokušajte ponovo.');
  }
  assert.equal(safeApiErrorMessage(422, { error: { message: 'Invalid email' } }), 'Invalid email');
});

test('private paths, encoded bypasses and source maps are denied', () => {
  for (const path of attacks) assert.equal(isSensitivePath(path), true, path);
  for (const path of ['/catalog', '/en/catalog', '/product/casio', '/assets/index-abc.js',
    '/images/product-placeholder.svg', '/robots.txt', '/.well-known/security.txt']) {
    assert.equal(isSensitivePath(path), false, path);
  }
});

test('public build refuses unapproved environment names without printing values', async () => {
  const name = 'VITE_PRIVATE_SECURITY_TEST_KEY';
  const previous = process.env[name];
  process.env[name] = 'fake-value-must-never-be-printed';
  try {
    await assert.rejects(assertPublicBuild, error => error.message.includes(name)
      && !error.message.includes(process.env[name]));
  } finally {
    if (previous === undefined) delete process.env[name]; else process.env[name] = previous;
  }
});

test('product descriptions discard active tags and attributes, retaining safe formatting', () => {
  for (const payload of ['<img src=x onerror=alert(1)>', '<svg><script>alert(1)</script></svg>',
    '<p onclick="alert(1)">Hello</p><iframe srcdoc="evil"></iframe>',
    '<p><a href="javascript:alert(1)">Link</a></p>', '<p>&lt;img src=x onerror=alert(1)&gt;</p>']) {
    const html = descriptionHtml(payload);
    assert.doesNotMatch(html, /<(?:script|iframe|svg|img|a)\b|<[^>]+\s(?:on\w+|href|src)\s*=/i);
  }
  assert.equal(descriptionHtml('<p>Hello <strong>watch</strong></p>'), '<p>Hello <strong>watch</strong></p>');
});

test('CDN write methods never reach R2, even with an old shared token', async () => {
  const env = { DAJASHOP_IMAGES: new Proxy({}, { get() { throw new Error('R2 must not be accessed'); } }) };
  for (const method of ['PUT', 'DELETE', 'POST', 'PATCH']) {
    const response = await cdn.fetch(new Request('https://cdn.dajashop.rs/images/product.webp', {
      method, headers: { 'X-Auth-Token': 'old-token' },
    }), env);
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD, OPTIONS');
  }
});

test('CDN GET/HEAD stream public images with safe headers and support CORS', async () => {
  const calls = [];
  const object = { body: 'ok', size: 2, httpEtag: '"abc"', httpMetadata: { contentType: 'image/webp' },
    writeHttpMetadata(headers) { headers.set('Content-Type', this.httpMetadata.contentType); } };
  const env = { DAJASHOP_IMAGES: {
    async get(key) { calls.push(['get', key]); return object; },
    async head(key) { calls.push(['head', key]); return object; },
  } };
  for (const method of ['GET', 'HEAD']) {
    const r = await cdn.fetch(new Request('https://cdn.dajashop.rs/images/casio/image.webp', { method }), env);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('Content-Type'), 'image/webp');
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(r.headers.get('Content-Security-Policy'), /sandbox/);
    assert.equal(await r.text(), method === 'HEAD' ? '' : 'ok');
  }
  assert.deepEqual(calls, [['get', 'casio/image.webp'], ['head', 'casio/image.webp']]);
  const preflight = await cdn.fetch(new Request('https://cdn.dajashop.rs/images/a.webp', { method: 'OPTIONS' }), env);
  assert.equal(preflight.status, 204);
  assert.doesNotMatch(preflight.headers.get('Access-Control-Allow-Methods'), /PUT|DELETE/);
  object.httpMetadata.contentType = 'text/html';
  const download = await cdn.fetch(new Request('https://cdn.dajashop.rs/images/file'), env);
  assert.equal(download.headers.get('Content-Disposition'), 'attachment');
});

const template = readFileSync('dist/index.html', 'utf8');
let edge;
before(async () => {
edge = new Miniflare(convertV4MiniflareOptions({
  modules: true, scriptPath: resolve('dist/_worker.js'), compatibilityDate: '2026-04-12',
  serviceBindings: { ASSETS: async request => {
    const path = new URL(request.url).pathname;
    return new Response(path === '/assets/existing.js' ? 'export default 1' : template, {
      headers: { 'Content-Type': path === '/assets/existing.js' ? 'text/javascript' : 'text/html' },
    });
  } },
}));
await edge.ready;
});
after(() => edge?.dispose());

test('built Pages Worker rejects sensitive paths and missing assets instead of SPA fallback', async () => {
  for (const path of [...attacks.filter(p => p !== '/%ZZ'), '/missing.json', '/assets/removed.js']) {
    const r = await edge.dispatchFetch(`https://dajashop.rs${path}`);
    assert.equal(r.status, 404, path);
    assert.equal(r.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await r.text(), /<html|id="root"/i);
    assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
  }
  const asset = await edge.dispatchFetch('https://dajashop.rs/assets/existing.js');
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), 'export default 1');
});

test('SSR nonces match script tags, differ between responses, and never enter shared HTML cache', async () => {
  let lastNonce;
  for (const path of ['/account', '/en/account', '/verify-email?token=fake-sensitive-token']) {
    const r = await edge.dispatchFetch(`https://dajashop.rs${path}`);
    assert.equal(r.status, 200);
    const policy = r.headers.get('Content-Security-Policy');
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce);
    assert.notEqual(nonce, lastNonce);
    lastNonce = nonce;
    const scriptPolicy = policy.split(';').find(part => part.trim().startsWith('script-src'));
    assert.match(scriptPolicy, /'strict-dynamic'/);
    assert.doesNotMatch(scriptPolicy, /'unsafe-inline'/);
    const html = await r.text();
    for (const tag of html.match(/<script\b[^>]*>/g) || []) assert.ok(tag.includes(`nonce="${nonce}"`), tag);
    assert.equal(r.headers.get('Cache-Control'), 'no-store');
    assert.equal(r.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(r.headers.get('Strict-Transport-Security'), 'max-age=2592000');
    if (path.includes('token=')) assert.equal(r.headers.get('Referrer-Policy'), 'no-referrer');
  }
});

test('SSR rejects writes before static fallback, OAuth forwarding or sitemap fetch', async () => {
  for (const path of ['/assets/existing.js', '/sitemap.xml', '/api/v1/customer-auth/oauth/google/callback']) {
    const r = await edge.dispatchFetch(`https://dajashop.rs${path}`, { method: 'POST', body: 'x' });
    assert.equal(r.status, 405, path);
  }
});
