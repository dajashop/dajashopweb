import React from 'react';
import useSliderDraft from '../hooks/useSliderDraft.js';

export default function RangeFilterSlider({ node, lower, upper, from, to, onChange }) {
  const { range: [start, end], change, finish } = useSliderDraft(from, to, onChange, `${node.id}:${lower}:${upper}`);
  const percent = (value) => upper > lower ? (value - lower) / (upper - lower) * 100 : 0;
  return <div className="price-wrapper">
    <div className="price-values"><span>{start.toLocaleString('sr-Latn')} {node.unit}</span><span>{end.toLocaleString('sr-Latn')} {node.unit}</span></div>
    <div className="slider-container">
      <div className="slider-track-bg" />
      <div className="slider-track-fill" style={{ left: `${percent(start)}%`, width: `${percent(end) - percent(start)}%` }} />
      <input {...finish} className="thumb thumb--left" style={{ zIndex: start > upper - 100 ? 5 : 3 }} type="range" aria-label={`${node.title} od`} min={lower} max={upper} step={node.sources[0] === 'price' ? 1 : .1} value={start} onChange={(event) => change([Math.min(Number(event.target.value), end), end])} />
      <input {...finish} className="thumb thumb--right" style={{ zIndex: 4 }} type="range" aria-label={`${node.title} do`} min={lower} max={upper} step={node.sources[0] === 'price' ? 1 : .1} value={end} onChange={(event) => change([start, Math.max(Number(event.target.value), start)])} />
    </div>
  </div>;
}
