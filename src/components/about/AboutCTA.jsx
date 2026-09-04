// ==============================
// File: src/components/about/AboutCTA.jsx
// Poziv na akciju sa ispravnom navigacijom
// ==============================
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import './AboutCTA.css';

// Kreiramo Motion Link komponentu
const MotionLink = motion(Link);

const sectionVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export default function AboutCTA() {
  return (
    <motion.section
      className="section"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sectionVariants}
    >
      <div className="container card shadow about-cta">
        <h2 className="h2 about-cta__title">
          Pronađite sat koji prati vaš stil.
        </h2>
        <p className="about-cta__description">
          Istražite pažljivo odabrane modele i pronađite detalj koji ćete rado
          nositi svakog dana.
        </p>

        <MotionLink
          to="/catalog"
          className="btn-secondary about-cta__button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          Pronađite svoj sat <ArrowUpRight size={18} aria-hidden="true" />
        </MotionLink>
      </div>
    </motion.section>
  );
}
