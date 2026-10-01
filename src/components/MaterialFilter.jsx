import React from 'react';
import leather from '../assets/filter-materials/leather.webp';
import steel from '../assets/filter-materials/steel.webp';
import titanium from '../assets/filter-materials/titanium.webp';
import silicone from '../assets/filter-materials/silicone.webp';
import resin from '../assets/filter-materials/resin.webp';
import quartz from '../assets/filter-movements/quartz.webp';
import automatic from '../assets/filter-movements/automatic.webp';

export function isBraceletMaterialSpec(key) {
  const label = String(key || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /(narukvic|kais|bracelet|strap|band)/.test(label) && /(materijal|material)/.test(label);
}

function materialImage(value) {
  const label = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (/^(kvarc(?:ni)?|quartz)$/.test(label)) return quartz;
  if (/^(automatski|automatik|automatic|self[- ]winding)$/.test(label)) return automatic;
  if (/(koz|leather)/.test(label)) return leather;
  if (/(celik|steel|inox|metal|mesh)/.test(label)) return steel;
  if (/(titan|titanium)/.test(label)) return titanium;
  if (/(silikon|silicone)/.test(label)) return silicone;
  if (/(gum|rubber|resin|smol|plast|kaucuk)/.test(label)) return resin;
  return null;
}

export default function MaterialFilter({ values, selected, onToggle, label, showCounts = true }) {
  return (
    <div className="material-filter-list" role="group" aria-label={label}>
      {values.map(({ value, label: name = value, count, image: customImage }) => {
        const image = customImage || materialImage(name);
        return (
          <button key={value} type="button" className={`material-filter-row ${selected.includes(value) ? 'is-active' : ''}`}
            aria-pressed={selected.includes(value)} onClick={() => onToggle(value)}>
            {image ? <img className="material-filter-image" src={image} alt="" width="42" height="42" loading="lazy" />
              : <span className="material-filter-image material-filter-placeholder" aria-hidden="true">◇</span>}
            <span className="material-filter-name">{name}</span>
            {showCounts && <span className="material-filter-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
