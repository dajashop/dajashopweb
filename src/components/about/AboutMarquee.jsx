import { useStorefront } from '../../localization/StorefrontContext.jsx';
// ==============================
// File: src/components/about/AboutMarquee.jsx
// Brand Marquee - Horizontalni scroll logotipa
// ==============================
import React from 'react';
import { motion } from 'framer-motion';

// Primeri logotipa
const logos = [
  { name: 'Casio', src: '/images/casio-logo.png' },
  { name: 'Daniel Klein', src: '/images/151917.svg' },
  { name: 'Q&Q', src: '/images/Q&Q-Logo.png' },
  { name: 'G-shock', src: '/images/gshock-logo.png' },
  { name: 'Edifice', src: '/images/edifice-logo.png' },
];

export default function AboutMarquee() {
  const { t: translateText } = useStorefront();

  const scrollSpeed = 50; // Brzina animacije u px/s (CSS bi je definisao)

  // Koristićemo div umesto motion da se izbegne kompleksnost custom X animacije,
  // ostavljajući CSS klasu `brandTrack` da definiše animaciju.
  return (
    <section
      className="brandMarquee"
      style={{ background: 'var(--color-surface)' }}
    >
      <div
        className="brandTrack"
        // NOTE: Animacija marquee-a obično se rešava sa CSS animation ili sa JS/GSAP.
        // Ostavljamo klasu `brandTrack` da definiše `transform: translateX()` animaciju.
      >
        {/* Dupliramo niz za seamless looping efekat */}
        {[...logos].map((logo, index) => (
          <div key={index} style={{ padding: '0 20px', opacity: 0.7 }}>
            <img
              src={logo.src}
              alt={translateText(logo.name + ' logo')}
              style={{ maxHeight: '40px', filter: 'grayscale(100%)' }} // Minimalistički logo
            />
          </div>
        ))}
      </div>
    </section>
  );
}
