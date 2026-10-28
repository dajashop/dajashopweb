import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useId, useState } from 'react';

export default function FilterOptions({ values, selected = [], limit = 3, children }) {
  const { t: translateText } = useStorefront();

  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const visible = expanded ? values : values.filter((value, index) => index < limit || selected.includes(value.value));
  const hidden = values.length - visible.length;
  return <div className="filter-options">
    <div id={id} className={hidden > 0 ? 'filter-options-faded' : undefined}>{translateText(children(visible))}</div>
    {hidden > 0 && <div className="filter-options-reveal">
      <button type="button" className="filter-show-more filter-show-more-overlay"
        aria-expanded={false} aria-controls={id} onClick={() => setExpanded(true)}>{translateText("Prikaži više ")}<span className="filter-show-more-count">({translateText(hidden)})</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>}
    {expanded && values.length > limit && <button type="button" className="filter-show-more"
      aria-expanded={true} aria-controls={id} onClick={() => setExpanded(false)}>{translateText("Prikaži manje")}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
    </button>}
  </div>;
}
