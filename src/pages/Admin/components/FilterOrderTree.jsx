import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Layers, EyeOff } from 'lucide-react';
import { orderedNodes } from '../../../utils/filterConfiguration.js';

const styleNames = { checkbox: 'Lista izbora', color: 'Boje', material: 'Materijali', range: 'Slider od–do' };

function reorder(nodes, fromId, targetId, position) {
  const sorted = orderedNodes(nodes);
  const from = sorted.findIndex((node) => node.id === fromId);
  const target = sorted.findIndex((node) => node.id === targetId);
  if (from >= 0 && target >= 0 && from !== target) {
    const [moved] = sorted.splice(from, 1);
    const to = sorted.findIndex((node) => node.id === targetId) + (position === 'after' ? 1 : 0);
    sorted.splice(to, 0, moved);
    return sorted.map((node, priority) => ({ ...node, priority }));
  }
  return nodes.map((node) => ({ ...node, children: reorder(node.children, fromId, targetId, position) }));
}

export default function FilterOrderTree({ nodes, activeId, selectedIds, onSelect, onSelection, onMove, onReorder, disabled }) {
  const root = useRef(null);
  const drag = useRef(null);
  const frame = useRef(null);
  const [dragView, setDragView] = useState(null);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = null;
    drag.current = null;
    setDragView(null);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => { if (disabled) stop(); }, [disabled]);

  const locate = () => {
    const current = drag.current;
    if (!current?.started) return;
    const row = document.elementFromPoint(current.x, current.y)?.closest('[data-fm-node]');
    const valid = row && root.current?.contains(row) && row.dataset.fmParent === current.parentId && row.dataset.fmNode !== current.id;
    current.targetId = valid ? row.dataset.fmNode : null;
    current.position = valid && current.y >= row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2 ? 'after' : 'before';
    setDragView((previous) => previous?.id === current.id && previous?.targetId === current.targetId && previous?.position === current.position ? previous : { id: current.id, targetId: current.targetId, position: current.position });
  };
  const autoScroll = () => {
    const current = drag.current;
    if (!current) return;
    const sidebar = root.current?.closest('.fm-sidebar');
    if (current.started && sidebar) {
      const rect = sidebar.getBoundingClientRect();
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      if (current.y < top + 40) sidebar.scrollTop -= Math.min(12, (top + 40 - current.y) / 3);
      else if (current.y > bottom - 40) sidebar.scrollTop += Math.min(12, (current.y - bottom + 40) / 3);
      locate();
    }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const start = (event, node, parentId) => {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: node.id, parentId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false };
    frame.current = requestAnimationFrame(autoScroll);
  };
  const update = (event) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX; current.y = event.clientY;
    if (Math.hypot(current.x - current.startX, current.y - current.startY) > 5) current.started = true;
    locate();
  };
  const finish = (event) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX; current.y = event.clientY;
    locate();
    if (!disabled && current.started && current.targetId) onReorder(reorder(nodes, current.id, current.targetId, current.position));
    stop();
  };
  const tree = (siblings, depth = 0, parentId = '') => orderedNodes(siblings).map((node, index, sorted) => (
    <div key={node.id} className={depth ? 'fm-tree-child' : 'fm-tree-item'}>
      <div data-fm-node={node.id} data-fm-parent={parentId} className={`fm-tree-row ${activeId === node.id ? 'is-active' : ''} ${dragView?.id === node.id ? 'is-dragging' : ''} ${dragView?.targetId === node.id ? `drop-${dragView.position}` : ''} ${!node.visible ? 'is-hidden' : ''}`}>
        {depth === 0 && <input type="checkbox" aria-label={`Izaberi ${node.title} za spajanje`} checked={selectedIds.includes(node.id)} disabled={disabled} onChange={(event) => onSelection(event.target.checked ? [...selectedIds, node.id] : selectedIds.filter((id) => id !== node.id))} />}
        <button type="button" className="fm-drag" disabled={disabled} aria-label={`Prevuci ${node.title} za redosled`} title="Prevuci za redosled ili koristi strelice" onPointerDown={(event) => start(event, node, parentId)} onPointerMove={update} onPointerUp={finish} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={(event) => {
          if (event.key === 'Escape') { stop(); return; }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(node.id, event.key === 'ArrowUp' ? -1 : 1); }
        }}><GripVertical size={16} aria-hidden="true" /></button>
        <button className="fm-tree-name" type="button" onClick={() => onSelect(node.id)}><span>{node.mode === 'group' && <Layers size={13} aria-hidden="true" />}{node.title}{!node.visible && <EyeOff size={13} aria-label="Skriven" />}</span><small>{node.mode === 'group' ? `Grupa · ${node.children.length} filtera` : styleNames[node.style] || node.style}</small></button>
        <div className="fm-move-actions">
          <button type="button" className="fm-icon-button" disabled={disabled || index === 0} aria-label={`Pomeri ${node.title} gore`} title="Pomeri gore" onClick={() => onMove(node.id, -1)}><ChevronUp size={16} aria-hidden="true" /></button>
          <button type="button" className="fm-icon-button" disabled={disabled || index === sorted.length - 1} aria-label={`Pomeri ${node.title} dole`} title="Pomeri dole" onClick={() => onMove(node.id, 1)}><ChevronDown size={16} aria-hidden="true" /></button>
        </div>
      </div>
      {node.children.length > 0 && <div className="fm-tree-children">{tree(node.children, depth + 1, node.id)}</div>}
    </div>
  ));
  return <div ref={root} className={`fm-order-tree ${dragView ? 'is-reordering' : ''}`}>{tree(nodes)}</div>;
}
