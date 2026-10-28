import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useEffect, useRef, useState } from "react";
import "./Carousel.css";

export default function Carousel({
  children,
  autoPlay = false,
  interval = 5000,
  arrows = true,
  showDots = true,
}) {
  const { t: translateText } = useStorefront();

  const items = React.Children.toArray(children);
  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  // autoplay
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    timer.current = setInterval(
      () => setIdx((p) => (p + 1) % items.length),
      interval
    );
    return () => clearInterval(timer.current);
  }, [autoPlay, interval, items.length]);

  const prev = () => setIdx((p) => (p === 0 ? items.length - 1 : p - 1));
  const next = () => setIdx((p) => (p + 1) % items.length);
  const goto = (i) => setIdx(i);

  return (
    <div className="carousel" role="region" aria-roledescription="carousel">
      <div
        className="carousel__track"
        style={{ transform: `translateX(${-idx * 100}%)` }}
      >
        {items.map((it, i) => (
          <div className="carousel__slide" key={i} aria-hidden={i !== idx}>
            {translateText(it)}
          </div>
        ))}
      </div>

      {arrows && items.length > 1 && (
        <>
          <button
            className="carousel__arrow left"
            onClick={prev}
            aria-label={translateText("Prethodno")}
          >
            ‹
          </button>
          <button
            className="carousel__arrow right"
            onClick={next}
            aria-label={translateText("Sledeće")}
          >
            ›
          </button>
        </>
      )}

      {showDots && items.length > 1 && (
        <div className="carousel__dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === idx ? "is-active" : ""}`}
              onClick={() => goto(i)}
              aria-label={translateText(`Idi na slajd ${i + 1}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
