/* global HTMLRewriter */

const BOT_UA_REGEX =
  /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|googlebot|bingbot|yandexbot|duckduckbot)/i;
const SEO_CACHE_SECONDS = 120;

function isProductPath(pathname) {
  return /^\/product\/[^/]+\/?$/.test(pathname);
}

function getSlugFromPath(pathname) {
  return pathname.split('/').filter(Boolean)[1] || '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function productPrice(product) {
  const amount = Number(product?.price);
  return Number.isFinite(amount) ? amount / 100 : null;
}

function productImages(product) {
  const images = [];
  if (product?.primaryImageUrl || product?.mainImageUrl) {
    images.push({
      url: product.primaryImageUrl || product.mainImageUrl,
      altText: product?.seo?.imageAltText || '',
    });
  }
  for (const item of Array.isArray(product?.images) ? product.images : []) {
    if (typeof item === 'string') images.push({ url: item, altText: '' });
    else if (item?.url) {
      images.push({ url: item.url, altText: item.altText || item.alt_text || '' });
    }
  }
  return [...new Map(images.filter((item) => item.url).map((item) => [item.url, item])).values()];
}

function gtinProperty(barcode) {
  const value = String(barcode || '').replace(/[\s-]/g, '');
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return {};
  const digits = [...value].map(Number);
  const sum = digits
    .slice(0, -1)
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits.at(-1)
    ? { [`gtin${value.length}`]: value }
    : {};
}

function buildSeo({ siteUrl, product }) {
  const productName = `${product.brand_name || product.brand || ''} ${product.name || ''}`.trim();
  const title = product.seo?.metaTitle || productName || 'DajaShop';
  const description =
    product.seo?.metaDescription ||
    product.description ||
    `Kupite ${title} po odličnoj ceni u DajaShop prodavnici.`;
  const url = `${siteUrl}/product/${product.slug}`;
  const images = productImages(product);
  const image = product.seo?.ogImage || images[0]?.url || `${siteUrl}/images/og-default.jpg`;
  const imageAlt = product.seo?.imageAltText || images[0]?.altText || title;
  const price = productPrice(product);
  const availability = product.inStock === true || product.availability?.inStock === true;
  const condition = {
    new: 'NewCondition',
    used: 'UsedCondition',
    refurbished: 'RefurbishedCondition',
  }[product.item_condition || product.itemCondition] || 'NewCondition';
  const offer = {
    '@type': 'Offer',
    url,
    priceCurrency: product.currency || 'RSD',
    ...(price !== null ? { price: String(price) } : {}),
    availability: `https://schema.org/${availability ? 'InStock' : 'OutOfStock'}`,
    itemCondition: `https://schema.org/${condition}`,
    seller: { '@type': 'Organization', name: 'DajaShop' },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'RS',
      returnPolicyCountry: 'RS',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      returnMethod: 'https://schema.org/ReturnByMail',
      merchantReturnDays: 14,
      returnFees: 'https://schema.org/ReturnShippingFees',
    },
  };
  if (product.salePrice && product.saleValidUntil) {
    offer.priceValidUntil = String(product.saleValidUntil).slice(0, 10);
  }
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description,
    image: images.map((item) => ({
      '@type': 'ImageObject',
      url: item.url,
      name: item.altText || imageAlt,
    })),
    brand: { '@type': 'Brand', name: product.brand_name || product.brand || 'DajaShop' },
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...gtinProperty(product.barcode),
    offers: offer,
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Početna', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: product.category_name || product.category || 'Katalog', item: `${siteUrl}/catalog` },
      { '@type': 'ListItem', position: 3, name: productName, item: url },
    ],
  };
  return { title, description, url, image, imageAlt, price, schema, breadcrumbs };
}

async function fetchProductBySlug({ slug, env, request }) {
  const apiBase = (env.DAJA_API_BASE_URL || 'https://daja-platform-api.onrender.com/api/v1').replace(/\/$/, '');
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/__seo_cache/product/${slug}.json`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached.json();

  const response = await fetch(`${apiBase}/public/catalog/products/${encodeURIComponent(slug)}`);
  if (response.status === 404) return { missing: true };
  if (!response.ok) return { unavailable: true };
  const data = await response.json();
  const result = data?.redirectTo
    ? { redirectTo: data.redirectTo }
    : { product: data?.product || data };
  await caches.default.put(
    cacheKey,
    new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${SEO_CACHE_SECONDS}`,
      },
    }),
  );
  return result;
}

function notFoundResponse() {
  return new Response(
    '<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Proizvod nije pronađen | DajaShop</title></head><body><h1>Proizvod nije pronađen</h1><p>Proverite link ili se vratite u katalog.</p></body></html>',
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

function rewriteProductHtml(response, seo) {
  const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
  const injector = `<meta property="og:image:alt" content="${escapeHtml(seo.imageAlt)}"><meta property="product:price:amount" content="${seo.price ?? ''}"><meta property="product:price:currency" content="RSD"><script type="application/ld+json">${safeJson(seo.schema)}</script><script type="application/ld+json">${safeJson(seo.breadcrumbs)}</script><script>window.__DAJASHOP_SERVER_PRODUCT_SCHEMA__=true;</script>`;
  const metaValues = {
    description: seo.description,
    robots: 'index,follow,max-image-preview:large',
    'og:title': `${seo.title} | DajaShop`,
    'og:description': seo.description,
    'og:image': seo.image,
    'og:url': seo.url,
    'og:type': 'product',
    'twitter:title': `${seo.title} | DajaShop`,
    'twitter:description': seo.description,
    'twitter:image': seo.image,
  };
  return new HTMLRewriter()
    .on('title', { element(element) { element.setInnerContent(`${seo.title} | DajaShop`); } })
    .on('meta', { element(element) {
      const key = element.getAttribute('name') || element.getAttribute('property');
      if (key && metaValues[key]) element.setAttribute('content', metaValues[key]);
    } })
    .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', seo.url); } })
    .on('head', { element(element) { element.append(injector, { html: true }); } })
    .transform(response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiBase = (env.DAJA_API_BASE_URL || 'https://daja-platform-api.onrender.com/api/v1').replace(/\/$/, '');
    if (url.pathname === '/sitemap.xml') {
      return fetch(`${apiBase}/public/catalog/sitemap.xml`, { cf: { cacheEverything: true, cacheTtl: 3600 } });
    }

    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && !url.pathname.match(/\.\w{1,5}$/)) {
      response = await env.ASSETS.fetch(new Request(`${url.protocol}//${url.host}/index.html`, request));
    }
    if (!isProductPath(url.pathname)) return response;

    const productResult = await fetchProductBySlug({ slug: getSlugFromPath(url.pathname), env, request });
    if (productResult?.redirectTo) {
      return Response.redirect(new URL(productResult.redirectTo, url.origin).toString(), 301);
    }
    if (productResult?.missing) return notFoundResponse();
    if (!productResult?.product) return response;
    if (!BOT_UA_REGEX.test(request.headers.get('user-agent') || '')) return response;

    const siteUrl = (env.SITE_URL || `${url.protocol}//${url.host}`).replace(/\/$/, '');
    return rewriteProductHtml(response, buildSeo({ siteUrl, product: productResult.product }));
  },
};
