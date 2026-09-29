const fold = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/đ/g, 'dj');

const compact = (value) => fold(value).replace(/[^\p{L}\p{N}]/gu, '');

function bigramSimilarity(left, right) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }
  let matches = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = pairs.get(pair) || 0;
    if (count > 0) {
      matches += 1;
      pairs.set(pair, count - 1);
    }
  }
  return (2 * matches) / (left.length + right.length - 2);
}

function modelCodes(product) {
  const words = String(product.name || '').match(/[\p{L}\p{N}][\p{L}\p{N}._/-]*\d[\p{L}\p{N}._/-]*/gu) || [];
  return [product.sku, product.mpn, ...words]
    .map(compact)
    .filter((code) => code.length >= 5);
}

export function findSimilarProducts(name, products, limit = 5) {
  const query = compact(name);
  if (query.length < 4 || !Array.isArray(products)) return [];
  const queryHasDigit = /\d/.test(query);
  const matches = [];

  for (const product of products) {
    if (!product?.id || !product?.name) continue;
    const candidate = compact(product.name);
    if (!candidate) continue;
    const exact = candidate === query;
    const codes = queryHasDigit && query.length >= 5 ? modelCodes(product) : [];
    const sameModel = codes.includes(query);
    let score = exact ? 1 : 0;
    if (sameModel) score = Math.max(score, 0.99);
    if (queryHasDigit && query.length >= 5 && candidate.includes(query)) score = Math.max(score, 0.97);
    if (!exact && Math.min(query.length, candidate.length) / Math.max(query.length, candidate.length) >= 0.55) {
      score = Math.max(score, bigramSimilarity(query, candidate));
    }
    if (queryHasDigit && query.length >= 5) {
      for (const code of codes) {
        const similarity = bigramSimilarity(query, code);
        if (similarity >= 0.65) score = Math.max(score, similarity * 0.96);
      }
    }
    if (score >= 0.7) matches.push({ product, exact, sameModel, score });
  }

  return matches
    .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name, 'sr-RS'))
    .slice(0, limit);
}
