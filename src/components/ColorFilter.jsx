import React from 'react';

export function isColorSpec(key) {
  const label = String(key || '').toLowerCase().replace(/[_-]/g, ' ');
  return /\b(boja|boje|color|colour|colors|colours)\b/.test(label);
}

const PALETTE = [
  [/bel|bijel|white/, '#fafafa', '#e9e9ed', '#111'],
  [/crn|black/, '#171717', '#292929', '#fff'],
  [/teget|navy|tamnoplav|tamno plav/, '#172c4c', '#29466b', '#fff'],
  [/plav|blue/, '#00549d', '#0868b7', '#fff'],
  [/zelen|green|maslin|olive/, '#287541', '#35864e', '#fff'],
  [/crven|red/, '#cf1025', '#e6192e', '#fff'],
  [/krem|cream|bez|beige|ivory|slonovac/, '#f5e7c9', '#fcf1dc', '#111'],
  [/braon|smed|brown/, '#59351c', '#765132', '#fff'],
  [/srebr|silver/, '#bfbfbf', '#dedede', '#111'],
  [/rose gold|roz.*zlat|ruzicast.*zlat/, '#c99583', '#eac0b1', '#111'],
  [/zlat|gold/, '#ae8e34', '#c4a348', '#fff'],
  [/bordo|burgundy|maroon/, '#650f24', '#841b35', '#fff'],
  [/siv|grey|gray|antracit/, '#777b80', '#a2a6ab', '#fff'],
  [/roz|pink/, '#e8a0b4', '#f7c5d4', '#111'],
  [/ljubic|purple|violet/, '#713990', '#9756b7', '#fff'],
  [/narandz|orange/, '#ed731c', '#ff9b45', '#111'],
  [/zut|yellow/, '#f2cc35', '#ffe885', '#111'],
  [/tirkiz|turquoise|teal/, '#168c91', '#47babc', '#fff'],
  [/bakar|copper|bronz|bronze/, '#a66e46', '#d29b73', '#111'],
];

function swatch(value) {
  const normalized = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/viseboj|multicolor|multi color|saren/.test(normalized)) {
    return { background: 'linear-gradient(135deg, #3275bb, #378d55 35%, #e8c354 65%, #bd3650)', color: '#fff' };
  }
  const colors = normalized.split(/[\/+,;&]|\s+i\s+|\s+and\s+|\s*-\s*/)
    .map((part) => PALETTE.find(([pattern]) => pattern.test(part))).filter(Boolean);
  if (colors.length > 1) {
    return { background: `linear-gradient(135deg, ${colors.map((entry, index) => `${entry[1]} ${index / colors.length * 100}%, ${entry[1]} ${(index + 1) / colors.length * 100}%`).join(', ')})`, color: '#fff', textShadow: '0 1px 4px #000' };
  }
  const [, base, highlight, foreground] = colors[0] || [null, '#e2e2e5', '#f5f5f6', '#111'];
  return { background: `linear-gradient(125deg, ${highlight}, ${base})`, color: foreground };
}

export default function ColorFilter({ values, selected, onToggle, label }) {
  return (
    <div className="color-filter-grid" role="group" aria-label={label}>
      {values.map(({ value, count }) => (
        <button key={value} type="button" className={`color-filter-card ${selected.includes(value) ? 'is-active' : ''}`}
          style={swatch(value)} aria-pressed={selected.includes(value)} aria-label={`${value}: ${count} proizvoda`}
          onClick={() => onToggle(value)}>
          <span className="color-filter-count">{count}</span>
          <span className="color-filter-name">{value}</span>
        </button>
      ))}
    </div>
  );
}
