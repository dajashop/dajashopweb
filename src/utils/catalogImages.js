export const CATALOG_IMAGE_SIZES = 'auto, (max-width: 379px) calc(100vw - 24px), (max-width: 640px) calc((100vw - 36px) / 2), 320px';
export function catalogImageSrcSet(image) {
  const widths = new Map();
  for (const source of image?.sources || []) {
    if (typeof source.url === 'string' && Number.isFinite(source.width) && source.width > 0 && source.width <= 768) widths.set(source.width, source.url);
  }
  return [...widths].sort(([a], [b]) => a - b).map(([width, url]) => `${url} ${width}w`).join(', ') || undefined;
}
