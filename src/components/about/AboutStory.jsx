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
            Upoznajte DajaShop
          </h2>
          <p className="lead" style={{ maxWidth: '800px', margin: '0 auto' }}>
            DajaShop je prodavnica satova u Nišu, na adresi Podzemni prolaz,
            lokal C31, 18000 Niš. Na našem sajtu možete pregledati modele,
            uporediti njihove karakteristike i poručiti sat. Ako vam je
            potreban savet, kontaktirajte nas ili posetite prodavnicu.
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
              Gde se nalazimo
            </h3>
            <p className="lead" style={{ fontSize: '18px' }}>
              Naša prodavnica nalazi se u Podzemnom prolazu, lokal C31, u
              Nišu. Za informacije o dostupnosti modela i dolasku pozovite
              nas ili pošaljite Viber poruku na +381 64 126 24 25.
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
              Kako možemo da pomognemo
            </h3>
            <p className="lead" style={{ fontSize: '18px' }}>
              Pomažemo pri izboru sata i odgovaramo na pitanja o modelima,
              porudžbinama i garanciji. Za servisiranje organizujemo slanje
              sata ovlašćenom servisu. Pišite nam na info@dajashop.com ili
              nas kontaktirajte telefonom i preko Vibera.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
