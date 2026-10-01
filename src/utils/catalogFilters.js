export function isDiameterSpec(key) {
  const label = String(key || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  return /^(precnik|diameter|case diameter)\b/.test(label);
}

export function diameterValue(value) {
  const match = String(value ?? '').trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(?:mm)?$/i);
  return match ? Number(match[1]) : null;
}

export function normalizedCatalogGender(value) {
  const compact = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  if (!compact || compact === 'UNISEX') return 'UNISEX';
  if (compact === 'MUSKI' || compact === 'M') return 'MUSKI';
  if (compact === 'ZENSKI' || compact === 'Z') return 'ZENSKI';
  return compact;
}

export function catalogSpecValue(value) {
  if (value === null || value === undefined || typeof value === 'object') return null;
  return String(value).trim() || null;
}

export function filterCatalogProducts(products, params, { fixedGender, ignoreKey, ignoreSpecs = false } = {}) {
  const query = params.get('q')?.trim().toLowerCase();
  const brands = ignoreKey === 'brand' ? [] : params.getAll('brand');
  const genders = fixedGender ? [fixedGender] : ignoreKey === 'gender' ? [] : params.getAll('gender');
  const categories = ignoreKey === 'category' ? [] : params.getAll('category');
  const min = params.get('min') ? Number(params.get('min')) : null;
  const max = params.get('max') ? Number(params.get('max')) : null;
  const specifications = ignoreSpecs
    ? []
    : [...new Set(params.keys())]
      .filter((key) => key.startsWith('spec_') && key !== ignoreKey)
      .map((key) => [key.slice(5), params.getAll(key)]);

  return products.filter((product) => {
    if (query && !`${product.brand || ''} ${product.name || ''}`.toLowerCase().includes(query)) return false;
    if (brands.length && !brands.includes(product.brand)) return false;
    if (genders.length) {
      const gender = normalizedCatalogGender(product.gender);
      if (gender !== 'UNISEX' && !genders.some((selected) => normalizedCatalogGender(selected) === gender)) return false;
    }
    if (categories.length && !categories.includes(product.category)) return false;
    if (min !== null && product.price < min) return false;
    if (max !== null && product.price > max) return false;
    return specifications.every(([key, values]) =>
      values.length === 0 || values.includes(catalogSpecValue(product.specs?.[key])),
    );
  });
}
