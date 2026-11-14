export const DEFAULT_CATALOG_SORT = 'newest';

export function catalogPageRequest(department, params, fixedGender, pathname) {
  const requested = Number(params.get('page'));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100000) : 1;
  const filters = new URLSearchParams(params);
  filters.delete('page');
  if (!filters.get('sort')) filters.set('sort', DEFAULT_CATALOG_SORT);
  for (const key of [...filters.keys()]) if (key.startsWith('utm_') || ['gclid', 'fbclid'].includes(key)) filters.delete(key);
  filters.sort();
  const query = new URLSearchParams({ department, page: String(page), params: filters.toString() });
  if (fixedGender) query.set('fixedGender', fixedGender);
  if (pathname) query.set('pathname', pathname);
  return `page?${query}`;
}
