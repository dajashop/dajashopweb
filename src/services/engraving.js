import { apiRequest } from './apiClient';
import { previewOf, snapshotOf } from '../engraving/design';
const request = (path, method, body) => apiRequest(`/engraving/${path}`, { method, body });
export const engravingApi = {
  list: () => request('drafts', 'GET'),
  open: (id, guestToken) => request(`drafts/${id}/open`, 'POST', { guestToken }),
};
let database;
function db() {
  if (!database) database = new Promise((resolve, reject) => {
    const open = indexedDB.open('daja-engraving', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('drafts', { keyPath: 'id' });
    open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
  });
  return database;
}
async function store(mode, action) {
  const database = await db(); return new Promise((resolve, reject) => {
    const transaction = database.transaction('drafts', mode); const result = action(transaction.objectStore('drafts'));
    transaction.oncomplete = () => resolve(result.result); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
  });
}
export const localDrafts = { list: () => store('readonly', (s) => s.getAll()), put: (draft) => store('readwrite', (s) => s.put(draft)), get: (id) => store('readonly', (s) => s.get(id)) };
const queues = new Map();
export async function openDraft(id, userId, token, forceRemote = false) {
  if (queues.has(id)) await queues.get(id).catch(() => {});
  const local = await localDrafts.get(id) || (await localDrafts.list()).find((draft) => draft.serverId === id);
  if (local?.ownerId && local.ownerId !== userId) throw new Error('Ovaj nacrt pripada drugom nalogu.');
  if (local && !forceRemote && (!local.serverId || (!local.ownerId && !userId))) return local;
  if (userId && local?.serverId && !local.ownerId && local.guestToken) {
    await request(`drafts/${local.serverId}/claim`, 'POST', { guestToken: local.guestToken });
    local.ownerId = userId; local.guestToken = undefined; await localDrafts.put(local);
  }
  const remote = await engravingApi.open(local?.serverId || id, token || local?.guestToken);
  if (local?.dirty && !forceRemote) {
    if (local.version !== remote.version) return { ...local, conflict: true };
    return local;
  }
  const draft = { ...local, ...remote, id: local?.id || remote.id, serverId: remote.id, ownerId: local?.ownerId || userId || null, guestToken: token || local?.guestToken, assets: remote.assets.map((asset) => ({ ...asset, uploaded: true, serverId: asset.id })), dirty: false, conflict: false, updatedAt: Date.now() };
  await localDrafts.put(draft); return draft;
}
export function saveDraft(draft, userId, cloud = Boolean(userId)) {
  const previous = queues.get(draft.id) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    // Always use the version produced by our previous queued save, never a stale closure.
    const stored = await localDrafts.get(draft.id);
    let next = { ...draft, serverId: stored?.serverId || draft.serverId, version: stored?.version ?? draft.version ?? 0, guestToken: stored?.guestToken || draft.guestToken, ownerId: stored?.ownerId || draft.ownerId || null, updatedAt: Date.now() };
    next.preview = await previewOf(next.design, next.assets);
    next.dirty = !(stored && !stored.dirty && JSON.stringify(stored.design) === JSON.stringify(next.design) && JSON.stringify(stored.assets) === JSON.stringify(next.assets)); await localDrafts.put(next);
    if (!cloud) return next;
    if (next.ownerId && next.ownerId !== userId) throw new Error('Nacrt pripada drugom nalogu.');
    if (!next.serverId) {
      const created = await request('drafts', 'POST', { productId: next.productId, variantId: next.variantId, design: { ...next.design, layers: [] } });
      next = { ...next, serverId: created.id, version: created.version, guestToken: created.guestToken || undefined, ownerId: userId || null };
      await localDrafts.put(next);
    } else if (userId && !next.ownerId && next.guestToken) {
      await request(`drafts/${next.serverId}/claim`, 'POST', { guestToken: next.guestToken }); next.ownerId = userId; next.guestToken = undefined;
      await localDrafts.put(next);
    }
    const assets = next.assets.map((asset) => ({ ...asset, ...stored?.assets?.find((saved) => saved.id === asset.id) }));
    for (let index = 0; index < assets.length; index++) {
      if (assets[index].uploaded) continue;
      const uploaded = await request(`drafts/${next.serverId}/assets`, 'POST', { guestToken: next.guestToken, dataUrl: assets[index].dataUrl });
      assets[index] = { ...assets[index], serverId: uploaded.id, uploaded: true };
      next.assets = assets; await localDrafts.put(next);
    }
    next = { ...next, assets };
    const cloudDesign = { ...next.design, layers: next.design.layers.map((layer) => layer.type === 'image' ? { ...layer, assetId: assets.find((asset) => asset.id === layer.assetId)?.serverId || layer.assetId } : layer) };
    // Full-size frozen artwork is generated once here; the server persists it without re-rendering fonts.
    next.artwork = await snapshotOf(next.design, assets);
    const saved = await request(`drafts/${next.serverId}`, 'PUT', { version: next.version, guestToken: next.guestToken, design: cloudDesign, preview: next.preview, artwork: next.artwork });
    next.version = saved.version; next.dirty = false; await localDrafts.put(next); return next;
  });
  queues.set(draft.id, task); task.finally(() => { if (queues.get(draft.id) === task) queues.delete(draft.id); }).catch(() => {}); return task;
}
export async function transferGuestDrafts(userId) {
  for (const draft of await localDrafts.list()) if (!draft.ownerId) {
    if (draft.serverId && !draft.dirty) {
      await request(`drafts/${draft.serverId}/claim`, 'POST', { guestToken: draft.guestToken });
      await localDrafts.put({ ...draft, ownerId: userId, guestToken: undefined });
    } else await saveDraft(draft, userId, true);
  }
}
