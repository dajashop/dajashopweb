export function catalogPageRequest(department, params, fixedGender) {
  const requested = Number(params.get('page'));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100000) : 1;
  const filters = new URLSearchParams(params);
  filters.delete('page');
  filters.sort();
  const query = new URLSearchParams({ department, page: String(page), params: filters.toString() });
  if (fixedGender) query.set('fixedGender', fixedGender);
  return `page?${query}`;
}
