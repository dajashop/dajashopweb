import { formatProductSpecLabel, visibleProductSpecs } from './catalogPresentation.js';
import { eyewearDisplayValue, eyewearSpecLabels, isEyewearDepartment } from './eyewearCatalog.js';

const normalizeKey = (key) => String(key).trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'dj').replace(/[\s/-]+/g, '_');

const watchGroups = [
  ['general', 'Opšti podaci', ['serija', 'proizvodjac', 'proizvo_ac', 'uzrasna_grupa', 'garancija']],
  ['functions', 'Funkcije', ['datum', 'dan_u_nedelji', 'hronograf', 'stoperica', 'alarm', 'tajmer', 'svetsko_vreme', 'dvojno_vreme', '12_24_casovni_format', 'satni_zvucni_signal', 'osvetljenje_displeja']],
  ['design', 'Dizajn i brojčanik', ['stil', 'oblik', 'prikaz', 'boja_brojcanika', 'boja_kucista', 'luminescencija']],
  ['case', 'Kućište i otpornost', ['materijal_kucista', 'precnik_kucista', 'dimenzije_kucista', 'debljina_kucista', 'tezina', 'staklo', 'vodootpornost']],
  ['strap', 'Narukvica', ['materijal_narukvice', 'stil_narukvice', 'boja_narukvice', 'sirina_narukvice', 'duzina_narukvice', 'kopca']],
  ['mechanism', 'Mehanizam', ['tip_mehanizma', 'mehanizam', 'rezerva_snage']],
];

const eyewearGroups = [
  ['general', 'Opšti podaci', ['uzrasna_grupa_naocara', 'pakovanje_naocara', 'milano_sifra']],
  ['frame', 'Okvir', ['oblik_okvira', 'materijal_okvira', 'boja_okvira', 'konstrukcija_okvira', 'zavrsna_obrada_okvira']],
  ['lenses', 'Sočiva i zaštita', ['materijal_sociva', 'boja_sociva', 'kategorija_filtera_sociva', 'polarizacija', 'uv400_zastita', 'ogledalska_sociva', 'gradijentna_sociva']],
  ['dimensions', 'Dimenzije', ['sirina_sociva', 'sirina_mosta', 'duzina_drske']],
];

const watchLabels = {
  serija: 'Serija', proizvodjac: 'Proizvođač', proizvo_ac: 'Proizvođač', uzrasna_grupa: 'Uzrasna grupa', garancija: 'Garancija',
  tip_mehanizma: 'Tip mehanizma', mehanizam: 'Mehanizam', rezerva_snage: 'Rezerva snage',
  stil: 'Stil', oblik: 'Oblik', prikaz: 'Prikaz', boja_brojcanika: 'Boja brojčanika', boja_kucista: 'Boja kućišta', luminescencija: 'Luminescencija',
  materijal_kucista: 'Materijal kućišta', precnik_kucista: 'Prečnik kućišta', dimenzije_kucista: 'Dimenzije kućišta', debljina_kucista: 'Debljina kućišta', tezina: 'Težina', staklo: 'Staklo', vodootpornost: 'Vodootpornost',
  materijal_narukvice: 'Materijal narukvice', stil_narukvice: 'Stil narukvice', boja_narukvice: 'Boja narukvice', sirina_narukvice: 'Širina narukvice', duzina_narukvice: 'Dužina narukvice', kopca: 'Kopča',
  datum: 'Datum', dan_u_nedelji: 'Dan u nedelji', hronograf: 'Hronograf', stoperica: 'Štoperica', alarm: 'Alarm', tajmer: 'Tajmer',
  svetsko_vreme: 'Svetsko vreme', dvojno_vreme: 'Dvojno vreme', '12_24_casovni_format': '12/24-časovni format', satni_zvucni_signal: 'Satni zvučni signal', osvetljenje_displeja: 'Osvetljenje displeja',
};

function displayValue(raw) {
  if (Array.isArray(raw)) return raw.map(displayValue).filter(Boolean).join(', ');
  if (!['string', 'number', 'boolean'].includes(typeof raw)) return '';
  const value = String(raw).trim();
  if (!value || /^(ne|false|no|n\/a|null|undefined|[-–—]|bez luminescencije)$/i.test(value)) return '';
  return /^(da|true)$/i.test(value) ? 'Da' : value;
}

// Presentation only: keep negative answers available in the admin editor.
export function productSpecGroups(product) {
  const department = product?.department?.slug || product?.department;
  const eyewear = isEyewearDepartment(department);
  const watch = !department || department === 'satovi';
  const layout = eyewear ? eyewearGroups : watch ? watchGroups : [];
  const labels = eyewear ? eyewearSpecLabels : watch ? watchLabels : {};
  const groups = layout.map(([id, title, keys]) => ({ id, title, keys, entries: [] }));
  const other = { id: 'other', title: layout.length ? 'Ostali detalji' : 'Detalji proizvoda', entries: [] };

  for (const [key, raw] of Object.entries(visibleProductSpecs(product?.specs, department))) {
    const normalized = normalizeKey(key);
    const value = displayValue(raw);
    if (!value) continue;
    const fallback = formatProductSpecLabel(key, department).replace(/-/g, ' ');
    const label = labels[normalized] || fallback.charAt(0).toLocaleUpperCase('sr-Latn') + fallback.slice(1);
    const group = groups.find((item) => item.keys.includes(normalized)) || other;
    group.entries.push({ key, normalized, label, value: eyewear ? eyewearDisplayValue(normalized, value) : value });
  }

  groups.forEach((group) => group.entries.sort((a, b) => group.keys.indexOf(a.normalized) - group.keys.indexOf(b.normalized)));
  return [...groups, other].filter((group) => group.entries.length);
}
