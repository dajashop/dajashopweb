import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ColorFilter from './ColorFilter.jsx';
import MaterialFilter from './MaterialFilter.jsx';
import DiameterFilter from './DiameterFilter.jsx';
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
      return <div className="configured-numeric-range">
        <output>{min.toLocaleString('sr-Latn')} — {max.toLocaleString('sr-Latn')} {node.unit}</output>
        <label>Od<input type="range" aria-label={`${node.title} od`} min={numbers[0]} max={numbers.at(-1)} step={node.sources[0] === 'price' ? 1 : .1} value={min} onChange={(event) => setRange(Math.min(Number(event.target.value), max), max)} /></label>
        <label>Do<input type="range" aria-label={`${node.title} do`} min={numbers[0]} max={numbers.at(-1)} step={node.sources[0] === 'price' ? 1 : .1} value={max} onChange={(event) => setRange(min, Math.max(Number(event.target.value), min))} /></label>
      </div>;
    }
    return <div className="filter-list" role="group" aria-label={node.title} style={node.columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${node.columns}, minmax(0, 1fr))` } : undefined}>{values.map((value) => <label key={value.value} className={`filter-row ${selected.includes(value.value) ? 'is-active' : ''}`}>
      <input type="checkbox" checked={selected.includes(value.value)} onChange={() => toggle(node, value.value)} />
      <span className="filter-text">{value.label}</span>{node.showCounts && <span className="filter-count">{value.count}</span>}
    </label>)}</div>;
  };
  return <aside className="filters card glass configured-filters" aria-label="Filteri kataloga" data-lenis-prevent>
    <div className="f-top"><h3 className="f-top-title">Filteri</h3>{chips.length > 0 && <button type="button" className="f-clear" onClick={clearAll}>Očisti sve</button>}</div>
    {orderedNodes(configuration.filters).filter((node) => node.visible && !(fixedGender && node.sources.includes('gender'))).map((node) => {
      const expanded = open[node.id] ?? node.open;
      const active = chips.filter((chip) => filterLeaves({ filters: [node] }).some((leaf) => [selectionKey(leaf), `range:${leaf.id}`].includes(chip.key))).length;
      return <div className="f-section" key={node.id}>
        <div className="f-head"><button type="button" className="configured-filter-heading" aria-expanded={expanded} onClick={() => setOpen((previous) => ({ ...previous, [node.id]: !expanded }))}><span className="f-title">{node.title}</span><span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span></button>
          {active > 0 && <button type="button" className="f-clear" onClick={() => clearNode(node)}>Očisti</button>}</div>
        {expanded && <div className="f-content-inner">{node.description && <p className="configured-filter-description">{node.description}</p>}{content(node)}</div>}
      </div>;
    })}
    {onClose && <button type="button" className="btn-large-close" onClick={onClose}>Zatvori filtere</button>}
  </aside>;
}
