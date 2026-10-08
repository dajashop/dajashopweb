import { descriptionText, metaDescription } from '../components/description.js';

const normalizeKey = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_-]+/g, '_');
const watchSpecs = [
  ['tip_mehanizma', 'Mehanizam'], ['staklo', 'Staklo'],
  ['materijal_narukvice', 'Narukvica'], ['vodootpornost', 'Vodootpornost'],
  ['prikaz', 'Prikaz'], ['boja_brojcanika', 'Boja brojčanika'],
  ['precnik_kucista', 'Prečnik kućišta'], ['materijal_kucista', 'Kućište'],
  ['luminescencija', 'Luminescencija'], ['hronograf', 'Hronograf'],
  ['datum', 'Datum'], ['dan_u_nedelji', 'Dan u nedelji'],
  ['alarm', 'Alarm'], ['stoperica', 'Štoperica'], ['tajmer', 'Tajmer'],
  ['svetsko_vreme', 'Svetsko vreme'], ['dvojno_vreme', 'Dvojno vreme'],
  ['osvetljenje_displeja', 'Osvetljenje displeja'],
];
const eyewearSpecs = [
  ['oblik_okvira', 'Oblik okvira'], ['materijal_okvira', 'Materijal okvira'],
  ['polarizacija', 'Polarizacija'], ['uv400_zastita', 'UV400 zaštita'],
  ['boja_okvira', 'Boja okvira'], ['boja_sociva', 'Boja sočiva'],
];

// Use known useful facts in a stable order, never arbitrary attribute keys.
export function productSeoDescription(product = {}) {
  const explicit = metaDescription(product.seo?.metaDescription);
  const description = metaDescription(product.description, true);
  if (explicit || description) return explicit || description;

  const title = [product.brand, product.name].map(value => descriptionText(value || '')).filter(Boolean).join(' ') || 'Proizvod';
  let text = `${title.replace(/[.!?]+$/, '')}.`;
  const specs = new Map(Object.entries(product.specs || {}).map(([key, value]) => [normalizeKey(key), value]));
  let count = 0;
  for (const [key, label] of product.department === 'naocare' ? eyewearSpecs : watchSpecs) {
    const raw = specs.get(key);
    if (!['string', 'number', 'boolean'].includes(typeof raw)) continue;
    const value = descriptionText(String(raw)).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (!value || /^(ne|false|0|n\/a|-|bez luminescencije)$/i.test(value)) continue;
    const fact = /^(da|true)$/i.test(value) ? label : `${label}: ${value}`;
    const candidate = `${text} ${fact.replace(/[.!?]+$/, '')}.`;
    if (candidate.length > 160) continue;
    text = candidate;
    if (++count === 4) break;
  }
  if (!count) text += ' Pogledajte detalje proizvoda u DajaShop prodavnici.';
  return metaDescription(text);
}
