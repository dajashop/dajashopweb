import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { adminCatalogApi, subscribePublicCatalogRealtime, subscribeStaffCatalogRealtime } from '../services/dajaPlatform';

const supplierFields = [
  'url', 'status', 'stockStatus', 'priceAmount', 'priceCurrency', 'lastCheckedAt',
  'nextCheckAt', 'queuePosition', 'checksEnabled', 'disabledReason', 'disabledAt',
  'lastGoodResult', 'confirmationDueAt', 'nextRegularAt', 'pausedUntil', 'pauseReason',
  'firstProblemAt', 'firstProblemReason', 'manualRequestedAt', 'manualPaused',
];
const maxCachedViews = 8;
const visiblePageSize = 30;

function comparePosition(left, right, contributor) {
  const [leftId, leftAt, leftRank, leftReview] = left.split(',');
  const [rightId, rightAt, rightRank, rightReview] = right.split(',');
  return (contributor && (rightRank.localeCompare(leftRank) || rightReview.localeCompare(leftReview))) ||
    rightAt.localeCompare(leftAt) || rightId.localeCompare(leftId);
}

function compareProducts(left, right, contributor) {
  if (left.catalogPosition && right.catalogPosition) {
    return comparePosition(left.catalogPosition, right.catalogPosition, contributor);
  }
  const priority = item => Number(item.qualityReviewStatus === 'changes_requested');
  return (contributor && (priority(right) - priority(left) ||
    Date.parse(right.qualityReviewedAt || right.updatedAt) - Date.parse(left.qualityReviewedAt || left.updatedAt))) ||
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || right.id.localeCompare(left.id);
}

function getView(cache, search, fields) {
  const key = search ? JSON.stringify([search, fields]) : '';
  const existing = cache.get(key);
  if (existing) return existing;
  const view = {
    search, fields, items: [], ready: false, next: null, cursor: null, error: null,
    request: null, pageLoading: false, foreground: false, visibleLimit: visiblePageSize,
  };
  cache.set(key, view);
  return view;
}

function merge(view, incoming, removedIds, contributor, appendPage = false) {
  if (!incoming.length && !removedIds.length) return false;
  const products = new Map(view.items.map(item => [item.id, item]));
  const lastVisible = view.items[view.visibleLimit - 1];
  let additionsInView = 0;
  let changed = false;
  for (const id of removedIds) changed = products.delete(id) || changed;
  for (const item of incoming) {
    const previous = products.get(item.id);
    // Changes to older, unloaded rows will be picked up by their own page.
    if (!appendPage && !previous && view.next?.includes(',') && item.catalogPosition &&
        comparePosition(item.catalogPosition, view.next, contributor) > 0) continue;
    if (previous && JSON.stringify(previous) === JSON.stringify(item)) continue;
    if (!appendPage && !previous && lastVisible && compareProducts(item, lastVisible, contributor) <= 0) {
      additionsInView += 1;
    }
    products.set(item.id, item);
    changed = true;
  }
  if (changed) {
    view.items = [...products.values()].sort((left, right) => compareProducts(left, right, contributor));
    view.visibleLimit += additionsInView;
  }
  return changed;
}

function applySupplierChanges(view, states) {
  if (!states.length) return false;
  const patches = new Map();
  for (const state of states) {
    const prefix = state.providerCode === 'ekka' ? 'supplier' : state.providerCode;
    const patch = patches.get(state.productId) || {};
    for (const name of supplierFields) {
      patch[prefix + name[0].toUpperCase() + name.slice(1)] = state.removed ? null : state[name] ?? null;
    }
    patch[prefix + 'LinkId'] = state.id;
    patches.set(state.productId, patch);
  }
  let changed = false;
  const items = view.items.map(item => {
    const patch = patches.get(item.id);
    if (!patch || Object.entries(patch).every(([key, value]) => item[key] === value)) return item;
    changed = true;
    return { ...item, ...patch };
  });
  if (changed) view.items = items;
  return changed;
}

