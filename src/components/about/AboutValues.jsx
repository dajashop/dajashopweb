// ==============================
// File: src/components/about/AboutValues.jsx
// Vrednosti u minimalističkom Gridu sa ikonicama
// ==============================
import React from 'react';
import { motion } from 'framer-motion';

// SVG Placeholder ikone
const IconPrecision = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const IconAuthenticity = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const IconExperience = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const IconSupport = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.76l1.22-7.31A3 3 0 0 0 14 9z" />
  </svg>
);

const valuesData = [
  {
    icon: IconPrecision,
    title: 'Maksimalna Preciznost',
    description:
      'Isporučujemo proizvode gde je vreme mereno sa neosporivom tačnošću.',
  },
  {
    icon: IconAuthenticity,
    title: 'Garantovana Autentičnost',
    description:
      'Svaki model prolazi strogu kontrolu porekla. Originalnost je naš pečat.',
  },
  {
    icon: IconExperience,
    title: 'Vrhunski Dizajn',
    description:
      'Naša selekcija prati globalne trendove u estetici i funkcionalnosti satova.',
  },
  {
    icon: IconSupport,
    title: 'Posvećena Podrška',
    description:
      'Dostupni smo za sva Vaša pitanja i nedoumice pre i posle kupovine.',
  },
];

const containerVariants = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function AboutValues() {
  // Prikazujemo 4 vrednosti u 2x2 gridu na velikim ekranima, inače 1 kolona
  const isGrid4 = valuesData.length === 4;
  const gridClass = isGrid4 ? 'grid-2' : 'grid-3';

  return (
    <section className="section">
      <div
        className="container text-center"
        style={{ maxWidth: '1000px', margin: '0 auto' }}
      >
        <motion.h2
          className="h2"
          initial={false}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Naš Kodeks: Vrednosti Koje Živimo
        </motion.h2>
        <motion.div
          className={gridClass}
          variants={containerVariants}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          style={{ marginTop: '40px' }}
        >
          {valuesData.map((item, index) => (
            <motion.div
              key={index}
              className="card glass shadow"
              variants={itemVariants}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              style={{ padding: '30px' }}
            >
              <item.icon
                style={{ color: 'var(--color-primary)', marginBottom: '16px' }}
              />
              <h3 className="h3" style={{ color: 'var(--color-text)' }}>
                {item.title}
              </h3>
              <p
                className="lead"
                style={{ fontSize: '15px', marginTop: '10px' }}
              >
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
