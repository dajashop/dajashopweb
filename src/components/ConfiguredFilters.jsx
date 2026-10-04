import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCatalogParams as useSearchParams } from '../context/CatalogParams.jsx';
import ColorFilter from './ColorFilter.jsx';
import MaterialFilter from './MaterialFilter.jsx';
import FilterOptions from './FilterOptions.jsx';
import DiameterFilter from './DiameterFilter.jsx';
import RangeFilterSlider from './RangeFilterSlider.jsx';
import SectionHeader from './FilterSectionHeader.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { configuredFilterParams, configuredFilterChips, filterConfiguredProducts, filterLeaves, movementFilterRole, numericFilterValue, optionMatches, orderedNodes, rangeKey, selectionKey, sourceValues } from '../utils/filterConfiguration.js';
import './Filters.css';
import useFilterAnchor from '../hooks/useFilterAnchor.js';

export default function ConfiguredFilters({ products, configuration, fixedGender, onClose, params: previewParams, onParams, expandIds = [], showUnavailableOptions = false, focusId = '' }) {
  const [urlParams, setUrlParams] = useSearchParams();
  const params = configuredFilterParams(previewParams || urlParams, configuration, fixedGender);
  const [open, setOpen] = useState({});
  const container = useRef(null);
  const contains = (node) => node.id === focusId || node.children.some(contains);
  const focusSectionId = focusId ? configuration.filters.find(contains)?.id : '';
  const orderKey = configuration.filters.map((node) => `${node.id}:${node.priority}`).join('|');
  useEffect(() => {
    if (!focusId || !focusSectionId) return;
    setOpen((previous) => ({ ...previous, [focusSectionId]: true }));
    // Wait for the same accordion animation used on the storefront. Scroll
    // only the preview's filter viewport, leaving the admin editor in place.
    const timer = window.setTimeout(() => {
      const target = Array.from(container.current?.querySelectorAll('[data-filter-id]') || []).find((element) => element.dataset.filterId === focusId);
      if (!target) return;
      let viewport = container.current;
      while (viewport && !['auto', 'scroll'].includes(window.getComputedStyle(viewport).overflowY)) viewport = viewport.parentElement;
      if (!viewport) return;
      viewport.scrollTo({ top: Math.max(0, viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 64), behavior: 'smooth' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [focusId, focusSectionId, orderKey]);
  const paramsKey = params.toString();
  const filterAnchor = useFilterAnchor(paramsKey, container);
  const facets = useMemo(() => {
    const selections = new URLSearchParams(paramsKey);
    return new Map(filterLeaves(configuration).map((node) => {
      // Ignore only this leaf. Other leaves, including siblings in a group,
      // still constrain its choices. Multi-choice OR stays inside this leaf.
      const candidates = filterConfiguredProducts(products, selections, configuration, { fixedGender, ignoreId: node.id });
      const options = node.options.filter((option) => option.visible);
      const selected = selections.getAll(selectionKey(node));
      const selectedOptions = options.filter((option) => selected.includes(option.id));
      const values = options.map((option) => ({ value: option.id, label: option.label, color: option.color, image: option.image, count: candidates.filter((product) => optionMatches(product, option) && (node.match !== 'all' || selectedOptions.filter((other) => other.id !== option.id).every((other) => optionMatches(product, other)))).length }))
        // Keep incompatible selections removable instead of silently clearing
        // them or leaving invisible active constraints in the URL.
        .filter((value) => showUnavailableOptions || value.count > 0 || selected.includes(value.value));
      const approvedNumbers = options.flatMap((option) => option.conditions.flatMap((condition) => condition.values)).map(numericFilterValue).filter(Boolean);
      const numbers = node.style === 'range' ? [...new Set((showUnavailableOptions ? approvedNumbers : candidates.flatMap((product) => sourceValues(product, node.sources[0])).map(numericFilterValue).filter(Boolean)
        .filter((value) => node.sources[0] === 'price' || approvedNumbers.some((approved) => approved.number === value.number && approved.unit === value.unit))).map((value) => value.number))].sort((a, b) => a - b) : [];
      return [node.id, { values, selected, numbers }];
    }));
  }, [products, configuration, fixedGender, paramsKey, showUnavailableOptions]);
  const movementTypes = filterLeaves(configuration).filter((node) => movementFilterRole(node) === 'type');
  const movementTypeSelected = movementTypes.some((node) => params.has(selectionKey(node)));
  const available = (node) => {
    if (!node.visible || (fixedGender && node.sources.includes('gender'))) return false;
    if (node.mode === 'group') return node.children.some(available);
    if (!showUnavailableOptions && movementTypes.length && movementFilterRole(node) === 'model' && !movementTypeSelected) return false;
    const facet = facets.get(node.id);
    return node.style === 'range' ? facet.numbers.length > 0 || params.has(rangeKey(node, 'min')) || params.has(rangeKey(node, 'max')) : facet.values.length > 0;
  };
  const setParams = (mutate) => {
    const next = new URLSearchParams(params);
    mutate(next);
    filterAnchor.prepare();
    const normalized = configuredFilterParams(next, configuration, fixedGender);
    if (onParams) onParams(normalized); else setUrlParams(normalized, { replace: true });
  };
  const clearNode = (node) => setParams((next) => filterLeaves({ filters: [node] }).forEach((leaf) => {
    next.delete(selectionKey(leaf)); next.delete(rangeKey(leaf, 'min')); next.delete(rangeKey(leaf, 'max'));
  }));
  const clearAll = () => setParams((next) => [...next.keys()].filter((key) => key.startsWith('cf_')).forEach((key) => next.delete(key)));
  const toggle = (node, id) => setParams((next) => {
    const key = selectionKey(node); const ids = new Set(next.getAll(key));
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    next.delete(key); ids.forEach((value) => next.append(key, value));
  });
  const chips = configuredFilterChips(params, configuration);
  const content = (node) => {
    if (node.mode === 'group') return orderedNodes(node.children).filter(available).map((child) => (
      <div className="filter-subsection" data-filter-id={child.id} key={child.id}><h4 className="filter-subsection-title">{child.title}</h4>{child.description && <p className="configured-filter-description">{child.description}</p>}{content(child)}</div>
    ));
    const { values, selected, numbers } = facets.get(node.id);
    if (node.style === 'color') return <FilterOptions values={values} selected={selected} limit={(node.columns || 5) * 3}>{(visible) => <ColorFilter values={visible} selected={selected} onToggle={(id) => toggle(node, id)} label={node.title} columns={node.columns || 5} showCounts={node.showCounts} />}</FilterOptions>;
    if (node.style === 'material') return <FilterOptions values={values} selected={selected}>{(visible) => <MaterialFilter values={visible} selected={selected} onToggle={(id) => toggle(node, id)} label={node.title} showCounts={node.showCounts} />}</FilterOptions>;
    if (node.style === 'range') {
      if (!numbers.length) return <p className="configured-filter-description">Nema dostupnih vrednosti.</p>;
      const minKey = rangeKey(node, 'min'); const maxKey = rangeKey(node, 'max');
      const min = params.has(minKey) ? Number(params.get(minKey)) : numbers[0];
      const max = params.has(maxKey) ? Number(params.get(maxKey)) : numbers.at(-1);
      const setRange = (from, to) => setParams((next) => { next.set(minKey, from); next.set(maxKey, to); });
      if (/^(precnik|diameter|case diameter)/.test(node.sources[0].replace(/^spec:/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ').toLowerCase())) {
        // Retain explicitly selected endpoints even when another facet leaves
        // no watch at that exact size, so the displayed range still matches
        // the active URL instead of silently showing a different selection.
        const diameterRaw = [...new Set([...numbers, ...(params.has(minKey) ? [min] : []), ...(params.has(maxKey) ? [max] : [])])].sort((a, b) => a - b).map((number) => `${number}mm`);
        return <DiameterFilter values={diameterRaw} selected={params.has(minKey) || params.has(maxKey) ? diameterRaw.filter((value) => { const number = numericFilterValue(value).number; return number >= min && number <= max; }) : []}
          onChange={(chosen) => { const sizes = chosen.map((value) => numericFilterValue(value).number); if (sizes.length) setRange(Math.min(...sizes), Math.max(...sizes)); }} />;
      }
      const lower = Math.min(node.sources[0] === 'price' ? 0 : numbers[0], min);
      const upper = Math.max(numbers.at(-1), max);
      const from = params.has(minKey) ? min : lower;
      return <RangeFilterSlider node={node} lower={lower} upper={upper} from={from} to={max} onChange={setRange} />;
    }
    return <FilterOptions values={values} selected={selected}>{(visible) => <div className="filter-list" role="group" aria-label={node.title} style={node.columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${node.columns}, minmax(0, 1fr))` } : undefined}>{visible.map((value) => <label key={value.value} className={`filter-row ${selected.includes(value.value) ? 'is-active' : ''}`}>
      <input className="filter-input-hidden" type="checkbox" checked={selected.includes(value.value)} onChange={() => toggle(node, value.value)} />
      <span className="filter-text">{value.label}</span>{node.showCounts && <span className="filter-count">{value.count}</span>}
      {selected.includes(value.value) && <div className="filter-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></div>}
    </label>)}</div>}</FilterOptions>;
  };
  return <aside ref={container} {...filterAnchor.events} className="filters card glass configured-filters" aria-label="Filteri kataloga" data-lenis-prevent>
    <div className="f-top"><h3 className="f-top-title">Filteri</h3><div className="f-top-actions">{chips.length > 0 && <><span className="f-badge">{chips.length}</span><button type="button" className="f-clear" onClick={clearAll}>Očisti sve</button></>}</div></div>
    <div className="f-scroll-container">
    {orderedNodes(configuration.filters).filter(available).map((node) => {
      const expanded = open[node.id] ?? (expandIds.includes(node.id) || node.open);
      const active = chips.filter((chip) => filterLeaves({ filters: [node] }).some((leaf) => [selectionKey(leaf), `range:${leaf.id}`].includes(chip.key))).length;
      return <div className={`f-section ${expanded ? 'is-open' : ''}`} data-filter-id={node.id} key={node.id}>
        <SectionHeader title={node.title} count={active} onClear={() => clearNode(node)} isOpen={expanded} onToggle={() => setOpen((previous) => ({ ...previous, [node.id]: !expanded }))} />
        <AnimatePresence initial={false}>
          {expanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="f-content-wrapper"><div className="f-content-inner">{node.description && <p className="configured-filter-description">{node.description}</p>}{content(node)}</div></motion.div>}
        </AnimatePresence>
      </div>;
    })}
    <div className="f-bottom-actions">
      {chips.length > 0 && <button type="button" className="btn-large-reset" onClick={clearAll}>Ukloni sve filtere</button>}
      {onClose && <button type="button" className="btn-large-close" onClick={onClose}>Zatvori filtere</button>}
    </div>
    </div>
  </aside>;
}
