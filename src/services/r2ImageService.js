import { app } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  generateSeoFilename,
  generateVariants,
} from '../utils/imageProcessing';

const functions = getFunctions(app, 'europe-west3');

const uploadProductImagesToR2Fn = httpsCallable(
  functions,
  'uploadProductImagesToR2',
);
const deleteProductImagesFromR2Fn = httpsCallable(
  functions,
  'deleteProductImagesFromR2',
);

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

  const result = await uploadProductImagesToR2Fn({
    slug,
    index,
    thumbBase64,
    originalBase64,
    thumbFilename: generateSeoFilename(slug, index, 'thumb'),
    originalFilename: generateSeoFilename(slug, index, 'original'),
  });

  return {
    url: result.data.original,
    thumb: result.data.thumb,
    path: result.data.path,
  };
}

export async function uploadProductImages(slug, files, onProgress) {
  const list = Array.from(files || []);
  const total = list.length;
  const uploaded = [];

  for (let i = 0; i < total; i += 1) {
    const file = list[i];
    const item = await uploadProductImage(slug, file, i);
    uploaded.push(item);

    const progress = Math.round(((i + 1) / total) * 100);
    onProgress?.({ file, progress });
  }

  return uploaded;
}

export async function deleteProductImages(slug) {
  await deleteProductImagesFromR2Fn({ slug });
}
