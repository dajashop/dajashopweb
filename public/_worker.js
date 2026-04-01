const BOT_UA_REGEX =
  /(facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Pinterest|Googlebot)/i;

function isProductPath(pathname) {
  return /^\/product\/[^/]+/.test(pathname);
}

function getSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[1] || '';
}

function buildMetaTags({ siteUrl, product }) {
  const title =
    `${product.brand || ''} ${product.name || ''}`.trim() || 'DajaShop';
  const description =
    product.description ||
    `Kupite ${title} po odličnoj ceni u DajaShop prodavnici.`;
  const image =
    product.mainImageUrl ||
    product.image ||
    product.images?.[0]?.url ||
    `${siteUrl}/images/og-default.jpg`;
  const url = `${siteUrl}/product/${product.slug}`;

  return [
    `<title>${title} | DajaShop</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:title" content="${escapeHtml(title)} | DajaShop">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)} | DajaShop">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
  ].join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchProductBySlug({ slug, env, request }) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId || !slug) return null;

  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/__seo_cache/product/${slug}.json`;

  const cache = caches.default;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const api = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'products' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'slug' },
          op: 'EQUAL',
          value: { stringValue: slug },
        },
      },
      limit: 1,
    },
  };

  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) return null;

  const rows = await res.json();
  const found = rows.find((row) => row.document?.fields);
  if (!found) return null;

  const fields = found.document.fields;
  const product = {
    slug: fields.slug?.stringValue || slug,
    name: fields.name?.stringValue || '',
    brand: fields.brand?.stringValue || '',
    description: fields.description?.stringValue || '',
    image: fields.image?.stringValue || '',
    mainImageUrl: fields.mainImageUrl?.stringValue || '',
  };

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(product), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    }),
  );

  return product;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_UA_REGEX.test(userAgent);

    const functionsBase = `https://europe-west1-${env.FIREBASE_PROJECT_ID}.cloudfunctions.net`;

    if (url.pathname === '/sitemap.xml') {
      return fetch(`${functionsBase}/generateSitemap`, {
        cf: { cacheEverything: true, cacheTtl: 3600 },
      });
    }

    if (url.pathname.startsWith('/firebase-web-authn-api')) {
      const suffix =
        url.pathname.slice('/firebase-web-authn-api'.length) + url.search;
      return fetch(
        `${functionsBase}/ext-firebase-web-authn-api${suffix}`,
        new Request(request),
      );
    }

    const response = await env.ASSETS.fetch(request);
    if (!isBot || !isProductPath(url.pathname)) {
      return response;
    }

    const slug = getSlugFromPath(url.pathname);
    const product = await fetchProductBySlug({ slug, env, request });
    if (!product) {
      return response;
    }

    const siteUrl = (env.SITE_URL || `${url.protocol}//${url.host}`).replace(
      /\/$/,
      '',
    );
    const tags = buildMetaTags({ siteUrl, product });

    const html = await response.text();
    const injected = html.includes('</head>')
      ? html.replace('</head>', `${tags}</head>`)
      : html;

    return new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
};
