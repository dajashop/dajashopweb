import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ColorFilter from './ColorFilter.jsx';
import MaterialFilter from './MaterialFilter.jsx';
import DiameterFilter from './DiameterFilter.jsx';
import SectionHeader from './FilterSectionHeader.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { configuredFilterParams, configuredFilterChips, filterConfiguredProducts, filterLeaves, numericFilterValue, optionMatches, orderedNodes, rangeKey, selectionKey } from '../utils/filterConfiguration.js';
import './Filters.css';

export default function ConfiguredFilters({ products, configuration, fixedGender, onClose, params: previewParams, onParams }) {
  const [urlParams, setUrlParams] = useSearchParams();
  const params = configuredFilterParams(previewParams || urlParams, configuration, fixedGender);
  const [open, setOpen] = useState({});
  const setParams = (mutate) => {
    const next = new URLSearchParams(params);
    mutate(next);
    if (onParams) onParams(next); else setUrlParams(next, { replace: true });
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
    if (node.mode === 'group') return orderedNodes(node.children).filter((child) => child.visible && !(fixedGender && child.sources.includes('gender'))).map((child) => (
      <div className="filter-subsection" key={child.id}><h4 className="filter-subsection-title">{child.title}</h4>{child.description && <p className="configured-filter-description">{child.description}</p>}{content(child)}</div>
    ));
    const candidates = filterConfiguredProducts(products, params, configuration, { fixedGender, ignoreId: node.id });
    const options = node.options.filter((option) => option.visible);
    const selected = params.getAll(selectionKey(node));
    const values = options.map((option) => ({ value: option.id, label: option.label, color: option.color, image: option.image, count: candidates.filter((product) => optionMatches(product, option) && (node.match !== 'all' || options.filter((other) => other.id !== option.id && selected.includes(other.id)).every((other) => optionMatches(product, other)))).length }));
    if (node.style === 'color') return <ColorFilter values={values} selected={selected} onToggle={(id) => toggle(node, id)} label={node.title} columns={node.columns} showCounts={node.showCounts} />;
    if (node.style === 'material') return <MaterialFilter values={values} selected={selected} onToggle={(id) => toggle(node, id)} label={node.title} showCounts={node.showCounts} />;
    if (node.style === 'range') {
      const raw = [...new Set(options.flatMap((option) => option.conditions.flatMap((condition) => condition.values)))].filter((value) => numericFilterValue(value));
      const numbers = raw.map((value) => numericFilterValue(value).number).sort((a, b) => a - b);
      if (!numbers.length) return <p className="configured-filter-description">Nema dostupnih vrednosti.</p>;
      const minKey = rangeKey(node, 'min'); const maxKey = rangeKey(node, 'max');
      const min = params.has(minKey) ? Number(params.get(minKey)) : numbers[0];
      const max = params.has(maxKey) ? Number(params.get(maxKey)) : numbers.at(-1);
      const setRange = (from, to) => setParams((next) => { next.set(minKey, from); next.set(maxKey, to); });
      if (/^(precnik|diameter|case diameter)/.test(node.sources[0].replace(/^spec:/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ').toLowerCase())) {
        const diameterRaw = raw.map((value) => `${numericFilterValue(value).number}mm`);
        return <DiameterFilter values={diameterRaw} selected={params.has(minKey) || params.has(maxKey) ? diameterRaw.filter((value) => { const number = numericFilterValue(value).number; return number >= min && number <= max; }) : []}
          onChange={(chosen) => { const sizes = chosen.map((value) => numericFilterValue(value).number); if (sizes.length) setRange(Math.min(...sizes), Math.max(...sizes)); }} />;
      }
      const lower = node.sources[0] === 'price' ? 0 : numbers[0];
      const upper = numbers.at(-1);
      const from = params.has(minKey) ? min : lower;
      const percent = (value) => upper > lower ? (value - lower) / (upper - lower) * 100 : 0;
      return <div className="price-wrapper">
        <div className="price-values"><span>{from.toLocaleString('sr-Latn')} {node.unit}</span><span>{max.toLocaleString('sr-Latn')} {node.unit}</span></div>
        <div className="slider-container">
          <div className="slider-track-bg" />
          <div className="slider-track-fill" style={{ left: `${percent(from)}%`, width: `${percent(max) - percent(from)}%` }} />
          <input className="thumb thumb--left" style={{ zIndex: from > upper - 100 ? 5 : 3 }} type="range" aria-label={`${node.title} od`} min={lower} max={upper} step={node.sources[0] === 'price' ? 1 : .1} value={from} onChange={(event) => setRange(Math.min(Number(event.target.value), max), max)} />
          <input className="thumb thumb--right" style={{ zIndex: 4 }} type="range" aria-label={`${node.title} do`} min={lower} max={upper} step={node.sources[0] === 'price' ? 1 : .1} value={max} onChange={(event) => setRange(from, Math.max(Number(event.target.value), from))} />
        </div>
      </div>;
    }
    return <div className="filter-list" role="group" aria-label={node.title} style={node.columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${node.columns}, minmax(0, 1fr))` } : undefined}>{values.map((value) => <label key={value.value} className={`filter-row ${selected.includes(value.value) ? 'is-active' : ''}`}>
      <input className="filter-input-hidden" type="checkbox" checked={selected.includes(value.value)} onChange={() => toggle(node, value.value)} />
      <span className="filter-text">{value.label}</span>{node.showCounts && <span className="filter-count">{value.count}</span>}
      {selected.includes(value.value) && <div className="filter-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></div>}
    </label>)}</div>;
  };
  return <aside className="filters card glass configured-filters" aria-label="Filteri kataloga" data-lenis-prevent>
    <div className="f-top"><h3 className="f-top-title">Filteri</h3><div className="f-top-actions">{chips.length > 0 && <><span className="f-badge">{chips.length}</span><button type="button" className="f-clear" onClick={clearAll}>Očisti sve</button></>}</div></div>
    <div className="f-scroll-container">
    {orderedNodes(configuration.filters).filter((node) => node.visible && !(fixedGender && node.sources.includes('gender'))).map((node) => {
      const expanded = open[node.id] ?? node.open;
      const active = chips.filter((chip) => filterLeaves({ filters: [node] }).some((leaf) => [selectionKey(leaf), `range:${leaf.id}`].includes(chip.key))).length;
      return <div className={`f-section ${expanded ? 'is-open' : ''}`} key={node.id}>
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
