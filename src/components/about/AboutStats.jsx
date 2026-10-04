// ==============================
// File: src/components/about/AboutStats.jsx
// Animacija ključnih pokazatelja
// ==============================
import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import GoogleShopRating from './GoogleShopRating.jsx';

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
  const statsData = [
    { label: 'Godina Iskustva', value: 18, suffix: '+' },
    {
      label: 'Zadovoljnih Klijenata',
      value: 100000,
      suffix: '+',
    },
  ];

  const containerVariants = {
    visible: { transition: { staggerChildren: 0.2 } },
  };

  return (
    <section className="section" style={{ background: 'var(--color-surface)' }}>
      <div className="container">
        <h2 className="sr-only">DajaShop u brojkama</h2>
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
          <GoogleShopRating />
        </motion.div>
      </div>
    </section>
  );
}

function StatItem({ label, value: endValue, suffix }) {
  const { value: animatedValue, ref } = useAnimatedNumber(endValue);

  const finalValue = animatedValue.toLocaleString('sr-RS');

  return (
    <motion.div
      className="stat-card"
      variants={itemVariants}
      ref={ref}
      style={{ textAlign: 'center' }}
    >
      <p
        className="h1"
        style={{ color: 'var(--color-primary)', lineHeight: 1 }}
      >
        {finalValue}
        <span
          style={{
            fontSize: '0.5em',
            verticalAlign: 'top',
            fontWeight: 'bold',
            marginLeft: '2px',
          }}
        >
          {suffix}
        </span>
      </p>
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
