import React from 'react';
import { renderToString } from 'react-dom/server.browser';
import { StaticRouter } from 'react-router-dom';
import App from '../App.jsx';
import AppProviders from '../AppProviders.jsx';
import { normalizeProduct } from '../services/dajaPlatform.js';

export function renderPage(location, snapshot, siteUrl) {
  const data = {
    ...snapshot, siteUrl,
    catalogPage: snapshot.catalogPage ? { ...snapshot.catalogPage, items: snapshot.catalogPage.items.map(normalizeProduct) } : null,
    homeProducts: snapshot.homeProducts ? { ...snapshot.homeProducts, items: snapshot.homeProducts.items.map(normalizeProduct) } : null,
    catalog: snapshot.catalog?.map(normalizeProduct) ?? null,
    product: snapshot.product ? normalizeProduct(snapshot.product) : null,
    relatedVariants: (snapshot.relatedVariants || []).map(normalizeProduct),
    relatedProducts: (snapshot.relatedProducts || []).map(normalizeProduct),
  };
  // React 19/Helmet 3 hoists metadata only when SSR renders a document.
  // Rendering App as a fragment puts those tags in the root's body markup
  // and no longer populates the legacy Helmet context.
  const documentHtml = renderToString(
    <html lang="sr">
      <head />
      <body>
        <React.StrictMode><StaticRouter location={location}>
          <AppProviders pageData={data}><App /></AppProviders>
        </StaticRouter></React.StrictMode>
      </body>
    </html>,
  );
  const head = documentHtml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  const body = documentHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (head === undefined || body === undefined) {
    throw new Error('SSR did not render a complete HTML document.');
  }
  return { body, head, data };
}

export function renderDocument(template, rendered) {
  const serialized = JSON.stringify(rendered.data)
    .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  // Keep favicon, viewport, built CSS/module links and CSP in the template
  // head; replace its default SEO tags with React's page-specific metadata.
  return template
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, templateHead => templateHead
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\b[^>]*(?:name=["'](?:description|keywords|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, '')
      .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
      .replace(/<\/head>/i, () => `${rendered.head}</head>`))
    .replace('<div id="root"></div>', () => `<div id="root">${rendered.body}</div><script id="daja-page-data" type="application/json">${serialized}</script>`);
}
