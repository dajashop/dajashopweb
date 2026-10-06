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
          DajaShop — prodavnica satova u Nišu.
          <br />
          Podzemni prolaz, lokal C31.
        </motion.h1>
        <motion.p className="lead" variants={itemVariants}>
          Nalazimo se u Podzemnom prolazu, lokal C31, u Nišu. Satove iz naše
          ponude možete pogledati u prodavnici ili na dajashop.rs. Za pomoć
          pri izboru sata i pitanja o porudžbini dostupni smo telefonom,
          preko Vibera i emaila.
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
