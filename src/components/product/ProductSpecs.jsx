import React from 'react';
import { Check, Clock3, Glasses, Info, Palette, Ruler, Settings2, ShieldCheck, Watch } from 'lucide-react';
import { productSpecGroups } from '../../utils/productSpecGroups.js';
import './ProductSpecs.css';

const groupIcons = {
  general: Info, mechanism: Settings2, design: Palette, case: ShieldCheck,
  strap: Watch, functions: Clock3, frame: Glasses, lenses: ShieldCheck, dimensions: Ruler,
};

export default function ProductSpecs({ product, embedded = false }) {
  const groups = productSpecGroups(product);
  if (!groups.length) return embedded ? <p className="empty-text">Nema specifikacija.</p> : null;

  return (
    <section className={`product-specifications${embedded ? ' product-specifications--embedded' : ''}`} aria-label="Specifikacije proizvoda">
      <h2 className={embedded ? 'sr-only' : 'product-specifications__heading'}>Specifikacije</h2>
      <div className="product-specifications__grid">
        {groups.map((group) => {
          const Icon = groupIcons[group.id] || Info;
          const badges = group.id === 'functions' ? group.entries.filter((entry) => entry.value === 'Da') : [];
          const rows = group.entries.filter((entry) => !badges.includes(entry));
          return (
            <section key={group.id} className={`product-specifications__group${group.id === 'functions' ? ' product-specifications__group--functions' : ''}`}>
              <h3 className="product-specifications__title"><Icon size={18} strokeWidth={1.6} aria-hidden="true" />{group.title}</h3>
              {rows.length > 0 && <dl className="product-specifications__list">
                {rows.map(({ key, label, value }) => <div className="product-specifications__row" key={key}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>)}
              </dl>}
              {badges.length > 0 && <ul className="product-specifications__features" aria-label="Dostupne funkcije">
                {badges.map(({ key, label }) => <li key={key}><Check size={14} aria-hidden="true" />{label}</li>)}
              </ul>}
            </section>
          );
        })}
      </div>
    </section>
  );
}
