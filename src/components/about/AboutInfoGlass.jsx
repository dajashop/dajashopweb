// ==============================
// File: src/components/about/AboutInfoGlass.jsx
// Informacije i brzi faktoidi
// ==============================
import React from 'react';
import { motion } from 'framer-motion';

const infoCards = [
  { title: 'Dostava', text: 'Isporuka širom Srbije', delay: 0.1 },
  { title: 'Originalni satovi', text: 'Garancija originalnosti', delay: 0.2 },
  {
    title: 'Niš Lokacija',
    text: 'Dostupnost za lično preuzimanje',
    delay: 0.3,
  },
];

const containerVariants = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

export default function AboutInfoGlass() {
  return (
    <section className="section">
      <div className="container">
        <h2 className="sr-only">Dostava, originalnost i lokacija</h2>
        <motion.div
          className="grid-3"
          variants={containerVariants}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          {infoCards.map((card, index) => (
            <motion.div
              key={index}
              className="card glass shadow"
              variants={itemVariants}
              style={{ padding: '30px' }}
            >
              <h3
                className="h3"
                style={{ color: 'var(--color-primary)', marginBottom: '8px' }}
              >
                {card.title}
              </h3>
              <p className="lead" style={{ fontSize: '15px' }}>
                {card.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
