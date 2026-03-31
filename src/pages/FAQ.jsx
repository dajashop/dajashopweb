// src/pages/FAQ.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { faqContent } from '../data/faqContent.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import FAQJsonLd from '../components/seo/FAQJsonLd.jsx';
import './FAQ.css';

// Komponenta za pojedinačni akordeon
const AccordionItem = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="faq__item card">
      <button
        className="faq__question"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
      >
        <h3 className="faq__q-text">{item.question}</h3>
        <ChevronDown
          size={20}
          className={`faq__icon ${isOpen ? 'is-open' : ''}`}
        />
      </button>
      <div
        id={`faq-answer-${item.id}`}
        className={`faq__answer ${isOpen ? 'is-visible' : ''}`}
        // Koristimo CSS za tranziciju
      >
        <p>{item.answer}</p>
      </div>
    </div>
  );
};

export default function FAQ() {
  const faqJsonItems = faqContent.map((item) => ({
    question: item.question,
    answer: item.answer,
  }));

  return (
    <main className="faq-page container">
      <SEOHead
        title="Često postavljana pitanja"
        description="Odgovori na najčešća pitanja o poručivanju, isporuci i reklamacijama u DajaShop-u."
      />
      <FAQJsonLd items={faqJsonItems} />
      <Breadcrumbs />

      {/* PROFESIONALAN NASLOV I PODNASLOV */}
      <h1 className="title-lg faq__title">Često Postavljana Pitanja (FAQ)</h1>
      <p className="lead-text faq__subtitle">
        Ovde možete pronaći detaljne odgovore na najčešća pitanja naših cenjenih
        kupaca vezana za naručivanje, isporuku, plaćanje i reklamacije.
      </p>

      <section className="faq__list">
        {faqContent.map((item) => (
          <AccordionItem key={item.id} item={item} />
        ))}
      </section>

      <section className="faq__contact-prompt card">
        <h2>Niste pronašli odgovor?</h2>
        <p>
          Ako imate bilo kakvih dodatnih pitanja, naš tim za podršku vam stoji
          na raspolaganju. Kontaktirajte nas direktno, rado ćemo vam pomoći.
        </p>
        {/* Koristimo stil dugmeta iz teme */}
        <Link to="/contact" className="btn btn--primary">
          Kontaktirajte nas
        </Link>
      </section>
    </main>
  );
}
