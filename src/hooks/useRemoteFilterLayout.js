import { useEffect, useLayoutEffect, useRef } from 'react';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Allocate whole visible rows from the real viewport budget. The observer
// watches width (and the drawer viewport), never our own changing list heights.
export default function useRemoteFilterLayout(container, enabled) {
  const measure = useRef(() => {});
  measure.current = () => {
    const panel = container.current;
    if (!enabled || !panel || !panel.clientWidth) return;
    const drawer = panel.closest('.fd-content');
    const style = getComputedStyle(panel);
    const drawerStyle = drawer && getComputedStyle(drawer);
    const available = drawer
      ? drawer.clientHeight - parseFloat(drawerStyle.paddingTop) - parseFloat(drawerStyle.paddingBottom)
      : parseFloat(style.maxHeight);
    if (!Number.isFinite(available) || available <= 0) return;
    const lists = [...panel.querySelectorAll('[data-remote-filter-list]')].map(element => {
      const rows = [...element.querySelectorAll('.filter-row')];
      const gap = parseFloat(getComputedStyle(element.querySelector('.filter-list') || element).rowGap) || 0;
      const heights = [0];
      for (const row of rows.slice(0, 7)) heights.push(heights.at(-1) + row.getBoundingClientRect().height + (heights.length > 1 ? gap : 0));
      return { element, heights, count: heights.length - 1 };
    }).filter(list => list.count);
    if (!lists.length) return;
    const chrome = panel.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      - lists.reduce((sum, list) => sum + list.element.getBoundingClientRect().height, 0);
    const budget = Math.max(0, available - chrome - 2);
    const order = [...lists].sort((a, b) => Number(a.element.dataset.remoteFilterList !== 'category') - Number(b.element.dataset.remoteFilterList !== 'category'));
    const total = () => lists.reduce((sum, list) => sum + list.heights[list.count], 0);
    let cursor = 0;
    while (total() > budget && order.some(list => list.count > 1)) {
      const list = order[cursor++ % order.length];
      if (list.count > 1) list.count--;
    }
    // On very short landscape screens keep scrolling inside the lists, even
    // when only part of one row fits, rather than creating a panel scrollbar.
    const remaining = total();
    for (const list of lists) {
      const height = Math.max(0, Math.floor(list.heights[list.count] * (remaining > budget ? budget / remaining : 1)));
      const value = `${height}px`;
      if (list.element.style.getPropertyValue('--remote-list-height') !== value) list.element.style.setProperty('--remote-list-height', value);
    }
  };

  // Recompute before paint when facets or accordion state change; no setState,
  // resize animation, timeout-based height guess or observer feedback loop.
  useBrowserLayoutEffect(() => { measure.current(); });
  useEffect(() => {
    const panel = container.current;
    if (!enabled || !panel) return undefined;
    const drawer = panel.closest('.fd-content');
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => measure.current()); };
    let width = panel.clientWidth;
    let height = drawer?.clientHeight;
    let maxHeight = getComputedStyle(panel).maxHeight;
    const observer = new ResizeObserver(() => {
      const nextWidth = panel.clientWidth;
      const nextHeight = drawer?.clientHeight;
      const nextMaxHeight = getComputedStyle(panel).maxHeight;
      if (nextWidth !== width || nextHeight !== height || nextMaxHeight !== maxHeight) { width = nextWidth; height = nextHeight; maxHeight = nextMaxHeight; schedule(); }
    });
    observer.observe(panel);
    if (drawer) observer.observe(drawer);
    // AnimatePresence may remove a closed section after its parent render.
    // Child-list changes reclaim that space; our CSS writes are not observed.
    const contentObserver = new MutationObserver(schedule);
    contentObserver.observe(panel, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); contentObserver.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [container, enabled]);
}
