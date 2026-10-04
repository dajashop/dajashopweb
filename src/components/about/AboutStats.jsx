// ==============================
// File: src/components/about/AboutStats.jsx
// Animacija ključnih pokazatelja (Stats) - KORIŠTENJE TAČNE OCENE 4.2
// ==============================
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';

// Placeholder hook za animaciju brojeva (ostaje isti)
const useAnimatedNumber = (endValue) => {
  const [current, setCurrent] = useState(endValue);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView && typeof endValue === 'number') {
      const duration = 1500;
      let startValue = 0;
      const step = (timestamp) => {
        if (!startValue) startValue = timestamp;
        const elapsed = timestamp - startValue;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(progress * endValue);
        setCurrent(value);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }
  }, [isInView, endValue]);

  return { value: current, ref };
};

// MOCK HOOK za dinamičku ocenu (sada vraća 4.2)
const useGoogleRating = () => {
  // MOCK: Simuliramo učitavanje prave ocene 4.2
  const [rating, setRating] = useState({
    value: 4.2,
    count: 580,
    loading: true,
  });

  const fetchRating = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulacija kašnjenja
    setRating({ value: 4.2, count: 580, loading: false });
  }, []);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  return rating;
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 100 },
  },
};

// GLAVNA KOMPONENTA ZA STATISTIKU
export default function AboutStats() {
  // Dohvatanje dinamičke ocene
  const { value: dynamicRating, loading: ratingLoading } = useGoogleRating();

  const statsData = [
    { type: 'number', label: 'Godina Iskustva', value: 18, suffix: '+' },
    {
      type: 'number',
      label: 'Zadovoljnih Klijenata',
      value: 100000,
      suffix: '+',
    },
    // KORIŠTENJE DINAMIČKE VREDNOSTI 4.2
    {
      type: 'text',
      label: 'Prosečna Ocena (Google)',
      display: ratingLoading ? '...' : dynamicRating.toFixed(1), // Prikazuje 4.2
      suffix: ratingLoading ? '' : '/5',
      loading: ratingLoading,
    },
  ];

  const containerVariants = {
    visible: { transition: { staggerChildren: 0.2 } },
  };

  return (
    <section className="section" style={{ background: 'var(--color-surface)' }}>
      <div className="container">
        <motion.div
          className="grid-3"
          variants={containerVariants}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          style={{ gap: '40px' }}
        >
          {statsData.map((stat, index) => (
            <StatItem key={index} {...stat} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// POMOĆNA KOMPONENTA (StatItem ostaje isti)
function StatItem({ label, value: endValue, suffix, display, type, loading }) {
  const isAnimated = type === 'number';
  const { value: animatedValue, ref } = useAnimatedNumber(endValue);

  const finalValue = loading
    ? '...'
    : isAnimated
    ? animatedValue.toLocaleString('sr-RS')
    : display;
  const finalRef = isAnimated ? ref : useRef(null);

  return (
    <motion.div
      className="stat-card"
      variants={itemVariants}
      ref={finalRef}
      style={{ textAlign: 'center' }}
    >
      <h3
        className="h1"
        style={{ color: 'var(--color-primary)', lineHeight: 1 }}
      >
        {finalValue}
        <span
          style={{
            fontSize: '0.5em',
            verticalAlign: type === 'text' ? 'middle' : 'top',
            fontWeight: 'bold',
            marginLeft: type === 'text' ? '0px' : '2px',
          }}
        >
          {suffix}
        </span>
      </h3>
      <p
        className="lead"
        style={{
          marginTop: '8px',
          color: 'var(--color-muted)',
          fontWeight: 500,
        }}
      >
        {label}
      </p>
    </motion.div>
  );
}
