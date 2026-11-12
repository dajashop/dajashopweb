import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HOME_HERO_DEFAULTS } from '../config/homeHeroDefaults.js';
import "./HeroBgSlider.css";

export default function HeroBgSlider({ slides = [], interval = 5000 }) {
  const { t: translateText, language } = useStorefront();

  const [i, setI] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState(() => new Set([0]));
  const [failedSources, setFailedSources] = useState({});
  const t = useRef(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const deltaX = useRef(0);
  const wasDragged = useRef(false);

  function go(n) {
    setI((p) => (p + n + slides.length) % slides.length);
  }
  function goTo(idx) {
    setI(((idx % slides.length) + slides.length) % slides.length);
  }
  function stop() {
    if (t.current) clearInterval(t.current);
  }
  function start() {
    stop();
    if (slides.length < 2 || !interval || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    t.current = setInterval(() => go(1), interval);
  }

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, interval]);

  useEffect(() => {
    // Keep visited slides for the existing fade; warm only the next slide
    // shortly before rotation instead of downloading every banner on entry.
    setLoadedSlides((previous) => {
      if (previous.has(i)) return previous;
      return new Set([...previous, i]);
    });
    if (slides.length < 2 || !interval || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const warmNext = setTimeout(() => {
      const next = (i + 1) % slides.length;
      setLoadedSlides((previous) => {
        if (previous.has(next)) return previous;
        return new Set([...previous, next]);
      });
    }, Math.max(0, interval - 1500));
    return () => clearTimeout(warmNext);
  }, [i, slides.length, interval]);

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('.heroBg__controls, .heroBg__dots')) return;
    dragging.current = true;
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    deltaX.current = 0;
    wasDragged.current = false;
    stop();
  }
  function onMove(e) {
    if (!dragging.current) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    deltaX.current = x - startX.current;
    if (Math.abs(deltaX.current) > 5) wasDragged.current = true;
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const th = 60;
    if (deltaX.current > th) go(-1);
    else if (deltaX.current < -th) go(1);
    start();
  }

  if (!slides.length) return null;
  const { desktopFrame, mobileFrame } = slides[i];

  return (
    <div
      className="heroBg"
      style={{
        '--hero-desktop-ratio': `${desktopFrame.width} / ${desktopFrame.height}`,
        '--hero-mobile-ratio': `${mobileFrame.width} / ${mobileFrame.height}`,
      }}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocusCapture={stop}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) start(); }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="region"
      aria-label={translateText("Pozadinski slajder")}
    >
      <div className="heroBg__frame">
        {slides.map((s, idx) => {
          const failed = failedSources[s.id] || [];
          const desktop = failed.includes(s.desktopSrc) ? undefined : s.desktopSrc;
          const mobile = failed.includes(s.mobileSrc) ? undefined : s.mobileSrc;
          const fallback = !desktop && !mobile ? HOME_HERO_DEFAULTS[0] : null;
          const content = fallback ?? s;
          const Slide = content.to ? Link : 'div';
          const alt = language === 'en' && content.altEn ? content.altEn : translateText(content.alt || '');
          const desktopSrc = desktop ?? fallback?.desktopSrc;
          return (
            <Slide
              key={s.id}
              {...(content.to ? { to: content.to } : {})}
              className={`heroBg__slide ${idx === i ? "is-active" : ""}`}
              style={{
                '--hero-fit': content.fit,
                '--hero-zoom': content.animation ? content.zoom / 100 : 1,
                '--hero-desktop-position': content.desktopPosition || 'center',
                '--hero-mobile-position': content.mobilePosition || 'center',
              }}
              onClick={(e) => {
                if (e.detail !== 0 && wasDragged.current) e.preventDefault();
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              tabIndex={idx === i ? undefined : -1}
              aria-hidden={idx !== i}
              aria-label={content.to ? alt || translateText("Otvori") : undefined}
            >
              {(idx === i || loadedSlides.has(idx)) && (
                <picture>
                  {desktopSrc && <source media="(width > 768px)" srcSet={desktopSrc} />}
                  <img
                    src={mobile || desktop || fallback?.mobileSrc}
                    alt={alt}
                    onError={event => {
                      const currentSrc = event.currentTarget.currentSrc;
                      const source = [desktop, mobile].find(url => url && new URL(url, window.location.href).href === currentSrc);
                      if (source) setFailedSources(previous => ({
                        ...previous, [s.id]: [...(previous[s.id] || []), source],
                      }));
                    }}
                    loading="eager"
                    fetchPriority={idx === i ? 'high' : 'low'}
                    decoding="async"
                    draggable="false"
                  />
                </picture>
              )}
            </Slide>
          );
        })}

        {/* Kontrole */}
        {slides.length > 1 && <div className="heroBg__controls">
          <button className="heroBg__btn prev" aria-label={translateText("Prethodni")} onClick={() => go(-1)}>
            <ChevronLeft className="heroBg__btnIcon" size={18} strokeWidth={2.6} />
          </button>
          <button className="heroBg__btn next" aria-label={translateText("Sledeci")} onClick={() => go(1)}>
            <ChevronRight className="heroBg__btnIcon" size={18} strokeWidth={2.6} />
          </button>
        </div>}
      </div>

      {/* Tačkice */}
      {slides.length > 1 && <div className="heroBg__dots" role="group" aria-label={translateText("Navigacija slajdova")}>
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            aria-label={translateText('Prikaži slajd {number}', { number: idx + 1 })}
            aria-pressed={idx === i}
            className={`dot ${idx === i ? "is-active" : ""}`}
            onClick={() => goTo(idx)}
          />
        ))}
      </div>}
    </div>
  );
}

