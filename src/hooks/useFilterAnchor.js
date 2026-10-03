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
    const panel = container.current;
    if (!saved?.pending || !panel) return;
    saved.pending = false;
    let viewport = panel;
    while (viewport && !['auto', 'scroll'].includes(window.getComputedStyle(viewport).overflowY)) {
      viewport = viewport.parentElement;
    }
    if (!viewport) return;
    const sidebar = panel.closest('.sidebar-filters');
    const layout = sidebar?.closest('.catalog-layout');

    const restore = () => {
      if (anchor.current !== saved || !panel.contains(saved.control)) return;
      const delta = saved.control.getBoundingClientRect().top - saved.top;
      if (Math.abs(delta) < 0.25) return;
      viewport.scrollTop += delta;
      const remaining = saved.control.getBoundingClientRect().top - saved.top;
      if (Math.abs(remaining) < 0.25 || !sidebar || !layout) return;

      // At either end of the real filter content, move the document instead
      // of adding empty space. A sticky sidebar only moves with the document
      // before its top stop or after reaching the catalog's bottom boundary.
      const wantedTop = sidebar.getBoundingClientRect().top - remaining;
      const stickyTop = parseFloat(window.getComputedStyle(sidebar).top) || 0;
      let pageTop;
      if (wantedTop < stickyTop) {
        const layoutBottom = layout.getBoundingClientRect().bottom + window.scrollY;
        const bottomPadding = parseFloat(window.getComputedStyle(layout).paddingBottom) || 0;
        pageTop = layoutBottom - bottomPadding - sidebar.offsetHeight - wantedTop;
      } else {
        const previousPosition = sidebar.style.position;
        sidebar.style.position = 'static';
        const naturalTop = sidebar.getBoundingClientRect().top + window.scrollY;
        sidebar.style.position = previousPosition;
        pageTop = naturalTop - wantedTop;
      }
      window.scrollTo({ top: Math.max(0, pageTop), left: window.scrollX, behavior: 'instant' });
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
