import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import { Clock3, Glasses, Info, Palette, Ruler, Settings2, ShieldCheck, Watch } from 'lucide-react';
import { productSpecGroups } from '../../utils/productSpecGroups.js';
import './ProductSpecs.css';

const groupIcons = {
  general: Info, mechanism: Settings2, design: Palette, case: ShieldCheck,
  strap: Watch, functions: Clock3, frame: Glasses, lenses: ShieldCheck, dimensions: Ruler,
  compatibility: Settings2, controls: Clock3, power: Settings2, electrical: Settings2, charging: ShieldCheck,
};

export default function ProductSpecs({ product, embedded = false }) {
  const { t: translateText } = useStorefront();

  const groups = productSpecGroups(product);
  if (!groups.length) return embedded ? <p className="empty-text">{translateText("Nema specifikacija.")}</p> : null;
  const columns = [[], []];
  groups.forEach((group, index) => columns[index % 2].push({ group, index }));

  return (
    <section className={`product-specifications${embedded ? ' product-specifications--embedded' : ''}`} aria-label={translateText("Specifikacije proizvoda")}>
      <h2 className={embedded ? 'sr-only' : 'product-specifications__heading'}>{translateText("Specifikacije")}</h2>
      <div className="product-specifications__grid">
        {columns.filter((column) => column.length).map((column, columnIndex) => (
          <div className="product-specifications__column" key={columnIndex}>
            {column.map(({ group, index }) => {
              const Icon = groupIcons[group.id] || Info;
              return (
                <section key={group.id} className="product-specifications__group" style={{ order: index }}>
                  <h3 className="product-specifications__title"><Icon size={18} strokeWidth={1.6} aria-hidden="true" />{translateText(group.title)}</h3>
                  <dl className="product-specifications__list">
                    {group.entries.map(({ key, label, value }) => <div className="product-specifications__row" key={key}>
                      <dt>{translateText(label)}</dt>
                      <dd>{translateText(value)}</dd>
                    </div>)}
                  </dl>
                </section>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
