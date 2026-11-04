import { adminCatalogApi, mediaApi } from './dajaPlatform';
import { uploadProductImage } from './r2ImageService';
import { resizeToWebP, generateSeoFilename } from '../utils/imageProcessing';
import { listMediaUploadJobs, listAllMediaUploadJobs, getMediaUploadJob, saveMediaUploadJob, saveMediaUploadJobs, removeMediaUploadJob } from './mediaUploadQueueStorage';

// The queue belongs to the admin session, not the product modal. Files and the
// saved product destination are durable before a modal may close.
const queues = new Map();
const listeners = new Set();
let running = false;
let owner = null;
const emit = () => { listeners.forEach(fn => fn()); };
const mediaChanged = () => window.dispatchEvent(new Event('daja:media-status-changed'));
const persist = job => saveMediaUploadJob({ ...job, preview: undefined });
const release = job => { if (job.preview) URL.revokeObjectURL(job.preview); };
const withJobLock = (id, work) => navigator.locks
  ? navigator.locks.request(`daja-image-job:${id}`, work) : work();
export const subscribeImageQueues = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function imageQueue(scope) {
  if (!queues.has(scope)) queues.set(scope, { scope, jobs: [], hydrated: false, error: '', saving: false });
  return queues.get(scope);
}
export function backgroundImageJobs(ownerId) {
  return [...queues.values()].flatMap(q => q.jobs).filter(job => job.targetProductId && job.scope.startsWith(`user:${ownerId}:`));
}
async function restoreQueue(scope, saved) {
  const q = imageQueue(scope);
  if (q.hydrated) return q;
  q.jobs = saved.map(job => ({ ...job, published: false,
    status: job.status === 'ready' ? 'ready' : job.status === 'failed' ? 'failed' : job.status === 'attaching' && job.image ? 'ready' : 'queued',
    preview: job.file ? URL.createObjectURL(job.file) : null }));
  q.hydrated = true;
  emit(); void pump();
  return q;
}
export async function loadImageQueue(scope) {
  const q = imageQueue(scope);
  if (!q.loading) q.loading = listMediaUploadJobs(scope).then(saved => restoreQueue(scope, saved))
    .catch(error => { q.error = error.message; q.loading = null; emit(); throw error; });
  return q.loading;
}
export async function resumeBackgroundImages(ownerId) {
  owner = String(ownerId);
  const saved = await listAllMediaUploadJobs();
  const scopes = new Set(saved.filter(job => job.targetProductId && job.scope.startsWith(`user:${owner}:`)).map(job => job.scope));
  for (const scope of scopes) await restoreQueue(scope, saved.filter(job => job.scope === scope));
  void pump();
}
export function pauseBackgroundImages() { owner = null; }
export async function enqueueImages(scope, entries, meta) {
  const q = imageQueue(scope);
  if (!q.hydrated || q.saving || q.persisting) throw new Error('Sačekajte da se proveri sačuvani red slika.');
  const position = Math.max(meta.imageCount, ...q.jobs.map(job => job.position + 1));
  const added = entries.map((entry, i) => ({ ...entry, ...meta, id: crypto.randomUUID(), scope,
    position: position + i, status: 'queued', altText: '', error: null,
    preview: entry.file ? URL.createObjectURL(entry.file) : null }));
  // No upload starts until the browser has safely stored every selected file.
  q.persisting = true; emit();
  try { await saveMediaUploadJobs(added); q.jobs.push(...added); q.error = ''; }
  catch (error) { added.forEach(release); q.error = error.message; throw error; }
  finally { q.persisting = false; emit(); }
  void pump();
}
async function upload(job) {
  if (job.file) {
    let file = job.file;
    if (job.department === 'naocare') {
      const blob = await resizeToWebP(file, 2400, 0.85, { square: true });
      file = new File([blob], generateSeoFilename(job.slug, job.position, 'original'), { type: 'image/webp' });
    }
    return uploadProductImage(job.slug, file, job.position, {
      mediaId: job.mediaId,
      onMediaId: async mediaId => { job.mediaId = mediaId; await persist(job); },
    });
  }
  let asset;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      asset = await mediaApi.registerExternal(job.sourceUrl, { productSlug: job.slug, imageIndex: job.position + 1, clientRequestId: job.id });
      break;
    } catch (error) {
      if (attempt === 3 || ![429, 502, 503, 504].includes(error.status)) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(60_000, Math.max(1000, error.retryAfterMs || 3000))));
    }
  }
  const image = { mediaId: asset.id || asset.mediaId, url: asset.mainImageUrl || asset.publicUrl || asset.public_url,
    thumb: asset.thumbnailUrl || asset.thumbnail_url || asset.publicUrl || asset.public_url };
  if (!image.mediaId || !image.url) throw new Error('Server nije vratio podatke slike.');
  return image;
}
async function pump() {
  if (running || !owner || !navigator.onLine) return;
  running = true;
  try {
    while (owner && navigator.onLine) {
      let selected;
      for (const q of queues.values()) {
        if (!q.scope.startsWith(`user:${owner}:`) || q.saving || q.error) continue;
        // Attach in original order. A failed first image reserves its place.
        const attach = q.jobs.find(job => job.targetProductId && job.operation !== 'remove');
        const job = q.jobs.find(job => job.status === 'queued' && job.operation === 'remove')
          || (attach?.status === 'ready' ? attach : q.jobs.find(job => job.status === 'queued'));
        if (job) { selected = { q, job }; break; }
      }
      if (!selected) break;
      const { q, job } = selected;
      try {
        await withJobLock(job.id, async () => {
          if (q.saving || !owner || !job.scope.startsWith(`user:${owner}:`)) return;
          // Another tab may have completed this job while this tab waited.
          const destinationBeforeRead = `${job.targetProductId}:${job.targetPosition}`;
          const saved = await getMediaUploadJob(job.id);
          if (!saved) { q.jobs = q.jobs.filter(item => item !== job); release(job); return; }
          if (q.saving || destinationBeforeRead !== `${job.targetProductId}:${job.targetPosition}`) return;
          Object.assign(job, saved, { preview: job.preview, published: job.published });
          if (['failed', 'offline'].includes(job.status)) return;
          if (job.status === 'attaching' && job.image) job.status = 'ready';
          if (job.operation === 'remove') {
            if (job.mediaId || job.image?.mediaId) await mediaApi.discardUpload(job.mediaId || job.image.mediaId).catch(error => {
              if (![404, 410].includes(error.status)) throw error;
          });
          await removeMediaUploadJob(job.id); q.jobs = q.jobs.filter(item => item !== job); release(job);
          if (job.targetProductId) {
            for (const later of q.jobs.filter(item => item.targetProductId === job.targetProductId && item.targetPosition > job.targetPosition)) {
              later.targetPosition -= 1; await persist(later);
            }
          }
        } else {
          if (job.status !== 'ready') {
            job.status = 'uploading'; emit(); await persist(job);
            job.image = await upload(job); job.status = 'ready'; job.error = null;
            await persist(job);
          }
          if (job.targetProductId && !q.saving && owner && job.scope.startsWith(`user:${owner}:`)) {
            // Another failed/unfinished slot must not be bypassed.
            if (q.jobs.find(item => item.targetProductId && item.operation !== 'remove') === job) {
              job.status = 'attaching'; emit();
              await mediaApi.attachToProduct(job.targetProductId, job.image.mediaId, {
                position: job.targetPosition, isPrimary: job.targetPosition === 0, altText: job.altText || null,
              });
              await removeMediaUploadJob(job.id);
              q.jobs = q.jobs.filter(item => item !== job); release(job);
              // Refresh visible cards without turning a refresh failure into
              // another upload/attach attempt.
              await adminCatalogApi.getProduct(job.targetProductId).then(product => {
                window.dispatchEvent(new CustomEvent('daja:products-changed', { detail: { type: 'upsert', product } }));
              }).catch(() => {});
            }
          }
        }
        });
      } catch (error) {
        job.status = !navigator.onLine || error instanceof TypeError ? 'offline' : 'failed';
        job.error = error.message || 'Otpremanje nije uspelo.';
        await persist(job).catch(storageError => { q.error = storageError.message; });
      }
      emit(); mediaChanged();
    }
  } finally { running = false; }
}
export function beginImageQueueSave(scope) {
  const q = imageQueue(scope);
  if (!q.hydrated || q.persisting || q.error) throw new Error(q.error || 'Sačekajte da se proveri sačuvani red slika.');
  q.saving = true; emit();
}
export function cancelImageQueueSave(scope) { imageQueue(scope).saving = false; emit(); void pump(); }
export async function commitImageQueue(scope, productId, savedImages, name) {
  const q = imageQueue(scope);
  const linked = new Set(savedImages.map(image => image.mediaId).filter(Boolean));
  const remaining = q.jobs.filter(job => !linked.has(job.image?.mediaId));
  const targetScope = scope.replace(/:(?:new-product-draft|product:[^:]+)$/, `:product:${productId}`);
  const destination = targetScope === scope ? q : imageQueue(targetScope);
  remaining.forEach((job, index) => Object.assign(job, { scope: targetScope,
    targetProductId: productId, targetPosition: savedImages.length + index, productName: name }));
  // Persist destinations atomically before clearing the draft or closing editor.
  await saveMediaUploadJobs(remaining).catch(error => { q.error = error.message; throw error; });
  for (const job of q.jobs.filter(job => linked.has(job.image?.mediaId))) { await removeMediaUploadJob(job.id); release(job); }
  q.jobs = []; q.saving = false;
  destination.jobs = remaining; destination.hydrated = true; destination.saving = false;
  if (targetScope !== scope) queues.delete(scope);
  emit(); void pump();
}
export async function retryImageJob(scope, id) {
  const q = imageQueue(scope); const job = q.jobs.find(item => item.id === id);
  if (!job || !['failed', 'offline'].includes(job.status)) return;
  job.status = job.image && job.operation !== 'remove' ? 'ready' : 'queued'; job.error = null;
  await persist(job); q.error = ''; emit(); void pump();
}
export async function removeImageJob(scope, id) {
  const q = imageQueue(scope); const job = q.jobs.find(item => item.id === id);
  if (!job || ['uploading', 'attaching'].includes(job.status) || q.saving) return;
  job.operation = 'remove'; job.status = 'queued'; await persist(job); emit(); void pump();
}
export async function updateImageJobAlt(scope, id, altText) {
  const job = imageQueue(scope).jobs.find(item => item.id === id);
  if (job) { job.altText = altText; await persist(job); emit(); }
}
if (typeof window !== 'undefined') window.addEventListener('online', () => {
  for (const q of queues.values()) for (const job of q.jobs) if (job.status === 'offline') void retryImageJob(q.scope, job.id).catch(() => {});
  void pump();
});
