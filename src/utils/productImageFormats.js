// Both layouts identify paired AVIF/WebP outputs. Unrelated legacy URLs stay unchanged.
const versionFolder = '[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}';
const cleanImageLayout = new RegExp(`/${versionFolder}/${versionFolder}/[^/?#]+\\.webp(?:[?#]|$)`, 'i');
const flatImageLayout = new RegExp(`/([^/?#]+-slika-[1-9]\\d*)/\\1-${versionFolder}-${versionFolder}(?:-thumb)?\\.webp(?:[?#]|$)`, 'i');
export function avifImageUrl(url) {
  return typeof url === 'string' && (/-avif65-webp75-(?:main|thumb)\.webp(?:[?#]|$)/.test(url) || cleanImageLayout.test(url) || flatImageLayout.test(url))
    ? url.replace(/\.webp(?=[?#]|$)/, '.avif') : undefined;
}
export function avifImageSrcSet(srcSet) {
  if (!srcSet) return undefined;
  const entries = srcSet.split(',').map(entry => {
    const [url, descriptor] = entry.trim().split(/\s+/);
    const avif = avifImageUrl(url);
    return avif ? [avif, descriptor].filter(Boolean).join(' ') : null;
  }).filter(Boolean);
  return entries.join(', ') || undefined;
}
// Attach picture before assigning src so supporting browsers request AVIF only.
export function preloadProductImage(img, src, srcSet, sizes) {
  const avif = avifImageSrcSet(srcSet) || avifImageUrl(src);
  let picture;
  if (avif) {
    picture = document.createElement('picture');
    picture.style.display = 'none';
    const source = document.createElement('source');
    source.type = 'image/avif'; source.srcset = avif;
    if (sizes && srcSet) source.sizes = sizes;
    picture.append(source, img); document.body.append(picture);
  }
  if (srcSet) { img.srcset = srcSet; if (sizes) img.sizes = sizes; }
  img.src = src;
  return () => picture?.remove();
}

// The gallery is a full column on phones and one of two columns on desktop.
export const PRODUCT_GALLERY_SIZES = '(max-width: 1023px) calc(100vw - 40px), 56vw';

export function productGallerySrcSet(image) {
  const width = image?.width;
  if (typeof image?.url !== 'string' || !Number.isInteger(width) || width <= 0 || !Array.isArray(image.sources)) return undefined;
  const paired = Boolean(avifImageUrl(image.url));
  const candidates = new Map();
  for (const source of image.sources) {
    if (typeof source?.url === 'string' && Number.isInteger(source.width) && source.width > 0 &&
        source.width < width && source.url !== image.url && Boolean(avifImageUrl(source.url)) === paired) {
      candidates.set(source.width, source.url);
    }
  }
  if (!candidates.size) return undefined;
  candidates.set(width, image.url);
  return [...candidates].sort(([left], [right]) => left - right).map(([size, url]) => url + ' ' + size + 'w').join(', ');
}
