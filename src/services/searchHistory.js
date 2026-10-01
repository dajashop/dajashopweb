import { isPreferenceStorageAllowed, readStoredValue, writeStoredValue, removeStoredValue } from './consentStorage.js';

export const SEARCH_HISTORY_KEY = 'dajashop_search_history';
const listeners = new Set();
const empty = [];
let history = empty;
let storageLoaded = false;
const key = (query) => query.toLocaleLowerCase('sr').replace(/\s+/g, ' ').trim();
function clean(items) {
  return items.filter((item) => typeof item === 'string').map((item) => item.trim().slice(0, 120))
    .filter((item, index, all) => item.length >= 2 && all.findIndex((other) => key(other) === key(item)) === index).slice(0, 8);
}
function parse(raw) { try { const value = JSON.parse(raw || '[]'); return Array.isArray(value) ? clean(value) : []; } catch { return []; } }
function emit() { listeners.forEach((listener) => listener()); }
export function getSearchHistory() {
  if (!storageLoaded && isPreferenceStorageAllowed()) {
    storageLoaded = true;
    history = clean([...history, ...parse(readStoredValue(SEARCH_HISTORY_KEY, 'preferences'))]);
  }
  return history;
}
export function recordSearchQuery(value) {
  const query = String(value || '').trim().slice(0, 120);
  if (query.length < 2) return;
  history = clean([query, ...getSearchHistory().filter((item) => key(item) !== key(query))]);
  // Without preference consent, history remains only in this tab's memory.
  writeStoredValue(SEARCH_HISTORY_KEY, JSON.stringify(history), 'preferences');
  emit();
}
export function clearSearchHistory() { history = empty; removeStoredValue(SEARCH_HISTORY_KEY); emit(); }
function consentChanged() { storageLoaded = false; getSearchHistory(); emit(); }
function storageChanged(event) {
  if (event.key !== SEARCH_HISTORY_KEY || !isPreferenceStorageAllowed()) return;
  history = parse(event.newValue); storageLoaded = true; emit();
}
export function subscribeSearchHistory(listener) {
  listeners.add(listener);
  if (listeners.size === 1) { window.addEventListener('daja:consent-state', consentChanged); window.addEventListener('storage', storageChanged); }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { window.removeEventListener('daja:consent-state', consentChanged); window.removeEventListener('storage', storageChanged); }
  };
}
