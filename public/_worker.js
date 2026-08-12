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
  const baseTitle = `${product.brand || ''} ${product.name || ''}`.trim();
  const title = product.seo?.metaTitle || baseTitle || 'DajaShop';
  const description =
    product.seo?.metaDescription ||
    product.description ||
    `Kupite ${title} po odličnoj ceni u DajaShop prodavnici.`;
  const keywords = product.seo?.metaKeywords || '';
  const image =
    product.seo?.ogImage ||
    product.mainImageUrl ||
    product.image ||
    product.images?.[0]?.url ||
    `${siteUrl}/images/og-default.jpg`;
  const imageAlt = product.seo?.imageAltText || title;
  const url = `${siteUrl}/product/${product.slug}`;
  const price = Number.isFinite(product.price) ? String(product.price) : '';

  return [
    `<title>${title} | DajaShop</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : '',
    `<meta property="og:type" content="product">`,
    `<meta property="og:title" content="${escapeHtml(title)} | DajaShop">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    price ? `<meta property="product:price:amount" content="${price}">` : '',
    price ? '<meta property="product:price:currency" content="RSD">' : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)} | DajaShop">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
  ]
    .filter(Boolean)
    .join('');
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
  const apiBase = (env.DAJA_API_BASE_URL || 'https://api.dajashop.rs/api/v1').replace(
    /\/$/,
    '',
  );
  if (!slug) return null;

  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/__seo_cache/product/${slug}.json`;

  const cache = caches.default;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const res = await fetch(`${apiBase}/public/catalog/products/${encodeURIComponent(slug)}`);

  if (!res.ok) return null;

  const data = await res.json();
  const product = data.product || data;

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

    const apiBase = (env.DAJA_API_BASE_URL || 'https://api.dajashop.rs/api/v1').replace(
      /\/$/,
      '',
    );

    if (url.pathname === '/sitemap.xml') {
      return fetch(`${apiBase}/public/sitemap.xml`, {
        cf: { cacheEverything: true, cacheTtl: 3600 },
      });
    }

    let response = await env.ASSETS.fetch(request);

    // SPA fallback: samo za HTML rute, ne za statičke assete (css, js, slike)
    if (response.status === 404 && !url.pathname.match(/\.\w{1,5}$/)) {
      const indexRequest = new Request(
        `${url.protocol}//${url.host}/index.html`,
        request,
      );
      response = await env.ASSETS.fetch(indexRequest);
    }

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
