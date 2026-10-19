import { useCallback, useSyncExternalStore } from 'react';
import { useConsent } from '../context/ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

const snapshots = new Map();
const listeners = new Set();
const EMPTY = [];
const lineKey = item => item.lineId || item.id;
const notify = () => listeners.forEach(listener => listener());

function read(key) {
  if (!snapshots.has(key)) {
    try {
      const value = JSON.parse(readStoredValue(key, 'necessary') || '[]');
      snapshots.set(key, Array.isArray(value) ? value.filter(item => item && lineKey(item) && Number.isFinite(item.qty) && item.qty > 0) : EMPTY);
    } catch { snapshots.set(key, EMPTY); }
  }
  return snapshots.get(key);
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = event => {
    if (event.key === null || event.key.startsWith('daja_saved_cart:')) {
      if (event.key === null) snapshots.clear(); else snapshots.delete(event.key);
      notify();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export default function useSavedCartItems(user) {
  const { hasDecision } = useConsent();
  const key = `daja_saved_cart:${user?.uid || user?.id || 'guest'}`;
  const getSnapshot = useCallback(() => hasDecision ? read(key) : EMPTY, [hasDecision, key]);
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const update = useCallback(change => {
    if (!hasDecision) return false;
    const next = change(read(key));
    if (!Array.isArray(next) || !writeStoredValue(key, JSON.stringify(next), 'necessary')) return false;
    snapshots.set(key, next);
    notify();
    return true;
  }, [hasDecision, key]);
  const save = item => update(current => {
    const existing = current.find(saved => lineKey(saved) === lineKey(item));
    return existing
      ? current.map(saved => lineKey(saved) === lineKey(item) ? { ...item, qty: saved.qty + item.qty } : saved)
      : [...current, item];
  });
  const remove = item => update(current => current.filter(saved => lineKey(saved) !== lineKey(item)));
  const take = (item, qty) => update(current => {
    const found = current.find(saved => lineKey(saved) === lineKey(item));
    if (!found || found.qty < qty) return null;
    return current.flatMap(saved => lineKey(saved) !== lineKey(item) ? [saved] : saved.qty > qty ? [{ ...saved, qty: saved.qty - qty }] : []);
  });
  return { items, save, remove, take, ready: hasDecision };
}
