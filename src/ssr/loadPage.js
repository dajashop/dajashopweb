import { legacyListing } from '../utils/legacyListing.js';
import { decodeCatalogParams } from '../utils/catalogUrls.js';
import { configuredFilterParams } from '../utils/filterConfiguration.js';
import { catalogPageRequest } from '../utils/catalogPageRequest.js';
import { isBrandPath } from '../utils/catalogUrls.js';

export const PUBLIC_PATHS = new Set([
  '/', '/catalog', '/muski-satovi', '/zenski-satovi', '/naocare',
  '/baterije', '/daljinski', '/about', '/contact', '/faq', '/usluge', '/graviranje',
]);
export const CATALOG_DEPARTMENTS = {
  '/catalog': 'satovi', '/muski-satovi': 'satovi', '/zenski-satovi': 'satovi',
  '/naocare': 'naocare', '/baterije': 'baterije', '/daljinski': 'daljinski',
};
export const isProductPath = path => /^\/product\/[^/]+\/?$/.test(path);
export const catalogDepartment = path => CATALOG_DEPARTMENTS[path] || (isBrandPath(path) ? 'satovi' : null);

export function publicCacheSeconds(data, maximum = 60) {
  const sales = [data.product, ...(data.catalog || []), ...(data.catalogPage?.items || []), ...(data.homeProducts?.items || []), ...(data.relatedVariants || []), ...(data.relatedProducts || [])].filter(item => item?.saleValidUntil);
  return sales.reduce((seconds, item) => Math.min(seconds,
    Math.max(0, Math.floor((new Date(item.saleValidUntil).getTime() - Date.now()) / 1000) || 0)), maximum);
}

export async function loadPage(url, apiBase, readProduct, readCatalog, readRelated) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const api = async (route, optional = false) => {
    try {
      const response = await fetch(`${apiBase}${route}`, { signal: AbortSignal.timeout(optional ? 3000 : 8000) });
      if (!response.ok) { const error = new Error(`Public catalog response: ${response.status}`); error.status = response.status; throw error; }
      const body = await response.json();
      return body?.data ?? body;
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
  const data = { catalog: null, product: null, filters: {}, relatedVariants: [], relatedProducts: [] };
  const needsCatalog = path === '/graviranje';
  const department = catalogDepartment(path);
  const productLoader = async () => {
    const slug = path.split('/')[2];
    const response = await fetch(`${apiBase}/public/catalog/products/${encodeURIComponent(decodeURIComponent(slug))}`, {
      signal: AbortSignal.timeout(8000),
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
  const filters = department ? await api(`/public/catalog/filters/${department}`) : null;
  const configuration = filters?.configuration ?? null;
  const fixedGender = path === '/muski-satovi' ? 'Muški' : path === '/zenski-satovi' ? 'Ženski' : undefined;
  const listingParams = configuredFilterParams(decodeCatalogParams(url.searchParams, configuration, path), configuration, fixedGender);
  const requestKey = department ? catalogPageRequest(department, listingParams, fixedGender) : null;
  const listingLoader = async (route) => {
    try { return await api(`/public/catalog/${route}`); }
    catch (error) {
      if (error.status !== 404) throw error;
      return legacyListing(await catalogLoader(),route,configuration);
    }
  };
  const [catalog, product, listing, variants, related] = await Promise.all([
    needsCatalog ? (readCatalog ? readCatalog(catalogLoader) : catalogLoader()) : null,
    isProductPath(path) ? (readProduct ? readProduct(productLoader) : productLoader()) : null,
    requestKey ? listingLoader(requestKey) : path === '/' ? listingLoader('home') : null,
    isProductPath(path) ? api(`/public/catalog/products/${encodeURIComponent(decodeURIComponent(path.split('/')[2]))}/variants`, true) : null,
    isProductPath(path) ? (readRelated ? readRelated(relatedLoader) : relatedLoader()) : [],
  ]);
  if (product?.missing) return { missing: true };
  if (product?.redirectTo) return { redirectTo: product.redirectTo };
  data.catalog = catalog;
  data.product = product?.product || product;
  if (department) {
    data.filters[department] = listing?.configuration ?? configuration;
    const { configuration: _configuration, ...listingData } = listing;
    data.catalogPage = { ...listingData, requestKey };
  }
  if (path === '/') data.homeProducts = { ...listing, requestKey: 'home' };
  data.relatedVariants = variants?.items || [];
  data.relatedProducts = related || [];
  // Empty successful results are seeds too; failed optional requests can retry in the browser.
  data.relatedVariantsLoaded = Array.isArray(variants?.items);
  data.relatedProductsLoaded = Array.isArray(related);
  return data;
}
