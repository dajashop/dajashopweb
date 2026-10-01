import React from 'react';
import leather from '../assets/filter-materials/leather.webp';
import steel from '../assets/filter-materials/steel.webp';
import titanium from '../assets/filter-materials/titanium.webp';
import silicone from '../assets/filter-materials/silicone.webp';
import resin from '../assets/filter-materials/resin.webp';

export function isBraceletMaterialSpec(key) {
  const label = String(key || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /(narukvic|kais|bracelet|strap|band)/.test(label) && /(materijal|material)/.test(label);
}

function materialImage(value) {
  const label = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(koz|leather)/.test(label)) return leather;
  if (/(celik|steel|inox|metal|mesh)/.test(label)) return steel;
  if (/(titan|titanium)/.test(label)) return titanium;
  if (/(silikon|silicone)/.test(label)) return silicone;
  if (/(gum|rubber|resin|smol|plast|kaucuk)/.test(label)) return resin;
  return null;
}

export default function MaterialFilter({ values, selected, onToggle, label }) {
  return (
    <div className="material-filter-list" role="group" aria-label={label}>
      {values.map(({ value, count }) => {
        const image = materialImage(value);
        return (
          <button key={value} type="button" className={`material-filter-row ${selected.includes(value) ? 'is-active' : ''}`}
            aria-pressed={selected.includes(value)} onClick={() => onToggle(value)}>
            {image ? <img className="material-filter-image" src={image} alt="" width="42" height="42" loading="lazy" />
              : <span className="material-filter-image material-filter-placeholder" aria-hidden="true">◇</span>}
            <span className="material-filter-name">{value}</span>
            <span className="material-filter-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
