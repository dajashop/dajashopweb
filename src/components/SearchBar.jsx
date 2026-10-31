import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowRight, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useCatalogSearch from '../hooks/useCatalogSearch.js';
import SearchSuggestions from './search/SearchSuggestions.jsx';
import './SearchBar.css';
import './search/LiveSearch.css';

export default function SearchBar() {
  const { t: translateText } = useStorefront();

  const [q, setQ] = useState('');
  const [literal, setLiteral] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  const [position, setPosition] = useState({});
  const [seed, setSeed] = useState('catalog');
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null); const anchor = useRef(null); const panel = useRef(null);
  const navigate = useNavigate(); const location = useLocation();
  const id = `search-${useId().replace(/:/g, '')}`;
  const { data, loading, error, retry } = useCatalogSearch({ q, enabled: open, seed, literal });
  const hasValue = q.trim().length > 0;
  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);

  function show() {
    if (open) return;
    // Keep the original input mounted and focused: no keyboard handoff on iOS.
    setSeed(crypto.randomUUID()); setActive(-1); setOpen(true);
  }
  function dismiss() {
    close();
    inputRef.current?.blur();
  }
  function go(href) { close(); inputRef.current?.blur(); navigate(href); }
  function submit() { if (q.trim().length >= 2) go(`/search?q=${encodeURIComponent(q.trim())}${literal?'&literal=yes':''}`); }
  function clear() { setLiteral(false); setQ(''); setActive(-1); inputRef.current?.focus({ preventScroll: true }); }
  function correct(value) { setLiteral(false); setQ(value); setActive(-1); inputRef.current?.focus({ preventScroll: true }); }
  function onKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); return; }
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
  useEffect(() => { setActive(-1); }, [q, data]);
  useEffect(() => {
    close();
    if (location.pathname === '/search') { setQ(new URLSearchParams(location.search).get('q') || ''); setLiteral(new URLSearchParams(location.search).get('literal') === 'yes'); }
  }, [location.pathname, location.search, close]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => { setMobile(media.matches); close(); };
    setMobile(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
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
      if (mobile) {
        const bounds = anchor.current.getBoundingClientRect();
        const viewLeft = viewport?.offsetLeft || 0;
        const viewTop = viewport?.offsetTop || 0;
        const viewWidth = viewport?.width || window.innerWidth;
        const viewHeight = viewport?.height || window.innerHeight;
        const width = Math.max(0, Math.min(bounds.width, viewWidth - 24));
        const top = Math.max(bounds.bottom + 8, viewTop + 8);
        const available = Math.max(0, viewTop + viewHeight - top - 12);
        setPosition({ top, left: Math.max(viewLeft + 12, Math.min(bounds.left, viewLeft + viewWidth - width - 12)),
          width, maxHeight: available, visibility: available < 48 ? 'hidden' : 'visible',
          '--search-viewport-height': available + 'px' });
        return;
      }
      const bounds = anchor.current.getBoundingClientRect(); const width = Math.min(1080, window.innerWidth - 24);
      const available = Math.max(0, (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - bounds.bottom - 24);
      setPosition({ top: bounds.bottom + 10, left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), width, maxHeight: available, visibility: available < 48 ? 'hidden' : 'visible' });
    }
    update(); const observer = new ResizeObserver(update); observer.observe(anchor.current);
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); };
  }, [open, mobile]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!anchor.current?.contains(event.target) && !panel.current?.contains(event.target)) { close(); inputRef.current?.blur(); } };
    const focus = outside;
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', focus);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', focus); };
  }, [open, close]);

  const accessibility = { role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': open, 'aria-controls': open ? `${id}-list` : undefined,
    'aria-activedescendant': active >= 0 ? `${id}-option-${active}` : undefined, 'aria-label': translateText('Pretraži modele, brendove i kolekcije') };
  const content = <SearchSuggestions data={data} loading={loading} error={error} retry={retry} query={q}
    recommendations={data?.recommendations||[]}
    onNavigate={go} onCorrect={correct} onLiteral={()=>setLiteral(true)} literal={literal} active={active} onActive={setActive} idPrefix={id} />;
  return <>
    <div ref={anchor} className={`searchNeo ${open ? 'is-focused' : ''} ${hasValue ? 'has-value' : ''}`} role="search" aria-label={translateText("Pretraga")} tabIndex={-1}>
      <Search className="s2__leading" size={18} aria-hidden="true" />
      <input ref={inputRef} className="s2__input" value={q} maxLength={120} onChange={(event) => { setLiteral(false); setQ(event.target.value); }} onKeyDown={onKeyDown} onFocus={show} onClick={show}
        placeholder={translateText("Pretraži modele, brendove…")} inputMode="search" enterKeyHint="search" autoComplete="off" {...accessibility} />
      <button type="button" className="s2__clear" onMouseDown={(event) => event.preventDefault()} onClick={clear} aria-label={translateText("Obriši pretragu")} tabIndex={hasValue ? 0 : -1}><X size={14} /></button>
      <button type="button" className="s2__submit" onClick={submit} disabled={q.trim().length < 2} aria-label={translateText("Prikaži sve rezultate")} tabIndex={hasValue ? 0 : -1}><ArrowRight size={18} /></button>
    </div>
    {translateText(open && createPortal(<div ref={panel} style={position} className={`live-search ${mobile ? 'live-search--mobile' : 'live-search--desktop'}`} data-lenis-prevent
      role="region" aria-label={translateText("Pretraga kataloga")} onKeyDown={mobile ? onKeyDown : undefined}>
      {mobile && <div className="live-search__mobile-header">
        <span>{translateText('Pretraga kataloga')}</span>
        <button type="button" onClick={dismiss} aria-label={translateText('Zatvori pretragu')}><X size={18} /></button>
      </div>}
      <div className="live-search__scroll" data-lenis-prevent id={`${id}-list`} role="listbox" aria-label={translateText("Predlozi pretrage")} aria-busy={loading}>{translateText(content)}</div>
    </div>, document.body))}
  </>;
}
