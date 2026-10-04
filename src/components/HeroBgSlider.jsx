import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./HeroBgSlider.css";

export default function HeroBgSlider({ slides = [], interval = 5000 }) {
  const [i, setI] = useState(0);
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
    t.current = setInterval(() => go(1), interval);
  }

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, interval]);

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

  return (
    <div
      className="heroBg"
      onMouseEnter={stop}
      onMouseLeave={start}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onTouchStart={onDown}
      onTouchMove={onMove}
      onTouchEnd={onUp}
      role="region"
      aria-label="Pozadinski slajder"
    >
      {/* Slojevi slika */}
      {slides.map((s, idx) => {
        const Slide = s.to ? Link : 'div';
        return (
          <Slide
            key={idx}
            {...(s.to ? { to: s.to } : {})}
            className={`heroBg__slide ${idx === i ? "is-active" : ""}`}
            onClick={(e) => {
              if (e.detail !== 0 && wasDragged.current) e.preventDefault();
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            tabIndex={idx === i ? undefined : -1}
            aria-hidden={idx !== i}
            aria-label={s.alt ?? "Otvori"}
          >
            <img src={s.src} alt={s.alt ?? ""} draggable="false" />
            {s.overlay && <div className="heroBg__overlay">{s.overlay}</div>}
          </Slide>
        );
      })}

      {/* Kontrole */}
      <div className="heroBg__controls">
        <button className="heroBg__btn prev" aria-label="Prethodni" onClick={() => go(-1)}>
          <ChevronLeft className="heroBg__btnIcon" size={18} strokeWidth={2.6} />
        </button>
        <button className="heroBg__btn next" aria-label="Sledeci" onClick={() => go(1)}>
          <ChevronRight className="heroBg__btnIcon" size={18} strokeWidth={2.6} />
        </button>
      </div>

      {/* Tačkice */}
      <div className="heroBg__dots" role="tablist" aria-label="Navigacija slajdova">
        {slides.map((_, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={idx === i}
            className={`dot ${idx === i ? "is-active" : ""}`}
            onClick={() => goTo(idx)}
          />
        ))}
      </div>
    </div>
  );
}

