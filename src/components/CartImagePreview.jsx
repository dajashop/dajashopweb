import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { fetchProductBySlug } from '../services/products';
import './CartImagePreview.css';

function productImages(product) {
  const images = Array.isArray(product?.images) && product.images.length ? product.images : [product?.image || product?.mainImageUrl || product?.primaryImageUrl || product?.thumb];
  return [...new Set(images.map(image => typeof image === 'string' ? image : image?.url).filter(Boolean))];
}

export default function CartImagePreview({ item, onClose }) {
  const dialog = useRef(null);
  const touch = useRef(null);
  const titleId = useId();
  const [images, setImages] = useState(() => productImages(item));
  const [index, setIndex] = useState(0);
  const [fetching, setFetching] = useState(Boolean(item.slug));
  const [loadedSource, setLoadedSource] = useState(null);
  const [failedSource, setFailedSource] = useState(null);
  const [galleryError, setGalleryError] = useState(false);
  const move = delta => setIndex(current => (current + delta + images.length) % images.length);

  useLayoutEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    const root = document.documentElement;
    const scrollbarGutter = root.style.scrollbarGutter;
    // Reserve the existing scrollbar space before locking the page.
    if (window.innerWidth > root.clientWidth && getComputedStyle(root).scrollbarGutter === 'auto') {
      root.style.scrollbarGutter = 'stable';
    }
    const lenis = window.lenis;
    const wasStopped = lenis?.isStopped;
    document.body.style.overflow = 'hidden';
    lenis?.stop();
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (!wasStopped) lenis?.start();
      root.style.scrollbarGutter = scrollbarGutter;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!item.slug) return undefined;
    const controller = new AbortController();
    fetchProductBySlug(item.slug, { signal: controller.signal }).then(product => {
      if (controller.signal.aborted) return;
      const gallery = productImages(product);
      if (gallery.length) {
        setImages(gallery);
        setIndex(current => Math.min(current, gallery.length - 1));
      }
    }).catch(() => {
      if (!controller.signal.aborted) setGalleryError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setFetching(false);
    });
    return () => controller.abort();
  }, [item.slug]);

  const source = images[index];
  const loaded = loadedSource === source;
  const failed = failedSource === source;

  return (
    <dialog ref={dialog} className="cart-preview" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={event => {
        if (images.length < 2) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}>
      <div className="cart-preview__panel" data-lenis-prevent>
        <header className="cart-preview__header">
          <div className="cart-preview__title"><p>{item.brand}</p><h2 id={titleId}>{item.name}</h2></div>
          <button type="button" className="cart-preview__button" aria-label="Zatvori pregled slike" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="cart-preview__stage"
          onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
          onTouchCancel={() => { touch.current = null; }}
          onTouchEnd={event => {
            if (!touch.current || images.length < 2) return;
            const dx = event.changedTouches[0].clientX - touch.current.x;
            const dy = event.changedTouches[0].clientY - touch.current.y;
            touch.current = null;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
          }}>
          {source && !failed && <img key={source} src={source} alt={`${item.name} — slika ${index + 1}`} draggable="false"
            className={loaded ? 'is-loaded' : ''} onLoad={() => setLoadedSource(source)} onError={() => setFailedSource(source)} />}
          {source && !loaded && !failed && <Loader2 className="cart-preview__loading" size={28} aria-label="Učitavanje slike" />}
          {(!source || failed) && <p role="status">Slika trenutno nije dostupna.</p>}
          {images.length > 1 && <>
            <button type="button" className="cart-preview__button cart-preview__previous" aria-label="Prethodna slika" onClick={() => move(-1)}><ChevronLeft /></button>
            <button type="button" className="cart-preview__button cart-preview__next" aria-label="Sledeća slika" onClick={() => move(1)}><ChevronRight /></button>
          </>}
        </div>
        <footer className="cart-preview__footer">
          {images.length > 1 && <div className="cart-preview__thumbnails" aria-label="Slike proizvoda">
            {images.map((url, position) => <button key={url} type="button" aria-label={`Prikaži sliku ${position + 1}`} aria-pressed={position === index} onClick={() => setIndex(position)}>
              <img src={url} alt="" loading="lazy" />
            </button>)}
          </div>}
          <p role="status">{fetching ? 'Učitavanje galerije…' : galleryError ? 'Ostale slike trenutno nisu dostupne.' : `Slika ${index + 1} od ${images.length || 1}`}</p>
        </footer>
      </div>
    </dialog>
  );
}
