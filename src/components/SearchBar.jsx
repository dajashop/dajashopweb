import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Search, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useCatalogSearch from '../hooks/useCatalogSearch.js';
import useSearchHistory from '../hooks/useSearchHistory.js';
import { clearSearchHistory, recordSearchQuery } from '../services/searchHistory.js';
import SearchSuggestions from './search/SearchSuggestions.jsx';
import './SearchBar.css';
import './search/LiveSearch.css';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [position, setPosition] = useState({});
  const [seed, setSeed] = useState('catalog');
  const [active, setActive] = useState(-1);
  const [recommendations, setRecommendations] = useState([]);
  const inputRef = useRef(null); const mobileInput = useRef(null); const anchor = useRef(null); const panel = useRef(null);
  const openRef = useRef(false); const queryRef = useRef(q); queryRef.current = q;
  const navigate = useNavigate(); const location = useLocation();
  const id = `search-${useId().replace(/:/g, '')}`;
  const { data, loading, error, retry } = useCatalogSearch({ q, enabled: open, seed });
  const history = useSearchHistory();
  const hasValue = q.trim().length > 0;
  const close = useCallback(() => { if (openRef.current) recordSearchQuery(queryRef.current); openRef.current = false; setOpen(false); setActive(-1); }, []);

  function show() {
    if (open) return;
    openRef.current = true;
    // Keep portal focus in the user gesture so iOS keeps its keyboard.
    flushSync(() => { setSeed(crypto.randomUUID()); setRecommendations([]); setActive(-1); setOpen(true); });
    if (mobile) mobileInput.current?.focus({ preventScroll: true });
  }
  function dismiss() {
    close();
    if (mobile) { mobileInput.current?.blur(); requestAnimationFrame(() => anchor.current?.focus({ preventScroll: true })); }
    else inputRef.current?.blur();
  }
  function go(href) { close(); inputRef.current?.blur(); mobileInput.current?.blur(); navigate(href); }
  function submit() { if (q.trim().length >= 2) go(`/search?q=${encodeURIComponent(q.trim())}`); }
  function clear() { setQ(''); setActive(-1); (mobile && open ? mobileInput : inputRef).current?.focus({ preventScroll: true }); }
  function correct(value) { setQ(value); setActive(-1); (mobile && open ? mobileInput : inputRef).current?.focus({ preventScroll: true }); }
  function onKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); return; }
    if (event.key === 'Tab' && mobile && open) {
      const controls = [...panel.current.querySelectorAll('input, button:not([disabled]), a[href]')].filter((control) => control.tabIndex >= 0);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      return;
    }
    if (event.target.tagName !== 'INPUT') return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); if (!open) show();
      const options = [...(panel.current?.querySelectorAll('[data-search-index]') || [])].sort((a, b) => Number(a.dataset.searchIndex) - Number(b.dataset.searchIndex));
      if (!options.length) return;
      const next = event.key === 'ArrowDown' ? (active + 1) % options.length : (active <= 0 ? options.length : active) - 1;
      setActive(next); options[next]?.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter') {
      event.preventDefault(); const selected = active >= 0 ? panel.current?.querySelector(`[data-search-index="${active}"]`) : null;
      if (selected) selected.click(); else submit();
    }
  }
  useEffect(() => { setActive(-1); }, [q, data, history]);
  useEffect(() => { if (data?.recommendations?.length) setRecommendations((existing) => existing.length ? existing : data.recommendations); }, [data]);
  useEffect(() => {
    close();
    if (location.pathname === '/search') setQ(new URLSearchParams(location.search).get('q') || '');
  }, [location.pathname, location.search, close]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => { setMobile(media.matches); close(); };
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, [close]);
  useEffect(() => {
    function shortcut(event) {
      const target = document.activeElement;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) && !target?.isContentEditable) { event.preventDefault(); inputRef.current?.focus(); }
    }
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    function update() {
      if (mobile) { const height = viewport?.height || window.innerHeight; setPosition({ top: viewport?.offsetTop || 0, left: viewport?.offsetLeft || 0, width: viewport?.width || window.innerWidth, height, '--search-viewport-height': `${height}px` }); return; }
      const bounds = anchor.current.getBoundingClientRect(); const width = Math.min(1080, window.innerWidth - 24);
      setPosition({ top: bounds.bottom + 10, left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), width, maxHeight: Math.max(120, window.innerHeight - bounds.bottom - 24) });
    }
    update(); const observer = new ResizeObserver(update); observer.observe(anchor.current);
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); };
  }, [open, mobile]);
  useLayoutEffect(() => {
    if (!open || !mobile) return;
    const body = document.body; const y = window.scrollY;
    const previous = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, overflow: body.style.overflow };
    const lenis = window.lenis;
    const wasStopped = lenis?.isStopped;
    lenis?.stop(); Object.assign(body.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', overflow: 'hidden' });
    return () => { Object.assign(body.style, previous); window.scrollTo({ top: y, behavior: 'instant' }); if (!wasStopped) lenis?.start(); };
  }, [open, mobile]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!anchor.current?.contains(event.target) && !panel.current?.contains(event.target)) close(); };
    const focus = (event) => { if (!mobile) outside(event); };
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', focus);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', focus); };
  }, [open, mobile, close]);

  const accessibility = { role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': open, 'aria-controls': open ? `${id}-list` : undefined,
    'aria-activedescendant': active >= 0 ? `${id}-option-${active}` : undefined, 'aria-label': 'Pretraži modele, brendove i kolekcije' };
  const content = <SearchSuggestions data={data} loading={loading} error={error} retry={retry} query={q}
    recommendations={!loading && !error && q.trim().length >= 2 && data?.message ? recommendations : []}
    history={history} onClearHistory={clearSearchHistory}
    onNavigate={go} onCorrect={correct} active={active} onActive={setActive} idPrefix={id} />;
  return <>
    <div ref={anchor} className={`searchNeo ${open ? 'is-focused' : ''} ${hasValue ? 'has-value' : ''}`} role="search" aria-label="Pretraga" tabIndex={-1}>
      <Search className="s2__leading" size={18} aria-hidden="true" />
      <input ref={inputRef} className="s2__input" value={q} maxLength={120} onChange={(event) => setQ(event.target.value)} onKeyDown={onKeyDown} onFocus={show}
        placeholder="Pretraži modele, brendove…" inputMode="search" autoComplete="off" {...accessibility} aria-hidden={mobile && open ? 'true' : undefined} tabIndex={mobile && open ? -1 : 0} />
      <button type="button" className="s2__clear" onClick={clear} aria-label="Obriši pretragu" tabIndex={hasValue ? 0 : -1}><X size={14} /></button>
      <button type="button" className="s2__submit" onClick={submit} disabled={q.trim().length < 2} aria-label="Prikaži sve rezultate" tabIndex={hasValue ? 0 : -1}><ArrowRight size={18} /></button>
    </div>
    {open && createPortal(<div ref={panel} style={position} className={`live-search ${mobile ? 'live-search--mobile' : 'live-search--desktop'}`} data-lenis-prevent
      role={mobile ? 'dialog' : undefined} aria-modal={mobile ? 'true' : undefined} aria-label="Pretraga kataloga" onKeyDown={mobile ? onKeyDown : undefined}>
      {mobile && <div className="live-search__mobile-header">
        <button type="button" onClick={dismiss} aria-label="Zatvori pretragu"><ArrowLeft size={22} /></button>
        <div className="live-search__mobile-field"><Search size={19} aria-hidden="true" /><input ref={mobileInput} value={q} maxLength={120} onChange={(event) => setQ(event.target.value)} placeholder="Model, brend, kolekcija…" inputMode="search" enterKeyHint="search" autoComplete="off" {...accessibility} />
          {hasValue && <button type="button" onClick={clear} aria-label="Obriši pretragu"><X size={18} /></button>}</div>
      </div>}
      <div className="live-search__scroll" data-lenis-prevent id={`${id}-list`} role="listbox" aria-label="Predlozi pretrage" aria-busy={loading}>{content}</div>
    </div>, document.body)}
  </>;
}
