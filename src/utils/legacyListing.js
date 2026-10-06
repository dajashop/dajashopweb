import { normalizeProduct } from '../services/dajaPlatform.js';
import { automaticFilterConfiguration, configuredFilterParams, filterConfiguredProducts, filterLeaves, numericFilterValue, optionMatches, selectionKey, sourceValues } from './filterConfiguration.js';

// Compatibility for the short interval when the web update reaches users
// before the new API routes. Keep the same small HTML/browser response.
const compact = ({ attributes: _attributes, features: _features, ...card }) => ({ ...card, images: (card.images || []).map(image => ({ url: image.url, thumb: image.thumb })) });
export function legacyListing(rawItems, route, savedConfiguration) {
  if (route === 'home') {
    const candidates = rawItems.slice(0,64);
    const slugs = ['casio-mtp-1314pl-8a','daniel-3271','qq-classic-qw12','ga-100-1a1','orient-diver','daniel-klein-dk13965-4'];
    const curated = slugs.flatMap(slug => candidates.filter(item => item.slug === slug));
    return {items:[...curated,...candidates.filter(item => !curated.some(product => product.productId === item.productId))].slice(0,6).map(compact)};
  }
  const request = new URLSearchParams(route.slice(5));
  const department = request.get('department');
  const fixedGender = request.get('fixedGender') || undefined;
  const products = rawItems.map(normalizeProduct).filter(product => (product.department || 'satovi') === department);
  const configuration = automaticFilterConfiguration(savedConfiguration,products);
  if (!configuration) throw new Error('Filteri trenutno nisu dostupni.');
  const params = configuredFilterParams(new URLSearchParams(request.get('params')),configuration,fixedGender);
  const filtered = filterConfiguredProducts(products,params,configuration,{fixedGender});
  const sort = params.get('sort');
  const collator = new Intl.Collator('sr-RS',{sensitivity:'base'});
  filtered.sort((a,b) => sort === 'price-asc' ? a.price-b.price : sort === 'price-desc' ? b.price-a.price : sort === 'name' ? collator.compare(a.name,b.name) : 0);
  const facets = Object.fromEntries(filterLeaves(configuration).map(node => {
    const candidates = filterConfiguredProducts(products,params,configuration,{fixedGender,ignoreId:node.id});
    const options = node.options.filter(option => option.visible);
    const selected = params.getAll(selectionKey(node));
    const selectedOptions = options.filter(option => selected.includes(option.id));
    const values = options.map(option => ({value:option.id,label:option.label,color:option.color,image:option.image,
      count:candidates.filter(product => optionMatches(product,option) && (node.match !== 'all' || selectedOptions.filter(other => other.id !== option.id).every(other => optionMatches(product,other)))).length
    })).filter(value => value.count > 0 || selected.includes(value.value));
    const approved = options.flatMap(option => option.conditions.flatMap(condition => condition.values)).map(numericFilterValue).filter(Boolean);
    const numbers = node.style === 'range' ? [...new Set(candidates.flatMap(product => sourceValues(product,node.sources[0])).map(numericFilterValue).filter(Boolean)
      .filter(value => node.sources[0] === 'price' || approved.some(number => number.number === value.number && number.unit === value.unit)).map(value => value.number))].sort((a,b) => a-b) : [];
    return [node.id,{values,selected,numbers}];
  }));
  const total = filtered.length;
  const page = Math.min(Number(request.get('page')) || 1,Math.max(1,Math.ceil(total/32)));
  const ids = new Set(filtered.slice((page-1)*32,page*32).map(product => product.id));
  const raw = new Map(rawItems.map(item => [item.productId || item.id,item]));
  return {items:filtered.filter(product => ids.has(product.id)).map(product => compact(raw.get(product.id))),total,page,perPage:32,configuration,facets};
}
