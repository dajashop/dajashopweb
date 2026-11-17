import places from './serbiaPostalCodes.json';
// GeoNames RS postal export, retrieved 2026-11-17; CC BY 4.0.
// https://download.geonames.org/export/zip/RS.zip
const cyrillic = 'абвгдђежзијклљмнњопрстћуфхцчџш';
const latin = ['a','b','v','g','d','dj','e','z','z','i','j','k','l','lj','m','n','nj','o','p','r','s','t','c','u','f','h','c','c','dz','s'];
export function normalizePostalCity(value) {
 return String(value || '').toLowerCase().replace(/[а-яђјљњћџ]/g, c => latin[cyrillic.indexOf(c)] || c).replace(/đ/g,'dj').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
const index = new Map();
for (const [name, code] of places) {
 const key = normalizePostalCity(name);
 if (!index.has(key)) index.set(key, new Set());
 index.get(key).add(code);
}
export function postalCodeForCity(city) {
 const codes = index.get(normalizePostalCity(city));
 return codes?.size === 1 ? [...codes][0] : '';
}
