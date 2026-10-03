import { useLayoutEffect, useRef } from 'react';

// Anchor the actual control, rather than scrollTop: dynamic facets and section
// badges can change the height above it while the catalog scrolls to the top.
export default function useFilterAnchor(paramsKey, suppliedContainer) {
  const ownContainer = useRef(null);
  const container = suppliedContainer || ownContainer;
  const anchor = useRef(null);
  const frame = useRef(0);

  const capture = (event) => {
    cancelAnimationFrame(frame.current);
    const control = event.target.closest('label, button, input');
    anchor.current = control && container.current?.contains(control)
      ? { control, top: control.getBoundingClientRect().top, pending: false }
      : null;
  };

  const prepare = () => {
    if (anchor.current) anchor.current.pending = true;
  };

  const release = () => {
    cancelAnimationFrame(frame.current);
    anchor.current = null;
  };

  useLayoutEffect(() => {
    const saved = anchor.current;
    const viewport = container.current;
    if (!saved?.pending || !viewport) return;
    saved.pending = false;
    const content = viewport.querySelector('.f-scroll-container');
    if (!content) return;

    const restore = () => {
      if (anchor.current !== saved || !viewport.contains(saved.control)) return;
      const delta = saved.control.getBoundingClientRect().top - saved.top;
      if (Math.abs(delta) < 0.25) return;
      const desired = viewport.scrollTop + delta;
      // Leave enough space even when filtering removes almost every option
      // before/after the control. Otherwise the browser clamps scrollTop.
      if (desired < 0) {
        const before = parseFloat(content.style.getPropertyValue('--filter-anchor-before')) || 0;
        content.style.setProperty('--filter-anchor-before', `${before - desired}px`);
      } else {
        const missing = desired - (viewport.scrollHeight - viewport.clientHeight);
        if (missing > 0) {
          const after = parseFloat(content.style.getPropertyValue('--filter-anchor-after')) || 0;
          content.style.setProperty('--filter-anchor-after', `${after + missing}px`);
        }
      }
      viewport.scrollTop += saved.control.getBoundingClientRect().top - saved.top;
    };

    restore();
    // Follow accordion animations and the parent catalog's scroll reset before
    // each paint. A new gesture immediately releases the previous anchor.
    const until = performance.now() + 1000;
    const settle = () => {
      restore();
      if (anchor.current === saved && performance.now() < until) {
        frame.current = requestAnimationFrame(settle);
      }
    };
    frame.current = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame.current);
  }, [paramsKey, container]);

  return {
    container,
    prepare,
    events: {
      onPointerDownCapture: capture,
      onKeyDownCapture: capture,
      onClickCapture: (event) => {
        if (event.detail === 0 && !anchor.current?.pending) capture(event);
      },
      onWheelCapture: release,
      onTouchMoveCapture: release,
    },
  };
}
