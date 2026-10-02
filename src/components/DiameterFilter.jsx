import React from 'react';
import { diameterValue } from '../utils/catalogFilters.js';
import useSliderDraft from '../hooks/useSliderDraft.js';

const format = (value) => Number(value.toFixed(1)).toLocaleString('sr-Latn');

export default function DiameterFilter({ values, selected, onChange }) {
  const sizes = [...new Set(values.map(diameterValue).filter((value) => value !== null))].sort((a, b) => a - b);
  const chosen = selected.map(diameterValue).filter((value) => value !== null);
  const committedLower = chosen.length ? Math.min(...chosen) : sizes[0] ?? 0;
  const committedUpper = chosen.length ? Math.max(...chosen) : sizes.at(-1) ?? 0;
  const selectRange = (from, to) => onChange(values.filter((value) => {
    const number = diameterValue(value);
    return number !== null && number >= from && number <= to;
  }));
  const { range: [lower, upper], change, finish } = useSliderDraft(committedLower, committedUpper, selectRange, sizes.join(','));
  if (!sizes.length) return null;
  const start = Math.max(0, sizes.indexOf(lower));
  const end = Math.max(start, sizes.indexOf(upper));
  const percent = (index) => sizes.length === 1 ? 50 : index / (sizes.length - 1) * 100;
  const ticks = [...new Set(Array.from({ length: Math.min(5, sizes.length) }, (_, i) =>
    Math.round(i * (sizes.length - 1) / Math.max(1, Math.min(5, sizes.length) - 1))))];
  const presets = [
    { label: 'Manji', sizes: sizes.filter((size) => size < 38) },
    { label: 'Srednji', sizes: sizes.filter((size) => size >= 38 && size <= 42) },
    { label: 'Veći', sizes: sizes.filter((size) => size > 42) },
  ];

  return (
    <div className="diameter-card">
      <output className="diameter-range" aria-live="polite">{format(lower)} mm — {format(upper)} mm</output>
      <div className="diameter-slider">
        <div className="diameter-track" />
        <div className="diameter-fill" style={{ left: `${percent(start)}%`, width: `${percent(end) - percent(start)}%` }} />
        {ticks.map((index) => <span key={index} className={`diameter-dot ${index >= start && index <= end ? 'is-selected' : ''}`} style={{ left: `${percent(index)}%` }} />)}
        <input {...finish} className="diameter-thumb" type="range" min="0" max={sizes.length - 1} step="1" value={start}
          style={{ zIndex: start === end && end === sizes.length - 1 ? 5 : 3 }}
          disabled={sizes.length === 1} aria-label="Prečnik kućišta od" aria-valuetext={`${format(lower)} mm`}
          onChange={(event) => change([sizes[Math.min(Number(event.target.value), end)], upper])} />
        <input {...finish} className="diameter-thumb" type="range" min="0" max={sizes.length - 1} step="1" value={end}
          disabled={sizes.length === 1} aria-label="Prečnik kućišta do" aria-valuetext={`${format(upper)} mm`}
          onChange={(event) => change([lower, sizes[Math.max(Number(event.target.value), start)]])} />
      </div>
      <div className="diameter-ticks">
        {ticks.map((index) => <span key={index} style={{ left: `${percent(index)}%` }}>{format(sizes[index])}</span>)}
      </div>
      <svg className="diameter-watch" viewBox="0 0 150 170" aria-hidden="true">
        <path d="M53 7 Q54 2 60 2 H90 Q96 2 97 7 L100 23 H50 Z M50 145 H100 L97 162 Q96 168 90 168 H60 Q54 168 53 162 Z" fill="#c7c7c7" />
        <path d="M49 22 L101 22 L109 38 H41 Z M41 132 H109 L101 148 H49 Z" fill="#bdbdbd" />
        <rect x="132" y="76" width="8" height="17" rx="3" fill="#c7c7c7" />
        <circle cx="75" cy="85" r="53" fill="#c3c3c3" />
        <circle cx="75" cy="85" r="44" fill="#f7f7f7" stroke="#e8e8e8" strokeWidth="2" />
        <text x="75" y="78" textAnchor="middle" className="diameter-watch-value">{format(lower)}–{format(upper)}</text>
        <path d="M31 87 H119" stroke="#333" strokeWidth="2" strokeDasharray="2 1" />
        <path d="M29 87 L37 82 V92 Z M121 87 L113 82 V92 Z" fill="#333" />
        <text x="75" y="106" textAnchor="middle" fill="#777" fontSize="16">mm</text>
      </svg>
      <div className="diameter-presets">
        {presets.map((preset) => {
          const from = preset.sizes[0];
          const to = preset.sizes.at(-1);
          const active = chosen.length > 0 && lower === from && upper === to;
          return <button key={preset.label} type="button" disabled={!preset.sizes.length} aria-pressed={active}
            className={active ? 'is-active' : ''} onClick={() => selectRange(from, to)}>{preset.label}</button>;
        })}
      </div>
    </div>
  );
}
