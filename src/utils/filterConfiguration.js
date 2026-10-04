import { catalogSpecValue, normalizedCatalogGender } from './catalogFilters.js';
import { formatProductSpecLabel, visibleProductFeatures, isInternalCatalogKey } from './catalogPresentation.js';

export const filterId = () => crypto.randomUUID();
export const normalizedFilterText = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
export function movementFilterRole(node) {
  const labels = [...(node.sources || []).map((source) => source.replace(/^spec:/, '')), node.title].map(normalizedFilterText);
  if (labels.some((label) => /^(tip mehanizma|movement type|type of movement)$/.test(label))) return 'type';
  if (labels.some((label) => /^(mehanizam|movement|kalibar|caliber|calibre|model mehanizma|movement model)$/.test(label))) return 'model';
  return '';
}
export const specificationSourceKey = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'specification';
export function numericFilterValue(value) {
  const match = String(value ?? '').trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*([^\d]*)$/);
  return match ? { number: Number(match[1]), unit: match[2].trim().toLowerCase() } : null;
}
export function sourceValues(product, source) {
  if (source.startsWith('feature:')) return visibleProductFeatures(product.features).some((feature) => feature.title.trim() === source.slice(8)) ? ['Da'] : [];
  if (source === 'gender') {
    const value = normalizedCatalogGender(product.gender);
    return value === 'UNISEX' ? ['Muški', 'Ženski'] : value === 'MUSKI' ? ['Muški'] : value === 'ZENSKI' ? ['Ženski'] : [String(product.gender)];
  }
  const key = source.slice(5);
  const raw = source.startsWith('spec:') ? product.specs?.[key] ?? Object.entries(product.specs || {}).find(([name]) => specificationSourceKey(name) === specificationSourceKey(key))?.[1] : product[source];
  return (Array.isArray(raw) ? raw : [raw]).map(catalogSpecValue).filter(Boolean);
}
export function discoverFilterSources(products, definitions = []) {
  const sources = new Map(['gender', 'brand', 'category', 'price'].map((id, index) => [id, { id, label: ['Pol', 'Brend', 'Kolekcija', 'Cena'][index], values: new Set(), unit: id === 'price' ? 'RSD' : '' }]));
  const add = (id, label, values, unit = '') => {
    if (!sources.has(id)) sources.set(id, { id, label, values: new Set(), unit });
    values.forEach((value) => sources.get(id).values.add(value));
  };
  products.forEach((product) => {
    ['gender', 'brand', 'category', 'price'].forEach((source) => add(source, source, sourceValues(product, source)));
    Object.keys(product.specs || {}).filter((key) => !isInternalCatalogKey(key)).forEach((key) => add(`spec:${key}`, formatProductSpecLabel(key), sourceValues(product, `spec:${key}`)));
    visibleProductFeatures(product.features).forEach((feature) => add(`feature:${feature.title.trim()}`, feature.title.trim(), ['Da']));
  });
  definitions.forEach((definition) => {
    const key = definition.slug || definition.key;
    if (!key || isInternalCatalogKey(key)) return;
    const existing = [...sources.values()].find((source) => source.id.startsWith('spec:') && [key, definition.name].some((name) => normalizedFilterText(source.id.slice(5)) === normalizedFilterText(name)));
    add(existing?.id || `spec:${specificationSourceKey(definition.name || key)}`, definition.name || formatProductSpecLabel(key), (definition.optionValues || []).map(String), definition.unit || '');
  });
  return [...sources.values()].map((source) => ({ ...source, values: [...source.values].sort((a, b) => a.localeCompare(b, 'sr-Latn', { numeric: true })) }));
}
export function newFilter(source) {
  const label = normalizedFilterText(source.label);
  const style = source.id === 'price' || /^(precnik|diameter|case diameter)\b/.test(label) ? 'range'
    : /\b(boja|color|colour)\b/.test(label) ? 'color'
      : /(narukvic|kais|strap|bracelet)/.test(label) && /(materijal|material)/.test(label) ? 'material' : 'checkbox';
  const unit = source.unit || numericFilterValue(source.values.find((value) => numericFilterValue(value)?.unit))?.unit || '';
  const values = source.id === 'price' && source.values.length ? [...new Set([String(Math.min(...source.values.map(Number))), String(Math.max(...source.values.map(Number)))])] : source.values;
  return { id: filterId(), title: source.label, description: '', visible: true, autoAddOptions: true, open: ['gender', 'brand', 'price'].includes(source.id), priority: 0, mode: 'options', style: style === 'range' && !values.length ? 'checkbox' : style, match: 'any', columns: style === 'color' ? 5 : 1, showCounts: style !== 'color', unit, sources: [source.id], children: [], options: values.map((value) => ({ id: filterId(), label: source.id.startsWith('feature:') ? source.label : value, visible: true, color: '', image: '', conditions: [{ source: source.id, values: [value] }] })) };
}
// Same response-only expansion as the API, using all products before active facets.
export function automaticFilterConfiguration(configuration, products) {
  if (!configuration) return configuration;
  const expand = (nodes) => nodes.map((node) => {
    if (node.mode === 'group') return { ...node, children: expand(node.children) };
    if (node.autoAddOptions === false) return node;
    const additions = node.sources.flatMap((source) => [...new Set(products.flatMap((product) => sourceValues(product, source)))]
      .filter((value) => !node.options.some((option) => option.conditions.some((condition) => condition.source === source && condition.values.includes(value))))
      .filter((value) => node.style !== 'range' || (numericFilterValue(value) && (!numericFilterValue(value).unit || numericFilterValue(value).unit === (node.unit || '').toLowerCase())))
      .sort((a, b) => a.localeCompare(b, 'sr-Latn', { numeric: true }))
      .map((value) => ({ id: `auto_${encodeURIComponent(source)}:${encodeURIComponent(value)}`, label: source.startsWith('feature:') ? source.slice(8) : value, visible: true, color: '', image: '', conditions: [{ source, values: [value] }] })));
    return { ...node, options: [...node.options, ...additions] };
  });
  return { ...configuration, filters: expand(configuration.filters) };
}
export function defaultFilterConfiguration(products, definitions = []) {
  const sources = discoverFilterSources(products, definitions).filter((source) => !source.id.startsWith('feature:'));
  const priority = (source) => {
    const label = normalizedFilterText(source.label);
    if (source.id === 'gender') return 0;
    if (source.id === 'brand') return 1;
    if (source.id === 'category') return 2;
    if (/^(stil|style|dizajn)$/.test(label)) return 3;
    if (/^(serija|series)$/.test(label)) return 4;
    if (/^(precnik|diameter|case diameter)\b/.test(label)) return 5;
    if (/^(tip mehanizma|mehanizam|movement( type)?)$/.test(label)) return 6;
    if (/^(staklo|tip stakla|glass|crystal( type)?)$/.test(label)) return 7;
    if (/(boja|color|colour|materijal|material)/.test(label)) return 8;
    return source.id === 'price' ? 10 : 9;
  };
  const filters = sources.sort((a, b) => priority(a) - priority(b) || a.label.localeCompare(b.label, 'sr-Latn')).map(newFilter);
  const bracelet = filters.filter((node) => /(narukvic|kais|strap|bracelet)/.test(normalizedFilterText(node.title)) && ['color', 'material'].includes(node.style));
  if (bracelet.length > 1) {
    const group = { ...bracelet[0], id: filterId(), title: 'Narukvica', mode: 'group', sources: [], options: [], children: [...bracelet].sort((a, b) => Number(a.style === 'color') - Number(b.style === 'color')).map((node, priority) => ({ ...node, priority, title: bracelet.length === 2 ? node.style === 'color' ? 'Boja' : 'Materijal' : node.title })) };
    const index = filters.indexOf(bracelet[0]);
    bracelet.forEach((node) => filters.splice(filters.indexOf(node), 1));
    filters.splice(index, 0, group);
  }
  return { schemaVersion: 1, filters: filters.map((node, index) => ({ ...node, priority: index })) };
}
export function orderedNodes(nodes) { return [...nodes].sort((a, b) => a.priority - b.priority); }
export function filterLeaves(configuration, onlyVisible = true) {
  const visit = (nodes) => orderedNodes(nodes).flatMap((node) => onlyVisible && !node.visible ? [] : node.mode === 'group' ? visit(node.children) : [node]);
  return visit(configuration?.filters || []);
}
export function optionMatches(product, option) {
  return option.conditions.some((condition) => condition.values.some((value) => sourceValues(product, condition.source).includes(value)));
}
export const selectionKey = (node) => `cf_${node.id}`;
export const rangeKey = (node, edge) => `cf_${edge}_${node.id}`;

