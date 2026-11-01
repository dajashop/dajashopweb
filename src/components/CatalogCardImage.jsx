import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './LoadingSkeletons.css';
import ProgressiveImage from './ui/ProgressiveImage.jsx';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Keep the displayed DOM image until the requested DOM image has decoded.
// Only explicit gallery changes crossfade; first-load photos paint natively.
export default function CatalogCardImage({ src, thumbSrc, alt, className, priority, srcSet, sizes }) {
  const { t: translateText } = useStorefront();

  const [loaded, setLoaded] = useState(() => new Set());
  const [shown, setShown] = useState(src);
  const [previous, setPrevious] = useState(null);
  const latest = useRef(src);
  const mounted = useRef(true);
  const gallery = useRef(null);
  latest.current = src;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!previous) return undefined;
    const timer = window.setTimeout(() => setPrevious(null), 180);
    return () => window.clearTimeout(timer);
  }, [shown, previous]);
  const sources = [...new Set([previous, shown, src].filter(Boolean))];
  const reveal = async (url, element) => {
    if (url === shown) return;
    try { await element.decode(); } catch { if (!element.naturalWidth) return; }
    if (!mounted.current || latest.current !== url) return;
    setPrevious(shown); setShown(url);
  };
  // Cached images (including SSR images loaded before hydration) may already
  // be complete before React attaches onLoad. Clear their mask before paint.
  useBrowserLayoutEffect(() => {
    const ready = [...(gallery.current?.querySelectorAll('img') || [])]
      .filter(element => element.complete && element.naturalWidth > 0);
    const newlyLoaded = ready.map(element => element.dataset.gallerySrc).filter(url => !loaded.has(url));
    if (newlyLoaded.length) setLoaded(current => new Set([...current, ...newlyLoaded]));
    const requested = ready.find(element => element.dataset.gallerySrc === src);
    if (requested && src !== shown) void reveal(src, requested);
  });
  return <span ref={gallery} className="catalog-card-gallery" aria-busy={src !== shown || !loaded.has(shown)}>
    {!loaded.has(shown) && <span className="catalog-card-gallery__skeleton loading-block" aria-hidden="true" />}
    {sources.map(url => <ProgressiveImage key={url} src={url}
      data-gallery-src={url}
      thumbSrc={url === src ? thumbSrc : undefined}
      srcSet={url === src ? srcSet : undefined} sizes={url === src && srcSet ? sizes : undefined}
      alt={translateText(url === shown ? alt : '')} aria-hidden={url !== shown || undefined}
      loading={url !== shown || priority ? 'eager' : 'lazy'}
      fetchPriority={url !== shown || priority ? 'high' : 'auto'} draggable={false}
      className={`${className} catalog-card-gallery__layer ${url === shown ? previous ? 'is-revealing' : 'is-shown' : url === previous ? 'is-previous' : 'is-pending'}`}
      onLoad={event => { setLoaded(current => new Set(current).add(url)); void reveal(url, event.currentTarget); }}
      onError={() => setLoaded(current => new Set(current).add(url))} />)}
  </span>;
}
