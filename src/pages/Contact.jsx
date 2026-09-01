import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import './Contact.css';
import SEOHead from '../components/seo/SEOHead.jsx';
import GoogleMapEmbed from '../components/privacy/GoogleMapEmbed.jsx';

/**
 * @file src/pages/Contact.jsx
 * @description Stranica za kontakt sa detaljima i formom.
 */

// KORIŠĆENJE ISTOG PRINICIPA KAO U ShippingSection.jsx

const SHOP_ADDRESS_QUERY = 'Daja Shop, Podzemni prolaz lokal C31, Niš, Srbija';
const MAP_EMBED_URL = `https://www.google.com/maps/embed/v1/place?key=${
  import.meta.env.VITE_GOOGLE_MAPS_KEY
}&q=${encodeURIComponent(SHOP_ADDRESS_QUERY)}`;
// NAPOMENA: Za produkciju, MAP_API_KEY se obično čita iz import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export default function Contact() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Logika za slanje forme ide ovde (npr. API poziv)
    alert('Vaša poruka je uspešno primljena. Hvala Vam na kontaktu!');
    e.target.reset(); // Resetovanje forme nakon simulacije slanja
  };

  return (
    <div className="contact-page page-container">
      <SEOHead
        title="Kontakt"
        description="Kontaktirajte DajaShop tim za pitanja, porudžbine i korisničku podršku."
      />

      {/* HERO SECTION - Minimalistički naslov */}
      <section className="contact-hero">
        <h1>Kontaktirajte nas</h1>
        <p>
          Naš tim Vam stoji na raspolaganju za sva pitanja, savete i podršku.
          Bilo da se radi o porudžbini, proizvodu ili poslovnoj saradnji,
          obratite nam se sa punim poverenjem.
        </p>
      </section>

      <div className="contact-content">
        {/* DETAJLI ZA KONTAKT */}
        <div className="contact-details">
          <h2>Naši detalji</h2>

          <div className="detail-item">
            <div className="icon-box">
              <MapPin size={20} />
            </div>
            <div>
              <h3>Adresa i lokacija</h3>
              <address>
                Podzemni prolaz lokal C31,
                <br />
                18000 Niš, Srbija
              </address>
              <p>
                {/* Link za Google Maps navigaciju (koristi dinamičku adresu) */}
              </p>
            </div>
          </div>

          <div className="detail-item">
            <div className="icon-box">
              <Phone size={20} />
            </div>
            <div>
              <h3>Telefonski kontakt</h3>
              <p>Pozovite nas radnim danima za brzu asistenciju.</p>
              <p>
                <a href="tel:+381641262425">+381 (64) 126 24 25</a>{' '}
                (Mobilni/Viber)
              </p>
            </div>
          </div>

          <div className="detail-item">
            <div className="icon-box">
              <Mail size={20} />
            </div>
            <div>
              <h3>Elektronska pošta</h3>
              <p>Za upite van radnog vremena ili detaljnu dokumentaciju.</p>
              <p>
                <a href="mailto:info@dajashop.com">info@dajashop.com</a>{' '}
                (Generalni upiti)
                <br />
                <a href="mailto:cvelenis42@yahoo.com">
                  cvelenis42@yahoo.com
                </a>{' '}
                (Direktni kontakt)
              </p>
            </div>
          </div>

          <div className="detail-item">
            <div className="icon-box">
              <Clock size={20} />
            </div>
            <div>
              <h3>Radno vreme</h3>
              <p>
                Ponedeljak - Petak: 10:00 - 20:00
                <br />
                Subota: 10:00 - 15:00
                <br />
                Nedelja: Zatvoreno
              </p>
            </div>
          </div>
        </div>

        {/* GOOGLE MAPS EMBED - Korišćen je princip iz ShippingSection.jsx */}
        <div className="contact-map">
          <h2>Naša lokacija</h2>
          <div className="map-embed-container">
            <GoogleMapEmbed
              className="map-iframe"
              title="Daja Shop Lokacija"
              width="100%"
              height="100%"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={MAP_EMBED_URL}
            />
          </div>
          <p
            style={{
              marginTop: '15px',
              fontSize: '0.9rem',
              color: 'var(--color-muted)',
            }}
          >
            Posetite nas u Podzemnom prolazu, u srcu Niša. Lako nas možete
            pronaći. Naš lokal je C31. Radujemo se Vašoj poseti!
          </p>
        </div>
      </div>

      {/* KONTAKT FORMA */}
      <section className="contact-form-section">
        <h2>Pošaljite nam poruku</h2>
        <p>
          Popunite kratak formular, a mi ćemo Vam odgovoriti u najkraćem mogućem
          roku, najčešće u roku od 24 časa.
        </p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Vaše puno ime i prezime*</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Npr. Petar Petrović"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Vaša e-mail adresa*</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="npr. email@domen.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Broj telefona (opciono)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="Npr. +381 6x xxx xxxx"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Tekst poruke*</label>
            <textarea
              id="message"
              name="message"
              rows="5"
              required
              placeholder="Molimo Vas da detaljno opišete Vaš upit..."
            ></textarea>
          </div>

          <button type="submit" className="btn--primary">
            Pošalji poruku
          </button>
        </form>
      </section>
    </div>
  );
}
