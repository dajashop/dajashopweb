// ==============================
// File: src/components/about/AboutStory.jsx
// MODERAN REDIZAJN: Fokus na Misiju i Viziju u Glass karticama
// ==============================
import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function AboutStory() {
  return (
    <motion.section
      className="section"
      // whileInView animacija ulaska celog bloka
      initial={false}
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div
        className="container"
        style={{ maxWidth: '1000px', margin: '0 auto' }}
      >
        {/* I. Uvod / Osnovna Priča (Full Width) */}
        <motion.div
          variants={itemVariants}
          style={{ marginBottom: '40px', textAlign: 'center' }}
        >
          <p
            className="pill"
            style={{
              margin: '0 auto 10px',
              borderColor: 'var(--color-primary)',
            }}
          >
            NAŠA PRIČA
          </p>
          <h2 className="h2" style={{ marginBottom: '20px' }}>
            Od Niša do Vašeg Zgloba: Putovanje Preciznosti
          </h2>
          <p className="lead" style={{ maxWidth: '800px', margin: '0 auto' }}>
            Priča Daja Shop-a počela je sa jednostavnom idejom: ponuditi
            autentične i kvalitetne satove uz beskompromisnu podršku klijentima.
            Svake godine, naša strast prema časovničarstvu raste, kao i naša
            posvećenost da budemo Vaš najpouzdaniji online trgovac satovima.
            Fokusirani smo na detalje koji čine razliku i iskustvo koje ostaje.
          </p>
        </motion.div>

        {/* II. Misija i Vizija (2-Kolone Grid sa Glass Efektom) */}
        <motion.div
          className="grid-2"
          style={{ marginTop: '40px', gap: '24px' }}
        >
          {/* A. Misija Kartica - Koristi glass i shadow klase iz About.css */}
          <motion.div
            className="card glass shadow"
            variants={itemVariants}
            style={{ padding: '40px', height: '100%' }}
          >
            <h3
              className="h2"
              style={{ color: 'var(--color-primary)', marginBottom: '15px' }}
            >
              Naša Misija
            </h3>
            <p className="lead" style={{ fontSize: '18px' }}>
              Naša misija je da osiguramo da svaki sat koji napusti Daja Shop
              nosi pečat **originalnosti i najvišeg kvaliteta**. Težimo
              transparentnosti, fer cenama i izgradnji dugoročnog poverenja sa
              svakim klijentom u regionu.
            </p>
          </motion.div>

          {/* B. Vizija Kartica - Koristi glass i shadow klase iz About.css */}
          <motion.div
            className="card glass shadow"
            variants={itemVariants}
            style={{ padding: '40px', height: '100%' }}
          >
            <h3
              className="h2"
              style={{ color: 'var(--color-primary)', marginBottom: '15px' }}
            >
              Naša Vizija
            </h3>
            <p className="lead" style={{ fontSize: '18px' }}>
              Vizija Daja Shop-a je da postane **sinonim za online kupovinu
              satova** u Jugoistočnoj Evropi, poznat po besprekornoj usluzi i
              ekskluzivnom izboru. Koristimo naprednu tehnologiju kako bismo
              inspirisali i povezali ljubitelje satova sa modelima koji traju.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
