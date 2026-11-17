import { useEffect, useRef, useState } from 'react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import './CheckoutScrollbar.css';

export default function CheckoutScrollbar() {
  const { t } = useStorefront();
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const root = document.scrollingElement;
    const track = trackRef.current;
    if (!root || !track) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const { clientHeight: viewport, scrollHeight, scrollTop } = root;
      const max = Math.max(0, scrollHeight - viewport);
      const height = track.clientHeight;
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
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    observer.observe(track);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const scrollTo = top => window.scrollTo({ top, behavior: 'instant' });
  const startDrag = event => {
    if (event.button !== 0 || !event.isPrimary || !metrics.travel) return;
    dragRef.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      top: metrics.value,
      scale: metrics.max / metrics.travel,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = event => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      scrollTo(drag.top + (event.clientY - drag.y) * drag.scale);
    }
  };
  const stopDrag = event => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleKey = event => {
    const { max, viewport } = metrics;
    const top = document.scrollingElement.scrollTop;
    const targets = {
      ArrowUp: top - 40, ArrowDown: top + 40,
      PageUp: top - viewport, PageDown: top + viewport, Home: 0, End: max,
    };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    scrollTo(targets[event.key]);
  };

  return (
    <div className="checkout-scrollbar" ref={trackRef}>
      {metrics && <div
        className="checkout-scrollbar__thumb"
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
  );
}
