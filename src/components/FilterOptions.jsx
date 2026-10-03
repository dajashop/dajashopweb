import React, { useId, useState } from 'react';

export default function FilterOptions({ values, selected = [], limit = 3, children }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const visible = expanded ? values : values.filter((value, index) => index < limit || selected.includes(value.value));
  const hidden = values.length - visible.length;
  return <div>
    <div id={id}>{children(visible)}</div>
    {(hidden > 0 || (expanded && values.length > limit)) && <button type="button" className="filter-show-more"
      aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((previous) => !previous)}>
      {expanded ? 'Prikaži manje' : `Prikaži više (${hidden})`}
    </button>}
  </div>;
}
