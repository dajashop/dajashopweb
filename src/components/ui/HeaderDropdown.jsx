import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import './HeaderDropdown.css';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function HeaderDropdown({ open, anchorRef, panelRef, id, label, className = '', children }) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 272 });
  const reduceMotion = useReducedMotion();

  useBrowserLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef?.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(272, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const top = Math.max(12, Math.round(rect.bottom + 8));
      setPosition({ top, left, width, maxHeight: Math.max(0, window.innerHeight - top - 12) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, anchorRef]);

  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence>
    {open && <motion.div ref={panelRef} id={id} role="menu" aria-label={label}
      className={`header-dropdown ${className}`} style={position}
      initial={reduceMotion ? false : { opacity: 0, y: -4, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, ...(reduceMotion ? {} : { y: -4, scale: .98 }) }} transition={{ duration: reduceMotion ? 0 : .14 }}>
      {children}
    </motion.div>}
  </AnimatePresence>, document.body);
}
