// ==============================
// File: src/components/about/AboutHero.jsx
// Upečatljiv Hero deo sa animacijom
// ==============================
import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

export default function AboutHero() {
  return (
    <section className="hero-about section">
      <motion.div
        className="content"
        variants={containerVariants}
        initial={false}
        animate="visible"
      >
        <motion.p className="pill" variants={itemVariants}>
          DAJA SHOP | VREME JE DA ZABLISTAŠ
        </motion.p>
        <motion.h1 className="h1" variants={itemVariants}>
          Posvećenost Kvalitetu.
          <br />
          Vaše Poverenje je Naš Vremenski Okvir.
        </motion.h1>
        <motion.p className="lead" variants={itemVariants}>
          Kao posvećeni trgovac satovima iz Niša, gradimo priču Daja Shop-a na
          temeljima preciznosti, autentičnosti i neprevaziđenog korisničkog
          iskustva. Svaki sat u našoj ponudi odraz je naše strasti prema
          savršenstvu.
        </motion.p>
        <motion.button
          className="btn-primary"
          variants={itemVariants}
          style={{ marginTop: '24px' }}
        >
          Istražite Našu Priču
        </motion.button>
      </motion.div>
    </section>
  );
}
