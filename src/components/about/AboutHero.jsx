import { useStorefront } from '../../localization/StorefrontContext.jsx';
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
  const { t: translateText } = useStorefront();

  return (
    <section className="hero-about section">
      <motion.div
        className="content"
        variants={containerVariants}
        initial={false}
        animate="visible"
      >
        <motion.p className="pill" variants={itemVariants}>{translateText("DAJA SHOP | VREME JE DA ZABLISTAŠ")}</motion.p>
        <motion.h1 className="h1" variants={itemVariants}>{translateText("DajaShop — prodavnica satova u Nišu.")}<br />{translateText("Podzemni prolaz, lokal C31.")}</motion.h1>
        <motion.p className="lead" variants={itemVariants}>{translateText("Nalazimo se u Podzemnom prolazu, lokal C31, u Nišu. Satove iz naše ponude možete pogledati u prodavnici ili na dajashop.rs. Za pomoć pri izboru sata i pitanja o porudžbini dostupni smo telefonom, preko Vibera i emaila.")}</motion.p>
        <motion.button
          className="btn-primary"
          variants={itemVariants}
          style={{ marginTop: '24px' }}
        >{translateText("Istražite Našu Priču")}</motion.button>
      </motion.div>
    </section>
  );
}
