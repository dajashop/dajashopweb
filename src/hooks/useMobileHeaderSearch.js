import { useLayoutEffect } from 'react';

const MOBILE_HEADER = '(max-width: 768px)';
const EXPAND_NEAR_TOP = 54;
const COLLAPSE_AFTER = 72;
const SCROLL_DOWN = 16;
const SCROLL_UP = 12;

export default function useMobileHeaderSearch({ enabled, startRef, stickyRef, gridRef, slotRef }) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const start = startRef.current;
    const sticky = stickyRef.current;
    const grid = gridRef.current;
    const surface = grid.parentElement;
    const slot = slotRef.current;
    const media = window.matchMedia(MOBILE_HEADER);
    const scrollRoot = document.scrollingElement || document.documentElement;
    let frame = null;
    let previousY = null;
    let travel = 0;

    const scrollIsLocked = () => document.body.style.position === 'fixed'
      || document.documentElement.classList.contains('mobile-search-open');
    let locked = scrollIsLocked();

    function measureSlot() {
      if (!media.matches) return;
      const gridBounds = grid.getBoundingClientRect();
      const slotBounds = slot.getBoundingClientRect();
      grid.style.setProperty('--header-search-compact-x', `${slotBounds.left - gridBounds.left}px`);
      grid.style.setProperty('--header-search-compact-y', `${slotBounds.top - gridBounds.top}px`);
    }

    function updateScroll() {
      frame = null;
      if (!media.matches || locked || scrollIsLocked()) return;

      // Safari can report scroll positions outside the page during a bounce.
      const maxY = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
      const y = Math.max(0, Math.min(window.scrollY, maxY));
      const depth = Math.max(0, Math.min(y, -start.getBoundingClientRect().top));
      const delta = previousY === null ? 0 : y - previousY;
      previousY = y;

      const nearTop = depth <= EXPAND_NEAR_TOP;
      // If a fast return to the top exposes the spacer, restore the row immediately.
      const spacerVisible = nearTop && depth < sticky.offsetHeight - surface.offsetHeight;
      sticky.toggleAttribute('data-search-instant', spacerVisible);
      if (nearTop) {
        sticky.removeAttribute('data-search-collapsed');
        travel = 0;
        return;
      }

      if (delta === 0) return;
      travel = Math.sign(travel) === Math.sign(delta) ? travel + delta : delta;
      const collapsed = sticky.hasAttribute('data-search-collapsed');
      if (!collapsed && depth >= COLLAPSE_AFTER && travel >= SCROLL_DOWN) {
        sticky.setAttribute('data-search-collapsed', '');
        travel = 0;
      } else if (collapsed && travel <= -SCROLL_UP) {
        sticky.removeAttribute('data-search-collapsed');
        travel = 0;
      }
    }

    function onScroll() {
      if (media.matches && frame === null) frame = window.requestAnimationFrame(updateScroll);
    }

    function resetScroll() {
      previousY = null;
      travel = 0;
      onScroll();
    }

    function onLayoutChange() {
      if (!media.matches) return;
      sticky.setAttribute('data-search-instant', '');
      measureSlot();
      resetScroll();
    }

    function onBreakpoint() {
      sticky.removeAttribute('data-search-collapsed');
      onLayoutChange();
    }

    const lockObserver = new MutationObserver(() => {
      const nextLocked = scrollIsLocked();
      if (locked === nextLocked) return;
      locked = nextLocked;
      resetScroll();
    });
    lockObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    lockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(onLayoutChange) : null;
    sizeObserver?.observe(start);
    measureSlot();
    updateScroll();

    if (media.addEventListener) media.addEventListener('change', onBreakpoint);
    else media.addListener(onBreakpoint);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pageshow', resetScroll);
    window.addEventListener('popstate', resetScroll);
    if (!sizeObserver) window.addEventListener('resize', onLayoutChange);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      lockObserver.disconnect();
      sizeObserver?.disconnect();
      if (media.removeEventListener) media.removeEventListener('change', onBreakpoint);
      else media.removeListener(onBreakpoint);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pageshow', resetScroll);
      window.removeEventListener('popstate', resetScroll);
      window.removeEventListener('resize', onLayoutChange);
      sticky.removeAttribute('data-search-collapsed');
      sticky.removeAttribute('data-search-instant');
    };
  }, [enabled, startRef, stickyRef, gridRef, slotRef]);
}
