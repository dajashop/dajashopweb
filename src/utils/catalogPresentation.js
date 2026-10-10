import { eyewearSpecLabels, isEyewearDepartment, isEyewearSpecKey } from './eyewearCatalog.js';

const INTERNAL_CATALOG_KEYS = new Set([
  'additional_barcodes',
  '_additionalbarcodes',
  'additionalbarcodes',
  'rfid_piece_placements',
  '_rfidpieceplacements',
  'rfidpieceplacements',
]);

export function isInternalCatalogKey(key) {
  const normalizedKey = String(key || '').trim().toLowerCase();
  return normalizedKey.startsWith('_') || INTERNAL_CATALOG_KEYS.has(normalizedKey);
}

export function visibleProductSpecs(specs, department) {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};

  return Object.fromEntries(
    Object.entries(specs).filter(([key]) =>
      !isInternalCatalogKey(key) && (!isEyewearDepartment(department) || isEyewearSpecKey(key)),
    ),
  );
}

export function formatProductSpecLabel(key, department) {
  const normalizedKey = String(key).replace(/-/g, '_');
  if (isEyewearDepartment(department) && eyewearSpecLabels[normalizedKey]) return eyewearSpecLabels[normalizedKey];
  return String(key || '')
    .trim()
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function visibleProductFeatures(features) {
  if (!Array.isArray(features)) return [];

  return features.filter((feature) => {
    const title = String(feature?.title || '').trim();
    return title && !isInternalCatalogKey(title) && !/^rfid\b/i.test(title);
  });
}
