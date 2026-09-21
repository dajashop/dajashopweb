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

export function visibleProductSpecs(specs) {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};

  return Object.fromEntries(
    Object.entries(specs).filter(([key]) => !isInternalCatalogKey(key)),
  );
}

export function visibleProductFeatures(features) {
  if (!Array.isArray(features)) return [];

  return features.filter((feature) => {
    const title = String(feature?.title || '').trim();
    return title && !isInternalCatalogKey(title) && !/^rfid\b/i.test(title);
  });
}
