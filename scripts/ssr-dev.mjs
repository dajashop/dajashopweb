import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { isProductPath, loadPage, PUBLIC_PATHS } from '../src/ssr/loadPage.js';
import { isBrandPath } from '../src/utils/catalogUrls.js';
import { PUBLIC_SITE_URL } from '../src/config/publicSite.js';

export default function ssrDev() {
  return {
    name: 'daja-public-ssr',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      const apiBase = (env.DAJA_API_BASE_URL || env.VITE_DAJA_API_BASE_URL || 'https://daja-platform-api.onrender.com/api/v1').replace(/\/$/, '');
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname.replace(/\/+$/, '') || '/';
        if (!['GET', 'HEAD'].includes(req.method) || (!PUBLIC_PATHS.has(path) && !isProductPath(path) && !isBrandPath(path))) return next();
        try {
          const snapshot = await loadPage(url, apiBase);
          if (snapshot.missing) { res.statusCode = 404; res.end('Proizvod nije pronađen.'); return; }
          if (snapshot.redirectTo) {
            res.writeHead(301, { Location: snapshot.redirectTo }); res.end(); return;
          }
          const template = await server.transformIndexHtml(req.url,
            await readFile(resolve(server.config.root, 'index.html'), 'utf8'));
          const { renderDocument, renderPage } = await server.ssrLoadModule('/src/ssr/entry-server.jsx');
          const html = renderDocument(template, renderPage(`${url.pathname}${url.search}`, snapshot,
            PUBLIC_SITE_URL));
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(req.method === 'HEAD' ? undefined : html);
        } catch (error) {
          server.ssrFixStacktrace(error);
          server.config.logger.error(error.stack);
          res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' });
          res.end('Stranica je privremeno nedostupna.');
        }
      });
    },
  };
}
