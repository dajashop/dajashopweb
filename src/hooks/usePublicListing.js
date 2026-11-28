import { cachedResource, catalogAffected, catalogFallback, catalogInvalidationEvent, catalogRequestPending, currentCatalogPrice, invalidateCatalogResource, rememberResource, requestResource, restoreCatalogResource, staleCatalog } from '../services/catalogResourceCache.js';
import { backgroundCatalogAllowed, beginCatalogForeground, waitForCatalogPriority, preloadCatalogImages } from '../services/catalogPreparation.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { catalogApi, subscribePublicCatalogRealtime, subscribeStaffCatalogRealtime } from '../services/dajaPlatform.js';
import { usePageData } from '../ssr/PageData.jsx';
import { useConsent } from '../context/ConsentContext.jsx';

const listingKey = (route, admin) => `${admin ? 'admin' : 'listing'}:${route}`;
function requestListing(route, admin, signal, force = false) {
  return requestResource(listingKey(route, admin),
    requestSignal => admin ? catalogApi.adminListing(route, requestSignal) : catalogApi.listing(route, requestSignal, force),
    { signal, force });
}
export default function usePublicListing(route, seedField, enabled = true, includeHiddenForAdmin = false) {
  const page = usePageData();
  const { hasDecision } = useConsent();
  const seed = page?.data?.[seedField];
  const cacheKey = listingKey(route, includeHiddenForAdmin);
  const department = route.startsWith('page?') ? new URLSearchParams(route.slice(5)).get('department') : seedField;
  // Never carry hidden/admin cards into a public view or another department.
  const scope = `${includeHiddenForAdmin ? 'admin' : 'public'}:${department}`;
  const initial = page?.hydrating && !includeHiddenForAdmin && seed?.requestKey === route ? seed : null;
  const [state, setState] = useState(() => ({ route: cacheKey, request: cacheKey, scope, data: initial || cachedResource(cacheKey, true), error: null, pending: !(initial || cachedResource(cacheKey, true)) }));
  const [clock, setClock] = useState(0);
  const first = useRef(true);
  const retryAction = useRef(null);
  const current = state.route === cacheKey ? state.data : cachedResource(cacheKey, true);
  // Public cards may remain while the same route gains staff access. Never
  // carry hidden cards back into a public scope or another department.
  const promotingPublic = includeHiddenForAdmin && state.scope === `public:${department}` && state.route === listingKey(route, false);
  const previousData = current || (state.scope === scope || promotingPublic ? state.data : null);
  const data = useMemo(() => {
    if (!previousData) return null;
    const stale = staleCatalog(previousData);
    const items = previousData.items.map(item => {
      const product = page?.hydrating ? item : currentCatalogPrice(item);
      return stale ? { ...product, _catalogStale: true } : product;
    });
    return { ...previousData, items };
  }, [previousData, clock, page?.hydrating]);
  const displayingPrevious = !current && Boolean(data) && !promotingPublic;
  const previousRoute = state.route.replace(/^(?:admin|listing):/, '');
  const changingPage = displayingPrevious && route.startsWith('page?') && previousRoute.startsWith('page?')
    && new URLSearchParams(route.slice(5)).get('page') !== new URLSearchParams(previousRoute.slice(5)).get('page');
  const error = state.request === cacheKey ? state.error : null;
  const busy = enabled && !error && (state.request !== cacheKey || state.pending || !current);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const stored = cachedResource(cacheKey, true) || (first.current && initial);
    first.current = false;
    if (stored) {
      if (stored === initial && !cachedResource(cacheKey)) rememberResource(cacheKey, stored);
      setState({ route: cacheKey, request: cacheKey, scope, data: stored, error: null, pending: false });
    }
    let sequence = 0;
    let known = stored || cachedResource(cacheKey);
    let requestController;
    const load = async (force = false, restore = false) => {
      requestController?.abort();
      requestController = new AbortController();
      const signal = AbortSignal.any([controller.signal, requestController.signal]);
      const requestSequence = ++sequence;
      const active = () => !signal.aborted && requestSequence === sequence;
      setState(previous => ({ ...previous, request: cacheKey, pending: true, error: null }));
      const finishForeground = beginCatalogForeground();
      try {
        if (restore && !includeHiddenForAdmin && !known && !catalogRequestPending(cacheKey)) {
          known = await restoreCatalogResource(cacheKey);
          if (!active()) return;
          if (known && cachedResource(cacheKey, true)) {
            setState({ route: cacheKey, request: cacheKey, scope, data: known, error: null, pending: false });
            return;
          }
        }
        const result = await requestListing(route, includeHiddenForAdmin, signal, force);
        if (!active()) return;
        known = result;
        setState({ route: cacheKey, request: cacheKey, scope, data: result, error: null, pending: false });
      } catch (failure) {
        if (!active() || failure.name === 'AbortError') return;
        const fallback = !includeHiddenForAdmin && catalogFallback(cacheKey, failure, known);
        setState(previous => fallback
          ? { route: cacheKey, request: cacheKey, scope, data: fallback, error: null, pending: false }
          : { ...previous, request: cacheKey, data: !includeHiddenForAdmin && previous.data?._catalogCache ? null : previous.data, error: failure, pending: false });
      } finally { finishForeground(); }
    };
    if (!cachedResource(cacheKey, true)) void load(false, true);
    const refresh = event => {
      if (!catalogAffected(cacheKey, known, event.detail)) return;
      known = null;
      void load(true);
    };
    const onFocus = () => { if (document.visibilityState === 'visible' && !cachedResource(cacheKey, true)) void load(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    window.addEventListener(catalogInvalidationEvent, refresh);
    const retry = () => { invalidateCatalogResource(cacheKey); void load(true); };
    retryAction.current = retry;
    const unsubscribe = hasDecision && includeHiddenForAdmin ? subscribeStaffCatalogRealtime(event => {
      if (['product.updated', 'catalog.variant-groups.updated', 'catalog.taxonomy.updated'].includes(event.event)) retry();
    }) : hasDecision ? subscribePublicCatalogRealtime(() => {}) : null;
    return () => {
      controller.abort();
      unsubscribe?.();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      window.removeEventListener(catalogInvalidationEvent, refresh);
      if (retryAction.current === retry) retryAction.current = null;
    };
  }, [route, cacheKey, scope, enabled, includeHiddenForAdmin, hasDecision]);
  useEffect(() => {
    if (!enabled || !current || state.route !== cacheKey || state.pending || staleCatalog(current) ||
        !route.startsWith('page?') || !backgroundCatalogAllowed() || typeof IntersectionObserver === 'undefined' ||
        current.page >= Math.ceil(current.total / current.perPage)) return undefined;
    const target = document.querySelector('[data-catalog-page-end]');
    if (!target) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void (async () => {
        await waitForCatalogPriority(signal);
        if (signal.aborted || !backgroundCatalogAllowed()) return;
        const params = new URLSearchParams(route.slice(5));
        params.set('page', String(current.page + 1));
        const nextPage = await requestListing(`page?${params}`, includeHiddenForAdmin, signal);
        if (!signal.aborted && !staleCatalog(nextPage)) {
          await preloadCatalogImages(nextPage.items.slice(0, 10), signal);
        }
      })().catch(() => {}); // Optional work must yield to navigation.
    }, { rootMargin: '0px 0px 650px 0px' });
    observer.observe(target);
    return () => { controller.abort(); observer.disconnect(); };
  }, [route, cacheKey, current, state.route, state.pending, enabled, includeHiddenForAdmin]);
  useEffect(() => {
    if (!enabled || !current) return undefined;
    const now = Date.now();
    const expiries = current.items.flatMap(item => [item.saleValidUntil, item.nextSaleStartsAt])
      .map(Date.parse).filter(time => time > now);
    if (staleCatalog(current)) expiries.push(current._catalogCache.staleUntil);
    if (!expiries.length) return undefined;
    const timer = window.setTimeout(() => {
      setClock(value => value + 1);
      if (staleCatalog(current) && current._catalogCache.staleUntil <= Date.now()) {
        setState(previous => previous.data === current ? { ...previous, data: null, error: new Error('Provera cene i dostupnosti') } : previous);
      } else if (document.visibilityState === 'visible') retryAction.current?.();
    }, Math.max(0, Math.min(Math.min(...expiries) - now + 30, 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [enabled, current, clock]);
  const retry = () => retryAction.current?.();
  return { data, retry, displayingPrevious, changingPage, loading: enabled && !data && !error, updating: Boolean(data) && busy, error };
}
