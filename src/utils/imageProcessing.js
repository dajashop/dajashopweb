function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'dj')
    .replace(/ž/g, 'z')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/š/g, 's')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Neuspesno citanje fajla.'));
    reader.readAsDataURL(file);
  });
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fallback na HTMLImageElement ispod
    }
  }

  const dataUrl = await fileToDataURL(file);

  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Neuspesno ucitavanje slike.'));
    img.src = dataUrl;
  });
}

function calculateTargetSize(width, height, maxSize) {
  if (!width || !height) {
    return { width: maxSize, height: maxSize };
  }

  const ratio = Math.min(1, maxSize / width, maxSize / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function resizeToWebP(file, maxSize, quality) {
  const source = await loadImageSource(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const target = calculateTargetSize(sourceWidth, sourceHeight, maxSize);

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context nije dostupan.');

  ctx.drawImage(source, 0, 0, target.width, target.height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('WebP konverzija nije uspela.'));
          return;
        }
        resolve(result);
      },
      'image/webp',
      quality,
    );
  });

  if (typeof source.close === 'function') {
    source.close();
  }

  return blob;
}

export async function generateVariants(file) {
  const thumb = await resizeToWebP(file, 256, 0.75);
  const original = await resizeToWebP(file, 2400, 0.85);
  return { thumb, original };
}

export function generateSeoFilename(slug, index, variant) {
  const safeSlug = slugify(slug) || 'product';
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) + 1 : 1;
  const safeVariant = variant === 'thumb' ? 'thumb' : 'original';
  return `${safeSlug}-${safeIndex}-${safeVariant}.webp`;
}
