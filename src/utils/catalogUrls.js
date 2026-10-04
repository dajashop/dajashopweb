import { movementFilterRole } from './filterConfiguration.js';

const cyrillic = 'абвгдђежзијклљмнњопрстћуфхцчџш';
const latin = ['a','b','v','g','d','dj','e','z','z','i','j','k','l','lj','m','n','nj','o','p','r','s','t','c','u','f','h','c','c','dz','s'];
export function urlSlug(value) {
  return String(value ?? '').toLowerCase().replace(/[а-яђјљњћџ]/g, char => latin[cyrillic.indexOf(char)] || char)
    .replace(/đ/g, 'dj').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ostalo';
}
export const brandUrl = brand => `/brend/${urlSlug(brand)}`;
export const brandChoiceUrl = (brand, choice) => `${brandUrl(brand)}?${['muski', 'zenski'].includes(urlSlug(choice)) ? 'pol' : 'kolekcija'}=${urlSlug(choice)}`;
export const isBrandPath = path => /^\/brend\/[^/]+\/?$/.test(path);
const leaves = nodes => (nodes || []).flatMap(node => node.mode === 'group' ? leaves(node.children) : [node]);
const selectedKey = node => `cf_${node.id}`;
const boundKey = (node, edge) => `cf_${edge}_${node.id}`;

// IDs remain authoritative inside the filter engine; readable names are an
// adapter at the URL boundary. Duplicate names receive deterministic suffixes.
export function filterUrlEntries(configuration) {
  const used = new Set(['page', 'sort', 'q', 'utm-source', 'utm-medium', 'utm-campaign']);
  const unique = (base, set) => { let key = base; let count = 2; while (set.has(key)) key = `${base}-${count++}`; set.add(key); return key; };
  return leaves(configuration?.filters).map(node => {
    const title = urlSlug(node.title);
    const base = node.sources?.includes('brand') ? 'brend'
      : node.sources?.includes('price') ? 'cena'
        : movementFilterRole(node) === 'type' ? 'mehanizam'
          : movementFilterRole(node) === 'model' ? 'kalibar' : title;
    const key = unique(urlSlug(node.urlSlug || base), used);
    const optionsUsed = new Set();
    const options = (node.options || []).map(option => ({ option,
      slug: unique(urlSlug(option.urlSlug || option.label), optionsUsed) }));
    return { node, key, options };
  });
}

export function decodeCatalogParams(raw, configuration, pathname = '/catalog') {
  const next = new URLSearchParams(raw);
  const routeBrand = isBrandPath(pathname) ? decodeURIComponent(pathname.split('/')[2]) : null;
  const entries = filterUrlEntries(configuration);
  for (const { node, key, options } of entries) {
    if (node.style === 'range') {
      for (const [suffix, edge] of [['od', 'min'], ['do', 'max']]) {
        const publicKey = `${key}-${suffix}`;
        if (next.has(publicKey)) next.set(boundKey(node, edge), next.get(publicKey));
        next.delete(publicKey);
      }
    } else {
      const values = [...raw.getAll(key), ...(node.sources?.includes('brand') && routeBrand ? [routeBrand] : [])];
      const ids = new Set(next.getAll(selectedKey(node)));
      for (const value of values) {
        const entry = options.find(item => item.slug === value || urlSlug(item.option.label) === urlSlug(value));
        if (entry) ids.add(entry.option.id);
      }
      next.delete(key);
      next.delete(selectedKey(node));
      ids.forEach(id => next.append(selectedKey(node), id));
    }
  }
  if (!configuration) {
    const aliases = { brend: 'brand', pol: 'gender', kolekcija: 'category', 'cena-od': 'min', 'cena-do': 'max' };
    for (const [key, legacy] of Object.entries(aliases)) {
      if (raw.has(key)) { next.delete(legacy); raw.getAll(key).forEach(value => next.append(legacy, value)); next.delete(key); }
    }
    if (routeBrand) next.set('brand', routeBrand === 'q-q' ? 'Q&Q' : routeBrand.replace(/-/g, ' ').toUpperCase());
  }
  return next;
}

export function catalogUrl(params, configuration, pathname = '/catalog') {
  const next = new URLSearchParams(params);
  let path = isBrandPath(pathname) ? '/catalog' : pathname;
  for (const { node, key, options } of filterUrlEntries(configuration)) {
    if (node.style === 'range') {
      for (const [suffix, edge] of [['od', 'min'], ['do', 'max']]) {
        const internal = boundKey(node, edge);
        if (next.has(internal)) next.set(`${key}-${suffix}`, next.get(internal));
        next.delete(internal);
      }
    } else {
      const selected = options.filter(item => params.getAll(selectedKey(node)).includes(item.option.id));
      next.delete(selectedKey(node)); next.delete(key);
      if (node.sources?.includes('brand') && selected.length === 1 && path === '/catalog') path = `/brend/${selected[0].slug}`;
      else selected.forEach(item => next.append(key, item.slug));
    }
  }
  if (!configuration) {
    const brands = next.getAll('brand');
    if (brands.length === 1 && path === '/catalog') { path = brandUrl(brands[0]); next.delete('brand'); }
  }
  return `${path}${next.size ? `?${next}` : ''}`;
}

export function brandDisplayName(value) {
  return String(value || '').split(/\s+/).map(word => word.includes('&') ? word : word[0]?.toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
