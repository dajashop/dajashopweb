// ==============================
// File: src/components/about/AboutTimeline.jsx
// Vizuelna Hronologija - Dinamički Timeline sa tačnim početkom 2007.
// ==============================
import React from 'react';
import { motion } from 'framer-motion';

const timelineEvents = [
  {
    year: '2006',
    title: 'Početak Putovanja',
    description:
      'Rađanje ideje o mestu gde se tradicija i tačnost susreću. Postavljanje temelja poslovanja zasnovanog na iskrenom odnosu i poverenju prema svakom kupcu.',
  },
  {
    year: '2007',
    title: 'Približavanje Kupcima',
    description:
      'Širenje fizičkog prisustva i kreiranje prostora gde ljubitelji satova mogu uživo doživeti kvalitet našeg asortimana uz stručno savetovanje.',
  },
  {
    year: '2014', // NOVO
    title: 'Obećanje Trajnosti',
    description:
      'Shvatanje da sat nije samo ukras, već mehanizam koji živi. Fokus na stručnu podršku i edukaciju tima, čime garantujemo da naš odnos sa kupcem ne prestaje samim činom prodaje.',
  },
  {
    year: '2017',
    title: 'Digitalni Iskorak',
    description:
      'Prepoznavanje potreba modernog doba i otvaranje vrata naše prodavnice celoj zemlji putem prve online platforme. Kvalitet postaje dostupan na jedan klik.',
  },
  {
    year: '2020',
    title: 'Stabilnost i Integritet',
    description:
      'U vremenima neizvesnosti, kvalitet ostaje jedina konstanta. Učvrstili smo našu poziciju na tržištu kao garant originalnosti, pružajući sigurnost svakom kupcu koji ceni trajnu vrednost.',
  },
  {
    year: '2026',
    title: 'Nova Era Kupovine',
    description:
      'Implementacija najsavremenijih tehnologija za vrhunsko korisničko iskustvo. Spoj moderne estiteke, brzine i sigurnosti u službi vašeg vremena.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function AboutTimeline() {
  return (
    <motion.section
      className="section"
      initial={false}
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <motion.h2
          className="h2 text-center"
          variants={itemVariants}
          style={{ marginBottom: '60px' }}
        >
          Naša Hronologija: 18 Godina Poverenja
        </motion.h2>

        <motion.div className="timeline-container">
          {timelineEvents.map((event, index) => (
            <motion.div
              key={index}
              className="timeline-item"
              variants={itemVariants}
              style={{
                marginBottom: index === timelineEvents.length - 1 ? 0 : '50px',
              }}
            >
              <div
                className="timeline-dot"
                style={{
                  background: 'var(--color-primary)',
                  borderColor: 'var(--color-surface, white)',
                }}
              />
              <p
                className="pill"
                style={{
                  marginBottom: '8px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                }}
              >
                {event.year}
              </p>
              <h3
                className="h3"
                style={{ color: 'var(--color-text)', marginBottom: '4px' }}
              >
                {event.title}
              </h3>
              <p className="lead" style={{ fontSize: '16px' }}>
                {event.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
