import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import './PageScrollbar.css';

const SCROLL_STEP = 40;

export default function PageScrollbar() {
  const { t } = useStorefront();
  const trackRef = useRef(null);
  const laneRef = useRef(null);
  const dragRef = useRef(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const root = document.scrollingElement;
    const track = trackRef.current;
    const lane = laneRef.current;
    if (!root || !track || !lane) return;

    let frame = 0;
    let idleTimer;
    const update = () => {
      frame = 0;
      const { clientHeight: viewport, scrollHeight, scrollTop } = root;
      const max = Math.max(0, scrollHeight - viewport);
      const height = lane.clientHeight;
      if (!max || height <= 28) {
        setMetrics(null);
        return;
      }
      const size = Math.max(28, height * viewport / scrollHeight);
      const value = Math.min(max, Math.max(0, scrollTop));
      setMetrics({ max, size, value, viewport, travel: height - size });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const reveal = () => {
      track.setAttribute('data-active', '');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => track.removeAttribute('data-active'), 1000);
      schedule();
    };
    const revealAtEdge = event => {
      if (event.pointerType === 'mouse' && event.clientX >= window.innerWidth - 8) reveal();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(track.parentElement);
    observer.observe(lane);
    window.addEventListener('scroll', reveal, { passive: true });
    window.addEventListener('pointermove', revealAtEdge, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(idleTimer);
      observer.disconnect();
      window.removeEventListener('scroll', reveal);
      window.removeEventListener('pointermove', revealAtEdge);
      window.removeEventListener('resize', schedule);
      track.removeAttribute('data-active');
    };
  }, []);

  const scrollTo = top => window.scrollTo({ top, behavior: 'instant' });
  const scrollStep = direction => window.scrollBy({ top: direction * SCROLL_STEP, behavior: 'instant' });
  const startDrag = event => {
    if (event.button !== 0 || !event.isPrimary || !metrics.travel) return;
    dragRef.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      top: metrics.value,
      scale: metrics.max / metrics.travel,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.setAttribute('data-dragging', '');
  };
  const moveDrag = event => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      scrollTo(drag.top + (event.clientY - drag.y) * drag.scale);
    }
  };
  const stopDrag = event => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.removeAttribute('data-dragging');
  };

  const handleKey = event => {
    const { max, viewport } = metrics;
    const top = document.scrollingElement.scrollTop;
    const targets = {
      ArrowUp: top - SCROLL_STEP, ArrowDown: top + SCROLL_STEP,
      PageUp: top - viewport, PageDown: top + viewport, Home: 0, End: max,
    };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    scrollTo(targets[event.key]);
  };

  return (
    <div className="page-scrollbar" ref={trackRef}>
      {metrics && <button
        type="button"
        className="page-scrollbar__control page-scrollbar__arrow page-scrollbar__arrow--up"
        aria-label={t('Skroluj gore')}
        onClick={() => scrollStep(-1)}
      ><ChevronUp size={10} aria-hidden="true" /></button>}
      <div className="page-scrollbar__lane" ref={laneRef}>
        {metrics && <div
          className="page-scrollbar__control page-scrollbar__thumb"
          role="scrollbar"
          tabIndex={0}
          aria-label={t('Pomeranje stranice')}
          aria-controls="root"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(metrics.value / metrics.max * 100)}
          style={{
            height: metrics.size,
            transform: `translateY(${metrics.value / metrics.max * metrics.travel}px)`,
          }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onLostPointerCapture={stopDrag}
          onKeyDown={handleKey}
        />}
      </div>
      {metrics && <button
        type="button"
        className="page-scrollbar__control page-scrollbar__arrow page-scrollbar__arrow--down"
        aria-label={t('Skroluj dole')}
        onClick={() => scrollStep(1)}
      ><ChevronDown size={10} aria-hidden="true" /></button>}
    </div>
  );
}