export function configuredFilterParams(params, configuration, fixedGender) {
  const next = new URLSearchParams(params);
  const permitted = new Set();
  filterLeaves(configuration).forEach((node) => {
    if (fixedGender && node.sources.includes('gender')) return;
    const key = selectionKey(node);
    const options = node.options.filter((option) => option.visible);
    if (node.style === 'range') {
      const minKey = rangeKey(node, 'min'); const maxKey = rangeKey(node, 'max');
      permitted.add(minKey); permitted.add(maxKey);
      const legacySource = node.sources[0];
      const legacyValues = legacySource?.startsWith('spec:') ? next.getAll(`spec_${legacySource.slice(5)}`).map(numericFilterValue).filter(Boolean) : [];
      if (!next.has(minKey) && legacyValues.length) next.set(minKey, Math.min(...legacyValues.map((value) => value.number)));
      if (!next.has(maxKey) && legacyValues.length) next.set(maxKey, Math.max(...legacyValues.map((value) => value.number)));
      if (legacySource === 'price') { if (!next.has(minKey) && next.has('min')) next.set(minKey, next.get('min')); if (!next.has(maxKey) && next.has('max')) next.set(maxKey, next.get('max')); }
      [minKey, maxKey].forEach((rangeParam) => { if (next.has(rangeParam) && (next.get(rangeParam) === '' || !Number.isFinite(Number(next.get(rangeParam))))) next.delete(rangeParam); });
    } else {
      permitted.add(key);
      const selected = new Set(next.getAll(key));
      options.forEach((option) => {
        if (option.conditions.some((condition) => {
          const legacyKey = condition.source.startsWith('spec:') ? `spec_${condition.source.slice(5)}` : condition.source;
          return next.getAll(legacyKey).some((value) => condition.values.includes(value));
        })) selected.add(option.id);
      });
      next.delete(key);
      options.filter((option) => selected.has(option.id)).forEach((option) => next.append(key, option.id));
    }
  });
  const leaves = filterLeaves(configuration);
  const movementTypes = leaves.filter((node) => movementFilterRole(node) === 'type');
  if (movementTypes.length && !movementTypes.some((node) => next.has(selectionKey(node)))) {
    leaves.filter((node) => movementFilterRole(node) === 'model').forEach((node) => {
      next.delete(selectionKey(node)); next.delete(rangeKey(node, 'min')); next.delete(rangeKey(node, 'max'));
    });
  }
  [...new Set(next.keys())].forEach((key) => { if (['brand', 'gender', 'category', 'min', 'max'].includes(key) || key.startsWith('spec_') || (key.startsWith('cf_') && !permitted.has(key))) next.delete(key); });
  return next;
}
export function filterConfiguredProducts(products, params, configuration, { fixedGender, ignoreId } = {}) {
  const nodes = filterLeaves(configuration).filter((node) => node.id !== ignoreId && !(fixedGender && node.sources.includes('gender')));
  const query = params.get('q')?.trim().toLowerCase();
  return products.filter((product) => {
    if (query && !`${product.brand || ''} ${product.name || ''}`.toLowerCase().includes(query)) return false;
    if (fixedGender && !sourceValues(product, 'gender').some((value) => normalizedCatalogGender(value) === normalizedCatalogGender(fixedGender))) return false;
    return nodes.every((node) => {
      if (node.style === 'range') {
        const min = params.get(rangeKey(node, 'min')); const max = params.get(rangeKey(node, 'max'));
        if (min === null && max === null) return true;
        return sourceValues(product, node.sources[0]).some((value) => {
          const number = numericFilterValue(value)?.number;
          return number !== undefined && (min === null || number >= Number(min)) && (max === null || number <= Number(max));
        });
      }
      const ids = params.getAll(selectionKey(node));
      const selected = node.options.filter((option) => option.visible && ids.includes(option.id));
      return !selected.length || (node.match === 'all' ? selected.every((option) => optionMatches(product, option)) : selected.some((option) => optionMatches(product, option)));
    });
  });
}
export function configuredFilterChips(params, configuration) {
  return filterLeaves(configuration).flatMap((node) => {
    if (node.style === 'range') {
      const min = params.get(rangeKey(node, 'min')); const max = params.get(rangeKey(node, 'max'));
      if (min === null && max === null) return [];
      return [{ key: `range:${node.id}`, val: null, label: `${node.title}: ${min === null ? '0' : Number(min).toLocaleString('sr-Latn')}–${max === null ? '∞' : Number(max).toLocaleString('sr-Latn')} ${node.unit}` }];
    }
    return node.options.filter((option) => option.visible && params.getAll(selectionKey(node)).includes(option.id)).map((option) => ({ key: selectionKey(node), val: option.id, label: `${node.title}: ${option.label}` }));
  });
}
export function validateFilterConfiguration(configuration) {
  const errors = [];
  const checkDepth = (nodes, depth = 0) => { if (depth > 4 && nodes.length) errors.push('Najviše pet nivoa grupa je dozvoljeno.'); nodes.forEach((node) => checkDepth(node.children, depth + 1)); };
  checkDepth(configuration.filters);
  allFilterNodes(configuration.filters).forEach((node) => {
    if (!node.title.trim()) errors.push('Unesi naziv svakog filtera.');
    if (node.urlSlug && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(node.urlSlug) || node.urlSlug.length > 80)) errors.push(`${node.title}: naziv u adresi koristi mala slova, brojeve i crtice (do 80 znakova).`);
    node.options.forEach((option) => {
      if (!option.label.trim()) errors.push(`${node.title}: unesi naziv opcije.`);
      if (option.urlSlug && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.urlSlug) || option.urlSlug.length > 80)) errors.push(`${node.title}: naziv opcije u adresi koristi mala slova, brojeve i crtice (do 80 znakova).`);
      if (option.color && !/^#[0-9a-f]{6}$/i.test(option.color)) errors.push(`${node.title}: boja mora biti HEX, npr. #ffffff.`);
      if (option.image && !/^https:\/\//.test(option.image) && !/^\/(?!\/)/.test(option.image)) errors.push(`${node.title}: slika mora koristiti HTTPS ili lokalnu putanju.`);
      if (option.conditions.some((condition) => !condition.values.length)) errors.push(`${node.title}: izaberi vrednosti za svaki uslov opcije.`);
    });
  });
  filterLeaves(configuration, false).forEach((node) => {
    if (!node.title.trim()) errors.push('Unesi naziv svakog filtera.');
    if (node.style !== 'range') return;
    const values = node.options.flatMap((option) => option.conditions.flatMap((condition) => condition.values));
    const numbers = values.map(numericFilterValue);
    const units = new Set(numbers.filter(Boolean).map((number) => number.unit).filter(Boolean));
    if (node.sources.length !== 1 || node.sources[0]?.startsWith('feature:') || !numbers.length || numbers.some((number) => !number) || units.size > 1 || (units.size && node.unit && !units.has(node.unit.toLowerCase())) || node.options.some((option) => option.conditions.some((condition) => condition.source !== node.sources[0]))) errors.push(`${node.title}: slider zahteva jedan numerički izvor i istu jedinicu.`);
  });
  return [...new Set(errors)];
}
function allFilterNodes(nodes) { return nodes.flatMap((node) => [node, ...allFilterNodes(node.children)]); }
