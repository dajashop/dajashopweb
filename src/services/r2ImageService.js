import { mediaApi, mediaProcessingApi } from './dajaPlatform';
async function checksumSha256(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

export async function uploadProductImage(slug, file, index = 0, options = {}) {
  if (!slug) throw new Error('Slug proizvoda je obavezan za upload slike.');
  if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('Slika mora biti manja od 25 MiB.');
  const createUpload = async () => mediaApi.createUpload({
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      checksumSha256: await checksumSha256(file),
      originalFilename: file.name || 'product-image',
      productSlug: slug,
      imageIndex: index + 1,
    });
  let upload;
  if (options.mediaId) {
    try { upload = await mediaApi.resumeUpload(options.mediaId); }
    catch (error) {
      if (error.status !== 404) throw error;
      await options.onMediaId?.(null);
      upload = await createUpload();
    }
  } else upload = await createUpload();
  const mediaId = upload.mediaId || upload.id || options.mediaId;
  if (!mediaId) throw new Error('API nije vratio ID slike.');
  await options.onMediaId?.(mediaId);
  if (upload.status === 'ready') {
    const url = upload.mainImageUrl || upload.publicUrl || '';
    return { mediaId, url, thumb: upload.thumbnailUrl || url };
  }
  const uploadUrl = upload.uploadUrl || upload.url;
  if (!uploadUrl || !mediaId) throw new Error('API nije vratio R2 upload podatke.');
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    await mediaProcessingApi.reportUploadFailure(mediaId).catch(() => {});
    throw new Error(`R2 upload nije uspeo (${response.status}).`);
  }
  // Completion is idempotent on the API. Retry the same media ID when a
  // response is lost or the bounded image queue is temporarily full.
  let completed;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      completed = await mediaApi.completeUpload(mediaId);
      break;
    } catch (error) {
      if (attempt === 2 || (error.status && ![429, 502, 503, 504].includes(error.status))) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(15_000, error.retryAfterMs || 3000)));
    }
  }
  const url = completed.mainImageUrl || completed.publicUrl || upload.publicUrl || '';
  return { mediaId, url, thumb: completed.thumbnailUrl || upload.thumbnailUrl || url };
}

export async function uploadProductImages(slug, files, onProgress, startIndex = 0) {
  const list = Array.from(files || []);
  const total = list.length;
  const uploaded = [];

  try {
    for (let i = 0; i < total; i += 1) {
      const item = await uploadProductImage(slug, list[i], startIndex + i);
      uploaded.push(item);
      onProgress?.({ file: list[i], progress: Math.round(((i + 1) / total) * 100) });
    }
  } catch (error) {
    await Promise.all(
      uploaded.map((item) =>
        mediaApi.discardUpload(item.mediaId).catch((cleanupError) =>
          console.error('Brisanje delimično otpremljene R2 slike nije uspelo:', cleanupError),
        ),
      ),
    );
    throw error;
  }

  return uploaded;
}

export async function deleteProductImages() {
  throw new Error('Slike se uklanjaju preko product-media veze.');
}
