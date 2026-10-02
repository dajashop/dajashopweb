import { useRef, useState } from 'react';

// Keep dragging local; apply the pending range once the interaction finishes.
export default function useSliderDraft(from, to, onCommit, context = '') {
  const key = `${context}:${from}:${to}`;
  const [draft, setDraft] = useState(null);
  const pending = useRef(null);
  const currentKey = useRef(key);
  currentKey.current = key;
  const range = draft?.key === key ? draft.range : [from, to];
  const change = (next) => {
    pending.current = { key, range: next };
    setDraft(pending.current);
  };
  const commit = () => {
    const next = pending.current;
    pending.current = null;
    setDraft(null);
    if (next?.key === currentKey.current && (next.range[0] !== from || next.range[1] !== to)) onCommit(...next.range);
  };
  const cancel = () => { pending.current = null; setDraft(null); };
  return { range, change, finish: {
    onPointerDown: (event) => event.currentTarget.setPointerCapture(event.pointerId),
    onPointerUp: commit,
    onPointerCancel: cancel,
    onKeyUp: commit,
    onBlur: commit,
  } };
}
