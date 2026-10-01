import { apiRequest } from './apiClient.js';

export const filterConfigurationApi = {
  published: (department) => apiRequest(`/public/catalog/filters/${department}`, { auth: false }),
  draft: (department) => apiRequest(`/admin/catalog/filters/${department}`, { staff: true }),
  save: (department, revision, configuration) => apiRequest(`/admin/catalog/filters/${department}/draft`, { staff: true, method: 'PUT', body: { revision, configuration } }),
  publish: (department, revision, restoreRevision) => apiRequest(`/admin/catalog/filters/${department}/publish`, { staff: true, method: 'POST', body: { revision, ...(restoreRevision ? { restoreRevision } : {}) } }),
};
