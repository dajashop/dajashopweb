import {watchStories} from '../data/watchStories.js';
import {watchArticles,articlePath} from '../data/watchArticles.js';
import { catalogLandings, catalogLanding } from '../data/catalogLandings.js';
import { legacyListing } from '../utils/legacyListing.js';
import { catalogPageRequest } from '../utils/catalogPageRequest.js';
import { isBrandPath } from '../utils/catalogUrls.js';
import { serviceCatalog } from '../data/serviceCatalog.js';
import { stripLanguagePrefix } from '../localization/paths.js';

export const PUBLIC_PATHS = new Set([
  ...watchStories.map(story=>`/magazin/brendovi/${story.slug}`),
  ...watchArticles.map(articlePath),
  ...catalogLandings.map(page => page.path),
  '/kolekcije-satova', '/', '/catalog', '/muski-satovi', '/zenski-satovi', '/naocare',
  '/baterije', '/daljinski', '/ostalo', '/about', '/contact', '/faq', '/usluge', '/graviranje',
  ...serviceCatalog.map(service => service.path),
]);
export const CATALOG_DEPARTMENTS = {
  '/catalog': 'satovi', '/muski-satovi': 'satovi', '/zenski-satovi': 'satovi',
  '/naocare': 'naocare', '/baterije': 'baterije', '/daljinski': 'daljinski',
};
export const isProductPath = path => /^\/product\/[^/]+\/?$/.test(path);
export const catalogDepartment = path => CATALOG_DEPARTMENTS[path] || (isBrandPath(path) || catalogLanding(path) ? 'satovi' : null);

export function publicCacheSeconds(data, maximum = 60) {
  const sales = [data.product, ...(data.catalog || []), ...(data.catalogPage?.items || []), ...(data.homeProducts?.items || []), ...(data.engravingProducts?.items || []), ...(data.relatedVariants || []), ...(data.relatedProducts || []), ...(data.collectionPreviews?.groups || []).flatMap(group=>group.items || [])].filter(item => item?.saleValidUntil);
  return sales.reduce((seconds, item) => Math.min(seconds,
    Math.max(0, Math.floor((new Date(item.saleValidUntil).getTime() - Date.now()) / 1000) || 0)), maximum);
}

export async function loadPage(url, apiBase, readProduct, readCatalog, readRelated, readPublicApi, requestHeaders = {}) {
  const path = stripLanguagePrefix(url.pathname).replace(/\/+$/, '') || '/';
  const api = async (route, optional = false) => {
    try {
      const loader = async () => {
        const response = await fetch(`${apiBase}${route}`, { signal: AbortSignal.timeout(optional ? 3000 : 8000), headers: requestHeaders });
        if (!response.ok) { const error = new Error(`Public catalog response: ${response.status}`); error.status = response.status; throw error; }
        const body = await response.json();
        return body?.data ?? body;
      };
      return await (readPublicApi ? readPublicApi(route, loader) : loader());
    } catch (error) {
      if (optional) return null;
      throw error;
    }
  };
  const catalogLoader = async () => {
    const items = [];
    const cursors = new Set();
    let cursor;
    do {
      const page = await api(`/public/catalog/products?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (!Array.isArray(page.items)) throw new Error('Invalid public catalog');
      items.push(...page.items);
      cursor = page.nextCursor;
      if (cursor && cursors.has(cursor)) throw new Error('Repeated catalog cursor');
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return items;
  };
  const data = { catalog: null, product: null, filters: {}, filterVersions: {}, relatedVariants: [], relatedProducts: [] };
  const engravingRequest = path === '/graviranje' && !url.searchParams.get('slug')
    ? catalogPageRequest('satovi', new URLSearchParams()) : null;
  const department = catalogDepartment(path);
  const productLoader = async () => {
    const slug = path.split('/')[2];
    const response = await fetch(`${apiBase}/public/catalog/products/${encodeURIComponent(decodeURIComponent(slug))}`, {
      signal: AbortSignal.timeout(8000),
      headers: requestHeaders,
    });
    if (response.status === 404) return { missing: true };
    if (!response.ok) throw new Error(`Product response: ${response.status}`);
    const body = await response.json();
    return body?.data ?? body;
  };
  const relatedLoader = async () => {
    const related = await api(`/public/catalog/products/${encodeURIComponent(decodeURIComponent(path.split('/')[2]))}/related`, true);
    return Array.isArray(related?.items) ? related.items.slice(0, 12) : null;
  };
  // The listing returns its filter configuration in the same response.
  const requestKey = department ? catalogPageRequest(department, url.searchParams, undefined, path) : null;
  let configuration = null;
  let filters = null;
  const listingLoader = async (route) => {
    try {
      const result = await api(`/public/catalog/${route}`);
      if (department && result.pathname !== path) {
        // Compatibility while the additive backend endpoint is deploying.
        filters = await api(`/public/catalog/filters/${department}`);
        configuration = filters?.configuration ?? null;
        const [{ decodeCatalogParams }, { configuredFilterParams }] = await Promise.all([
          import('../utils/catalogUrls.js'), import('../utils/filterConfiguration.js'),
        ]);
        const legacyParams = configuredFilterParams(decodeCatalogParams(url.searchParams, configuration, path), configuration);
        return await api(`/public/catalog/${catalogPageRequest(department, legacyParams)}`);
      }
      return result;
    }
    catch (error) {
      if (error.status !== 404) throw error;
      return legacyListing(await (readCatalog ? readCatalog(catalogLoader) : catalogLoader()),route,configuration);
    }
  };
  const [product, listing, variants, related, collectionPreviews, homeHero] = await Promise.all([
    isProductPath(path) ? (readProduct ? readProduct(productLoader) : productLoader()) : null,
    requestKey ? listingLoader(requestKey) : engravingRequest ? listingLoader(engravingRequest) : path === '/' ? listingLoader('home') : null,
    isProductPath(path) ? api(`/public/catalog/products/${encodeURIComponent(decodeURIComponent(path.split('/')[2]))}/variants`, true) : null,
    isProductPath(path) ? (readRelated ? readRelated(relatedLoader) : relatedLoader()) : [],
    path === '/kolekcije-satova' || path.startsWith('/magazin/brendovi/') ? api('/public/catalog/collections', true) : null,
    path === '/' ? api('/public/catalog/hero-slides', true) : null,
  ]);
  if (product?.missing) return { missing: true };
  if (product?.redirectTo) return { redirectTo: product.redirectTo };
  data.collectionPreviews = collectionPreviews;
  data.product = product?.product || product;
  if (engravingRequest) {
    const { configuration: _configuration, ...listingData } = listing;
    data.engravingProducts = { ...listingData, requestKey: engravingRequest };
  }
  if (department) {
    data.filters[department] = listing?.configuration ?? configuration;
    data.filterVersions[department] = listing?.configurationVersion ?? filters?.version;
    const { configuration: _configuration, ...listingData } = listing;
    data.catalogPage = { ...listingData, requestKey };
  }
  if (path === '/') {
    data.homeProducts = { ...listing, requestKey: 'home' };
    data.homeHero = homeHero;
  }
  data.relatedVariants = variants?.items || [];
  data.variantGroupId = variants?.groupId || null;
  data.relatedProducts = related || [];
  // Empty successful results are seeds too; failed optional requests can retry in the browser.
  data.relatedVariantsLoaded = Array.isArray(variants?.items);
  data.relatedProductsLoaded = Array.isArray(related);
  return data;
}
