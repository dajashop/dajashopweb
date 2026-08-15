import { mediaApi } from './dajaPlatform';
async function checksumSha256(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

export async function uploadProductImage(_slug, file, _index = 0) {
  const upload = await mediaApi.createUpload({
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    checksumSha256: await checksumSha256(file),
    originalFilename: file.name || 'product-image',
  });
  const uploadUrl = upload.uploadUrl || upload.url;
  const mediaId = upload.mediaId || upload.id;
  if (!uploadUrl || !mediaId) throw new Error('API nije vratio R2 upload podatke.');
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!response.ok) throw new Error(`R2 upload nije uspeo (${response.status}).`);
  await mediaApi.completeUpload(mediaId);
  return { mediaId, url: upload.publicUrl || '', thumb: upload.thumbnailUrl || upload.publicUrl || '' };
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

export async function deleteProductImages() {
  throw new Error('Slike se uklanjaju preko product-media veze.');
}
