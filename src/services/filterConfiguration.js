import { apiRequest } from './apiClient.js';

const cache = new Map();
const requests = new Map();
const listeners = new Set();
const TTL = 60_000;
let generation = 0;
export const filterConfigurationGeneration = () => generation;
export function cachedFilterConfiguration(department, allowExpired = false) {
  if (typeof window === 'undefined') return null;
  const entry = cache.get(department);
  return entry && (allowExpired || entry.expires > Date.now()) ? entry : null;
}
export function rememberFilterConfiguration(department, configuration, version, started = Date.now()) {
  if (typeof window === 'undefined' || !configuration) return;
  const previous = cache.get(department);
  if (previous && previous.started > started) return;
  const unchanged = version && previous?.version === version;
  const entry = { configuration: unchanged ? previous.configuration : configuration, version, started, expires: Date.now() + TTL };
  cache.set(department, entry);
  if (!unchanged && previous?.configuration !== configuration) listeners.forEach(listener => listener(department, entry));
}
export function onFilterConfigurationChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function invalidateFilterConfiguration(department) {
  generation++;
  requests.clear();
  if (department) cache.delete(department); else cache.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('daja:filters-changed'));
}
async function published(department) {
  const stored = cachedFilterConfiguration(department);
  if (stored) return stored;
  if (requests.has(department)) return requests.get(department);
  const previous = cachedFilterConfiguration(department, true);
  const started = generation;
  const requestedAt = Date.now();
  const request = apiRequest(`/public/catalog/filters/${department}`, { auth: false, query: previous?.version ? { version: previous.version } : undefined })
    .then(result => {
      if (started !== generation) return published(department);
      const configuration = result.configuration || (result.version === previous?.version ? previous?.configuration : null);
      if (!configuration) throw new Error('Konfiguracija filtera nije dostupna.');
      rememberFilterConfiguration(department, configuration, result.version, requestedAt);
      return cachedFilterConfiguration(department, true) || { configuration, version: result.version };
    }).finally(() => { if (requests.get(department) === request) requests.delete(department); });
  requests.set(department, request);
  return request;
}
export const filterConfigurationApi = {
  published,
  draft: (department) => apiRequest(`/admin/catalog/filters/${department}`, { staff: true }),
  save: (department, revision, configuration) => apiRequest(`/admin/catalog/filters/${department}/draft`, { staff: true, method: 'PUT', body: { revision, configuration } }),
  publish: async (department, revision, restoreRevision) => {
    const result = await apiRequest(`/admin/catalog/filters/${department}/publish`, { staff: true, method: 'POST', body: { revision, ...(restoreRevision ? { restoreRevision } : {}) } });
    invalidateFilterConfiguration(department);
    return result;
  },
};
