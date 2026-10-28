export function scrollToServiceSection(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  if (!target) return;

  event.preventDefault();
  // Measure the sticky header: mobile search and navigation can change its height.
  const headerBottom = document.querySelector('.header')?.getBoundingClientRect().bottom || 0;
  const heading = target.querySelector('h2') || target;
  const top = Math.max(0, heading.getBoundingClientRect().top + window.scrollY - Math.max(0, headerBottom) - 24);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' });
}
