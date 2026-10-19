import { useEffect, useRef, useState } from 'react';
import ProgressiveImage from './ui/ProgressiveImage.jsx';

// Keep the displayed DOM image until the requested DOM image has decoded.
// Only explicit gallery changes crossfade; first-load photos paint natively.
export default function CatalogCardImage({ src, thumbSrc, alt, className, priority }) {
  const [shown, setShown] = useState(src);
  const [previous, setPrevious] = useState(null);
  const latest = useRef(src);
  const mounted = useRef(true);
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
  return <span className="catalog-card-gallery" aria-busy={src !== shown}>
    {sources.map(url => <ProgressiveImage key={url} src={url}
      thumbSrc={url === src ? thumbSrc : undefined}
      alt={url === shown ? alt : ''} aria-hidden={url !== shown || undefined}
      loading={url !== shown || priority ? 'eager' : 'lazy'}
      fetchPriority={url !== shown || priority ? 'high' : 'auto'} draggable={false}
      className={`${className} catalog-card-gallery__layer ${url === shown ? previous ? 'is-revealing' : 'is-shown' : url === previous ? 'is-previous' : 'is-pending'}`}
      onLoad={event => { void reveal(url, event.currentTarget); }} />)}
  </span>;
}
