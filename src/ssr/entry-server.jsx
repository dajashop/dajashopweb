import React from 'react';
import { renderToString } from 'react-dom/server.browser';
import { StaticRouter } from 'react-router-dom';
import App from '../App.jsx';
import AppProviders from '../AppProviders.jsx';
import { normalizeProduct } from '../services/dajaPlatform.js';

export function renderPage(location, snapshot, siteUrl) {
  const data = {
    ...snapshot, siteUrl,
    catalog: snapshot.catalog?.map(normalizeProduct) ?? null,
    product: snapshot.product ? normalizeProduct(snapshot.product) : null,
    relatedVariants: (snapshot.relatedVariants || []).map(normalizeProduct),
  };
  const context = {};
  const body = renderToString(
    <React.StrictMode><StaticRouter location={location}>
      <AppProviders pageData={data} helmetContext={context}><App /></AppProviders>
    </StaticRouter></React.StrictMode>,
  );
  const helmet = context.helmet;
  const head = ['title', 'meta', 'link', 'script'].map(key => helmet?.[key]?.toString() || '').join('');
  return { body, head, data };
}

export function renderDocument(template, rendered) {
  const serialized = JSON.stringify(rendered.data)
    .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  // Keep favicon, viewport, built CSS/module links and CSP; replace only SEO
  // tags owned by Helmet. Marked elements remain owned by Helmet on navigation.
  return template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name=["'](?:description|keywords|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace('</head>', () => `${rendered.head}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${rendered.body}</div><script id="daja-page-data" type="application/json">${serialized}</script>`);
}
