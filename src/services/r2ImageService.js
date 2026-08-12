import { mediaApi } from './dajaPlatform';
import {
  generateSeoFilename,
  generateVariants,
} from '../utils/imageProcessing';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const [, base64] = result.split(',');
      if (!base64) {
        reject(new Error('Neuspesna base64 konverzija.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Neuspesno citanje blob-a.'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadProductImage(slug, file, index = 0) {
  const { thumb, original } = await generateVariants(file);
  const thumbBase64 = await blobToBase64(thumb);
  const originalBase64 = await blobToBase64(original);

  const result = await mediaApi.uploadProductImages({
    slug,
    index,
    thumbBase64,
    originalBase64,
    thumbFilename: generateSeoFilename(slug, index, 'thumb'),
    originalFilename: generateSeoFilename(slug, index, 'original'),
  });

  return {
    url: result.original || result.url || result.mainImageUrl,
    thumb: result.thumb || result.thumbnailUrl || result.url,
    path: result.path || result.storagePath,
  };
}

export async function uploadProductImages(slug, files, onProgress) {
  const list = Array.from(files || []);
  const total = list.length;
  const uploaded = [];

  for (let i = 0; i < total; i += 1) {
    const item = await uploadProductImage(slug, list[i], i);
    uploaded.push(item);
    onProgress?.({ file: list[i], progress: Math.round(((i + 1) / total) * 100) });
  }

  return uploaded;
}

export async function deleteProductImages(slug) {
  return mediaApi.deleteProductImages(slug);
}
