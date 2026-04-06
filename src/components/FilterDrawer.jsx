import React, { useEffect, useState, useCallback } from 'react';
import './FilterDrawer.css';
import { useSearchParams } from 'react-router-dom';
import Filters from './Filters';

function useActiveCount() {
  const [sp] = useSearchParams();
  const [count, setCount] = useState(0);
  const calc = useCallback(() => {
    const sum =
      sp.getAll('brand').length +
      sp.getAll('gender').length +
      sp.getAll('category').length +
      (sp.get('min') || sp.get('max') ? 1 : 0);
    setCount(sum);
  }, [sp]);
  useEffect(() => {
    calc();
  }, [calc]);
  return count;
}

function useLockBody(isLocked) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let scrollY = 0;
    if (isLocked) {
      scrollY = window.scrollY || window.pageYOffset;
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
      html.style.height = '100%';
    }
    return () => {
      const y = body.style.top;
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      html.style.overscrollBehavior = '';
      html.style.height = '';
      if (y) {
        const restore = parseInt(y.replace('-', ''), 10) || 0;
        window.scrollTo(0, restore);
      }
    };
  }, [isLocked]);
}

function useHeaderHeight(active) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const findHeader = () =>
      document.querySelector('[data-site-header]') ||
      document.querySelector('header') ||
      document.querySelector('.header');

    const setVar = () => {
      const h = findHeader();
      const rect = h?.getBoundingClientRect();
      const px = rect ? Math.round(rect.height) : 0;
      root.style.setProperty('--header-h', px + 'px');
    };

    setVar();
    const onResize = () => setVar();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    let mo;
    const hdr = findHeader();
    if (hdr && 'ResizeObserver' in window) {
      mo = new ResizeObserver(() => setVar());
      mo.observe(hdr);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (mo) mo.disconnect();
    };
  }, [active]);
}

export default function FilterDrawer({ className = '', products }) {
  const [open, setOpen] = useState(false);
  const activeCount = useActiveCount();

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 1030px)').matches;
  });
  const [scrolledPastFab, setScrolledPastFab] = useState(false);

  useLockBody(open);
  useHeaderHeight(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Prati breakpoint ≤1030px
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 1030px)');
    const onChange = (e) => setIsMobile(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    setIsMobile(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  // Prati skrol za prikaz fab-a posle 280px
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobile) {
      setScrolledPastFab(false);
      return;
    }
    const handleScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      setScrolledPastFab(y > 100);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const setInitialFocus = (node) => {
    if (node) {
      const btn = node.querySelector('.fd-close');
      btn?.focus();
    }
  };

  return (
    <>
      <button
        type="button"
        className={`fd-trigger ${className}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="filter-drawer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 5h18M6 12h12M10 19h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>Filteri</span>
        {activeCount > 0 && (
          <span className="fd-badge" aria-label={`${activeCount} aktivno`}>
            {activeCount}
          </span>
        )}
      </button>

      {isMobile && !open && scrolledPastFab && (
        <button
          type="button"
          className="fd-fab"
          onClick={() => setOpen(true)}
          aria-label="Otvori filtere"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 5h18M6 12h12M10 19h4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Filteri</span>
          {activeCount > 0 && (
            <span className="fd-badge" aria-label={`${activeCount} aktivno`}>
              {activeCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Filteri"
          id="filter-drawer"
          onClick={(e) => {
            if (e.target.classList.contains('fd-overlay')) setOpen(false);
          }}
        >
          <div className="fd-sheet" ref={setInitialFocus}>
            <div className="fd-topbar">
              <button
                type="button"
                className="fd-close"
                onClick={() => setOpen(false)}
                aria-label="Zatvori filtere"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Zatvori</span>
              </button>
              <div className="fd-title">
                <span>Filteri</span>
                {activeCount > 0 && (
                  <span className="fd-badge">{activeCount}</span>
                )}
              </div>
              <div className="fd-spacer" />
            </div>

            <div className="fd-content">
              {/* PROSLEĐUJEMO onClose funkciju */}
              <Filters products={products} onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
