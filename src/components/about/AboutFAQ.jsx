// ==============================
// File: src/components/about/AboutFAQ.jsx
// FAQ sekcija sa animiranim Accordionom
// ==============================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Pretpostavljamo da imate faqContent.js u data folderu
import { faqContent } from '../../data/faqContent.js'; // Potrebno kreirati mock data ili ga importovati

// Koristimo mock data jer nemamo pristup celom fajlu
const mockFaq = [
  {
    question: 'Da li su svi satovi originalni?',
    answer:
      'Apsolutno. Daja Shop je ovlašćeni diler za sve brendove u ponudi. Garantujemo 100% autentičnost svakog sata.',
  },
  {
    question: 'Koji je rok isporuke?',
    answer:
      'Standardni rok isporuke je 1-3 radna dana, zavisno od lokacije. U Nišu je moguće i lično preuzimanje.',
  },
  {
    question: 'Kakva je garancija na satove?',
    answer:
      'Svi satovi dolaze sa punom garancijom od strane ovlašćenog uvoznika, obično 24 meseca.',
  },
];

const itemVariants = {
  open: { opacity: 1, height: 'auto', transition: { duration: 0.4 } },
  closed: { opacity: 0, height: 0, transition: { duration: 0.4 } },
};

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div className="faq-item" layout>
      <button
        className="faq-accordion"
        onClick={() => setIsOpen(!isOpen)}
        style={{ color: 'var(--color-text)', fontWeight: 600 }}
      >
        <span className="h3" style={{ fontSize: '18px' }}>
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: '24px' }}
        >
          {isOpen ? '−' : '+'}
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="content"
            variants={itemVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{ overflow: 'hidden' }}
          >
            <p
              className="lead"
              style={{ padding: '10px 0 20px', color: 'var(--color-muted)' }}
            >
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AboutFAQ() {
  return (
    <section className="section" style={{ background: 'var(--color-surface)' }}>
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <motion.h2
          className="h2 text-center"
          initial={false}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '40px' }}
        >
          Često Postavljana Pitanja
        </motion.h2>

        <motion.div
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {(faqContent || mockFaq).map((item, index) => (
            <FAQItem key={index} {...item} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
