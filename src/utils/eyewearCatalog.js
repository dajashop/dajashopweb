export const eyewearModel = (name) => String(name || '').toUpperCase()
  .match(/(?:^|[^A-Z0-9])([A-Z]{0,8}[0-9]{3,}[A-Z]?)(?=[\s-]|$)/)?.[1] || '';

export const eyewearDimensions = ['sirina_sociva', 'sirina_mosta', 'duzina_drske'];
export const eyewearChoices = ['polarizacija', 'uv400_zastita', 'ogledalska_sociva', 'gradijentna_sociva'];

export const eyewearSpecLabels = {
  oblik_okvira: 'Oblik okvira', materijal_okvira: 'Materijal okvira', boja_okvira: 'Boja okvira',
  konstrukcija_okvira: 'Konstrukcija okvira', zavrsna_obrada_okvira: 'Završna obrada okvira',
  boja_sociva: 'Boja sočiva', polarizacija: 'Polarizacija', uv400_zastita: 'UV400 zaštita',
  ogledalska_sociva: 'Ogledalska sočiva', gradijentna_sociva: 'Gradijentna sočiva',
  materijal_sociva: 'Materijal sočiva', kategorija_filtera_sociva: 'Kategorija filtera sočiva',
  sirina_sociva: 'Širina sočiva', sirina_mosta: 'Širina mosta', duzina_drske: 'Dužina drške',
  uzrasna_grupa_naocara: 'Uzrasna grupa', pakovanje_naocara: 'Pakovanje', milano_sifra: 'Milano šifra',
};

export const isEyewearSpecKey = (key) => Object.hasOwn(
  eyewearSpecLabels,
  String(key || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_'),
);

export const isEyewearDepartment = (department) =>
  (typeof department === 'object' ? department?.slug : department) === 'naocare';

export function eyewearDisplayValue(key, value) {
  return eyewearDimensions.includes(key.replace(/-/g, '_')) && /^\d+(?:[.,]\d+)?$/.test(String(value).trim()) ? `${value} mm` : value;
}

export function eyewearValueError(slug, value) {
  const key = slug.replace(/-/g, '_');
  if (!value.trim()) return '';
  if (eyewearDimensions.includes(key) && !/^\d+(?:[.,]\d+)?(?:\s*mm)?$/i.test(value.trim())) return 'Unesi dimenziju kao broj u milimetrima.';
  if (eyewearDimensions.includes(key) && Number(value.replace(/mm/gi, '').trim().replace(',', '.')) <= 0) return 'Dimenzija mora biti veća od nule.';
  if (eyewearChoices.includes(key) && !['Da', 'Ne'].includes(value.trim())) return 'Izaberi Da ili Ne; ostavi prazno ako podatak nije potvrđen.';
  if (key === 'kategorija_filtera_sociva' && !/^[0-4]$/.test(value.trim())) return 'Kategorija filtera mora biti 0, 1, 2, 3 ili 4.';
  return '';
}

export function missingEyewearFields(form) {
  const specs = form.specs || {};
  const read = (key) => Object.entries(specs).find(([name]) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-\s]+/g, '_') === key)?.[1];
  return [
    ['Brend', form.brand], ['Fotografija', form.images?.length], ['Pol', form.gender],
    ['Oznaka modela za grupisanje', eyewearModel(form.name)],
    ['Oblik okvira', read('oblik_okvira')], ['Materijal okvira', read('materijal_okvira')],
    ['Boja okvira', read('boja_okvira')], ['Boja sočiva', read('boja_sociva')],
    ['Polarizacija', read('polarizacija')], ['UV400 zaštita', read('uv400_zastita')],
    ['Ogledalska sočiva', read('ogledalska_sociva')],
    ['Širina sočiva', read('sirina_sociva')], ['Širina mosta', read('sirina_mosta')], ['Dužina drške', read('duzina_drske')],
  ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
}