export default function useAdminCatalogProducts({ search, fields, productsVisible, loadComplete, completeVisible, contributor, enabled }) {
  const cache = useRef(new Map());
  const [, render] = useReducer(value => value + 1, 0);
  const full = useMemo(() => getView(cache.current, '', ''), []);
  const selected = useMemo(() => search ? getView(cache.current, search, fields) : full, [search, fields, full]);
  useEffect(() => {
    for (const [key, view] of cache.current) {
      if (cache.current.size <= maxCachedViews) break;
      if (view === full || view === selected) continue;
      const controller = view.request;
      view.request = null;
      controller?.abort();
      cache.current.delete(key);
    }
  }, [selected, full]);

  const clearUnauthorized = useCallback(error => {
    if (error?.status !== 401 && error?.status !== 403) return false;
    for (const view of cache.current.values()) {
      const controller = view.request;
      Object.assign(view, {
        items: [], ready: false, next: null, cursor: null, error,
        request: null, pageLoading: false, visibleLimit: visiblePageSize,
      });
      controller?.abort();
    }
    render();
    return true;
  }, []);
  const loadPage = useCallback(async (view, size, foreground = true) => {
    if (view.pageLoading || (view.ready && !view.next)) return;
    view.request?.abort();
    const controller = new AbortController();
    view.request = controller;
    view.pageLoading = true;
    view.foreground = foreground;
    view.error = null;
    const after = view.ready ? view.next : undefined;
    const timeout = window.setTimeout(() => controller.abort(new DOMException('Proizvodi se predugo učitavaju.', 'TimeoutError')), 25_000);
    render();
    try {
      const page = await adminCatalogApi.listProductPage({
        after, limit: size, search: view.search, fields: view.fields, incremental: true, signal: controller.signal,
      });
      if (controller.signal.aborted || view.request !== controller) return;
      if (page.nextCursor && (page.nextCursor === after ||
        (after?.includes(',') && page.nextCursor.includes(',') && comparePosition(page.nextCursor, after, contributor) <= 0))) {
        throw new Error('Stranica proizvoda nije napredovala.');
      }
      merge(view, page.items, [], contributor, true);
      if (!view.ready) {
        view.cursor = page.changeCursor;
        view.supplierRevision = page.supplierRevision;
      }
      view.next = page.nextCursor;
      view.ready = true;
    } catch (error) {
      if (view.request === controller && (!controller.signal.aborted || controller.signal.reason?.name === 'TimeoutError') &&
          !clearUnauthorized(error)) {
        view.error = error;
      }
    } finally {
      window.clearTimeout(timeout);
      if (view.request === controller) {
        view.request = null;
        view.pageLoading = false;
        render();
      }
    }
  }, [contributor, clearUnauthorized]);

  const sync = useCallback(async (view, withSuppliers) => {
    if (view.request || !view.ready || !view.cursor) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    view.request = controller;
    let changed = false;
    let more = false;
    try {
      for (let page = 0; page < 4; page += 1) {
        const cursor = view.cursor;
        const delta = await adminCatalogApi.productChanges({
          cursor, search: view.search, fields: view.fields, signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        changed = merge(view, delta.items, delta.removedIds, contributor) || changed;
        view.cursor = delta.nextCursor;
        more = delta.hasMore && (cursor.xid !== view.cursor.xid || cursor.id !== view.cursor.id);
        if (!more) break;
      }
      if (withSuppliers && Number.isSafeInteger(view.supplierRevision)) {
        const revision = view.supplierRevision;
        const delta = await adminCatalogApi.supplierStates(revision, 200, { includeLegacy: true, signal: controller.signal });
        if (controller.signal.aborted) return;
        changed = applySupplierChanges(view, delta.items) || changed;
        if (Number.isSafeInteger(delta.nextRevision) && delta.nextRevision > revision) {
          view.supplierRevision = delta.nextRevision;
          more ||= delta.hasMore;
        }
      }
    } catch (error) {
      // Only an authorization failure discards the visible snapshot.
      if (view.request === controller) clearUnauthorized(error);
      more = false;
    } finally {
      window.clearTimeout(timeout);
      if (view.request === controller) {
        view.request = null;
        if (changed) render();
      }
    }
    return more;
  }, [contributor, clearUnauthorized]);

  useEffect(() => () => {
    for (const view of cache.current.values()) {
      const controller = view.request;
      view.request = null;
      view.pageLoading = false;
      controller?.abort();
    }
  }, []);

  const fullNext = full.next;
  const fullBusy = full.pageLoading;
  const fullError = full.error;
  useEffect(() => {
    if (enabled && productsVisible && !selected.ready && !selected.error) void loadPage(selected, visiblePageSize);
  }, [enabled, productsVisible, selected, loadPage]);
  useEffect(() => {
    if (enabled && loadComplete && !fullError && !fullBusy && (!full.ready || fullNext)) void loadPage(full, 100, false);
  }, [enabled, loadComplete, full, fullNext, fullBusy, fullError, loadPage]);

  const ready = selected.ready;
  const fullReady = full.ready;
  useEffect(() => {
    if (!enabled || (!productsVisible && !completeVisible)) return;
    let stopped = false;
    let running = false;
    let timer;
    const views = new Set([...(productsVisible ? [selected] : []), ...(completeVisible ? [full] : [])]);
    const check = async () => {
      if (stopped || running || document.visibilityState !== 'visible') return;
      running = true;
      const more = await Promise.all([...views].map(view => sync(view, productsVisible && view === selected)));
      running = false;
      if (stopped) return;
      const checking = productsVisible && selected.items.some(product =>
        ['supplier', 'bultime', 'linkel', 'milano', 'timezone', 'qandq'].some(prefix => product[prefix + 'Status'] === 'checking'));
      timer = window.setTimeout(check, more.some(Boolean) ? 750 : checking ? 10_000 : 30_000);
    };
    const wake = () => {
      if (running || document.visibilityState !== 'visible') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(check, 500);
    };
    const onLocalChange = ({ detail }) => {
      if (!detail?.staff) return;
      let changed = false;
      for (const view of cache.current.values()) {
        if (!view.ready || view.request) continue;
        if (detail.type === 'delete') {
          changed = merge(view, [], [detail.id], contributor) || changed;
        } else if (detail.type === 'upsert' && detail.product?.id) {
          const previous = view.items.find(item => item.id === detail.product.id);
          if (previous || (!view.search && detail.product.catalogPosition)) {
            changed = merge(view, [{ ...previous, ...detail.product }], [], contributor) || changed;
          }
        }
      }
      if (changed) render();
      wake();
    };
    const unsubscribeStaff = subscribeStaffCatalogRealtime(event => {
      if (event?.event === 'product.updated' || event?.event === 'catalog.taxonomy.updated') wake();
    });
    const unsubscribePublic = contributor ? subscribePublicCatalogRealtime(event => {
      if (event?.event === 'product.updated') wake();
    }) : undefined;
    window.addEventListener('daja:products-changed', onLocalChange);
    window.addEventListener('daja:supplier-refresh', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    wake();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      unsubscribeStaff();
      unsubscribePublic?.();
      window.removeEventListener('daja:products-changed', onLocalChange);
      window.removeEventListener('daja:supplier-refresh', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [enabled, selected, full, ready, fullReady, productsVisible, completeVisible, sync, contributor]);

  const refresh = useCallback(() => {
    if (!selected.ready) return loadPage(selected, visiblePageSize);
    return sync(selected, true);
  }, [selected, loadPage, sync]);
  const loadMore = useCallback(() => {
    if (selected.items.length > selected.visibleLimit) {
      selected.visibleLimit += visiblePageSize;
      render();
      return;
    }
    if (selected.pageLoading || !selected.next) return;
    selected.visibleLimit += visiblePageSize;
    void loadPage(selected, visiblePageSize);
  }, [selected, loadPage]);
  const selectedItems = selected.items;
  const visibleLimit = selected.visibleLimit;
  const items = useMemo(() => selectedItems.length > visibleLimit ? selectedItems.slice(0, visibleLimit) : selectedItems,
    [selectedItems, visibleLimit]);
  return {
    items,
    loading: (selected.pageLoading && selected.foreground) || (!selected.ready && !selected.error),
    err: selected.error,
    refresh,
    hasMore: Boolean(selected.next || selected.items.length > visibleLimit),
    loadMore,
    complete: {
      items: full.items,
      loading: loadComplete && !full.error && (!full.ready || Boolean(full.next)),
      err: full.error,
    },
  };
}
