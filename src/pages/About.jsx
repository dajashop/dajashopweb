// ==============================
// File: src/pages/About.jsx
// Sastavlja sve sekcije "O nama" sa AnimatePresence
// ==============================
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './About.css';

import AboutHero from '../components/about/AboutHero.jsx';
import AboutStats from '../components/about/AboutStats.jsx';
import AboutStory from '../components/about/AboutStory.jsx';
import AboutMarquee from '../components/about/AboutMarquee.jsx';
import AboutValues from '../components/about/AboutValues.jsx';
import AboutInfoGlass from '../components/about/AboutInfoGlass.jsx';
import AboutTimeline from '../components/about/AboutTimeline.jsx';
//import AboutTestimonials from '../components/about/AboutTestimonials.jsx';
import AboutFAQ from '../components/about/AboutFAQ.jsx';
import AboutCTA from '../components/about/AboutCTA.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';

export default function About() {
  return (
    <AnimatePresence mode="wait">
      <motion.main
        className="about"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
      >
        <SEOHead
          title="O nama"
          description="Saznajte više o DajaShop priči, vrednostima i našem timu."
        />
        <AboutHero />
        <AboutStats />
        <AboutStory />
        <AboutValues />
        <AboutTimeline />
        <AboutInfoGlass />

        <AboutMarquee />
        <AboutFAQ />
        <AboutCTA />
      </motion.main>
    </AnimatePresence>
  );
}
