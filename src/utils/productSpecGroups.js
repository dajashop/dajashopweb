import { batteryGroups, batteryLabels } from './batteryCatalog.js';
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

const remoteGroups = [
  ['general', 'Opšti podaci', ['model_daljinskog', 'namena_daljinskog', 'vrsta_daljinskog', 'garancija_daljinskog', 'boja_na_fotografiji']],
  ['compatibility', 'Kompatibilnost', ['primena_daljinskog', 'zamenski_modeli', 'uparivanje_daljinskog']],
  ['controls', 'Tasteri i funkcije', ['tasteri_za_aplikacije', 'numericki_tasteri', 'taster_za_meni', 'taster_za_izbor_izvora', 'taster_za_teletekst', 'taster_za_tajmer', 'tastatura_daljinskog', 'ekran_na_daljinskom', 'glasovne_komande', 'funkcija_misa', 'funkcija_ucenja', 'grejanje_klima_uredjaja']],
  ['power', 'Povezivanje i napajanje', ['tip_veze_daljinskog', 'frekvencija_daljinskog', 'tip_koda_daljinskog', 'napajanje_daljinskog', 'usb_punjenje_daljinskog']],
];

const remoteLabels = {
  model_daljinskog: 'Model / oznaka', namena_daljinskog: 'Namena', vrsta_daljinskog: 'Tip daljinskog',
  garancija_daljinskog: 'Garancija', boja_na_fotografiji: 'Boja na fotografiji',
  primena_daljinskog: 'Primena / kompatibilnost', zamenski_modeli: 'Moguće zamene', uparivanje_daljinskog: 'Uparivanje',
  tasteri_za_aplikacije: 'Tasteri za aplikacije', numericki_tasteri: 'Numerički tasteri', taster_za_meni: 'Taster za meni',
  taster_za_izbor_izvora: 'Taster za izbor izvora', taster_za_teletekst: 'Taster za teletekst', taster_za_tajmer: 'Taster za tajmer',
  tastatura_daljinskog: 'Tastatura', ekran_na_daljinskom: 'Ekran na daljinskom', glasovne_komande: 'Glasovne komande',
  funkcija_misa: 'Funkcija miša', funkcija_ucenja: 'Funkcija učenja', grejanje_klima_uredjaja: 'Podrška za grejanje',
  tip_veze_daljinskog: 'Tip veze', frekvencija_daljinskog: 'Frekvencija', tip_koda_daljinskog: 'Tip koda',
  napajanje_daljinskog: 'Napajanje', usb_punjenje_daljinskog: 'USB punjenje',
};

const watchLabels = {
  serija: 'Serija', proizvodjac: 'Proizvođač', proizvo_ac: 'Proizvođač', uzrasna_grupa: 'Uzrasna grupa', garancija: 'Garancija',
  tip_mehanizma: 'Tip mehanizma', mehanizam: 'Mehanizam', rezerva_snage: 'Rezerva snage',
  stil: 'Stil', oblik: 'Oblik', prikaz: 'Prikaz', boja_brojcanika: 'Boja brojčanika', boja_kucista: 'Boja kućišta', luminescencija: 'Luminescencija',
  materijal_kucista: 'Materijal kućišta', precnik_kucista: 'Prečnik kućišta', dimenzije_kucista: 'Dimenzije kućišta', debljina_kucista: 'Debljina kućišta', tezina: 'Težina', staklo: 'Staklo', vodootpornost: 'Vodootpornost',
  materijal_narukvice: 'Materijal narukvice', stil_narukvice: 'Stil narukvice', boja_narukvice: 'Boja narukvice', sirina_narukvice: 'Širina narukvice', duzina_narukvice: 'Dužina narukvice', kopca: 'Kopča',
  datum: 'Datum', dan_u_nedelji: 'Dan u nedelji', hronograf: 'Hronograf', stoperica: 'Štoperica', alarm: 'Alarm', tajmer: 'Tajmer',
  svetsko_vreme: 'Svetsko vreme', dvojno_vreme: 'Dvojno vreme', '12_24_casovni_format': '12/24-časovni format', satni_zvucni_signal: 'Satni zvučni signal', osvetljenje_displeja: 'Osvetljenje displeja',
};

function displayValue(raw, keepNegative = false) {
  if (Array.isArray(raw)) return raw.map(value => displayValue(value, keepNegative)).filter(Boolean).join(', ');
  if (!['string', 'number', 'boolean'].includes(typeof raw)) return '';
  const value = String(raw).trim();
  if (keepNegative && /^(ne|false|no)$/i.test(value)) return 'Ne';
  if (!value || /^(ne|false|no|n\/a|null|undefined|[-–—]|bez luminescencije)$/i.test(value)) return '';
  return /^(da|true)$/i.test(value) ? 'Da' : value;
}

// Presentation only: keep negative answers available in the admin editor.
export function productSpecGroups(product) {
  const department = product?.department?.slug || product?.department;
  const eyewear = isEyewearDepartment(department);
  const watch = !department || department === 'satovi';
  const remote = department === 'daljinski';
  const battery = department === 'baterije';
  const layout = eyewear ? eyewearGroups : watch ? watchGroups : remote ? remoteGroups : battery ? batteryGroups : [];
  const labels = eyewear ? eyewearSpecLabels : watch ? watchLabels : remote ? remoteLabels : battery ? batteryLabels : {};
  const groups = layout.map(([id, title, keys]) => ({ id, title, keys, entries: [] }));
  const other = { id: 'other', title: layout.length ? 'Ostali detalji' : 'Detalji proizvoda', entries: [] };

  for (const [key, raw] of Object.entries(visibleProductSpecs(product?.specs, department))) {
    const normalized = normalizeKey(key);
    const value = displayValue(raw, remote || battery);
    if (!value) continue;
    const fallback = formatProductSpecLabel(key, department).replace(/-/g, ' ');
    const label = labels[normalized] || fallback.charAt(0).toLocaleUpperCase('sr-Latn') + fallback.slice(1);
    const group = groups.find((item) => item.keys.includes(normalized)) || other;
    group.entries.push({ key, normalized, label, value: eyewear ? eyewearDisplayValue(normalized, value) : value });
  }

  groups.forEach((group) => group.entries.sort((a, b) => group.keys.indexOf(a.normalized) - group.keys.indexOf(b.normalized)));
  return [...groups, other].filter((group) => group.entries.length);
}
