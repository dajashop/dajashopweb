import React, { useId, useState } from 'react';

export default function FilterOptions({ values, selected = [], limit = 3, children }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const visible = expanded ? values : values.filter((value, index) => index < limit || selected.includes(value.value));
  const hidden = values.length - visible.length;
  const preview = hidden > 0 ? values.find((value) => !visible.includes(value)) : null;
  return <div className="filter-options">
    <div id={id}>{children(visible)}</div>
    {preview && <div className="filter-options-reveal">
      <div className="filter-options-preview" aria-hidden="true" inert="">{children([preview])}</div>
      <button type="button" className="filter-show-more filter-show-more-overlay"
        aria-expanded={false} aria-controls={id} onClick={() => setExpanded(true)}>
        Prikaži više <span className="filter-show-more-count">({hidden})</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>}
    {expanded && values.length > limit && <button type="button" className="filter-show-more"
      aria-expanded={true} aria-controls={id} onClick={() => setExpanded(false)}>
      Prikaži manje
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
    </button>}
  </div>;
}
