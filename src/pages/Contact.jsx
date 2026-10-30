import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useRef, useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import './Contact.css';
import { seoConfig } from '../config/seo.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import GoogleMapEmbed from '../components/privacy/GoogleMapEmbed.jsx';
import { apiRequest } from '../services/apiClient.js';

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
  const { t: translateText } = useStorefront();

  const [status, setStatus] = useState('idle');
  const requestId = useRef(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    const data = new FormData(form);
    requestId.current ??= crypto.randomUUID();
    setStatus('sending');
    try {
      await apiRequest('/contact', { method: 'POST', auth: false, retry: false,
        body: { name: data.get('name'), email: data.get('email'), phone: data.get('phone'),
          message: data.get('message'), website: data.get('website'), requestId: requestId.current } });
      setStatus('success');
      requestId.current = null;
      form.reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="contact-page page-container">
      <SEOHead
        title={translateText("Kontakt")}
        description={translateText("Kontaktirajte DajaShop tim za pitanja, porudžbine i korisničku podršku.")}
      />

      {/* HERO SECTION - Minimalistički naslov */}
      <section className="contact-hero">
        <h1>{translateText("Kontaktirajte nas")}</h1>
        <p>{translateText("Naš tim Vam stoji na raspolaganju za sva pitanja, savete i podršku. Bilo da se radi o porudžbini, proizvodu ili poslovnoj saradnji, obratite nam se sa punim poverenjem.")}</p>
      </section>

      <div className="contact-content">
        {/* DETAJLI ZA KONTAKT */}
        <div className="contact-details">
          <h2>{translateText("Naši detalji")}</h2>

          <div className="detail-item">
            <div className="icon-box">
              <MapPin size={20} />
            </div>
            <div>
              <h3>{translateText("Adresa i lokacija")}</h3>
              <address>{translateText("Podzemni prolaz lokal C31,")}<br />{translateText("18000 Niš, Srbija")}</address>
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
              <h3>{translateText("Telefonski kontakt")}</h3>
              <p>{translateText("Pozovite nas radnim danima za brzu asistenciju.")}</p>
              <p>
                <a href="tel:+381641262425">+381 (64) 126 24 25</a>{translateText(' ')}{translateText("(Mobilni/Viber)")}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="icon-box">
              <Mail size={20} />
            </div>
            <div>
              <h3>{translateText("Elektronska pošta")}</h3>
              <p>{translateText("Za upite van radnog vremena ili detaljnu dokumentaciju.")}</p>
              <p>
                <a href={`mailto:${seoConfig.business.email}`}>{seoConfig.business.email}</a>{translateText(' ')}{translateText("(Upiti i korisnička podrška)")}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="icon-box">
              <Clock size={20} />
            </div>
            <div>
              <h3>{translateText("Radno vreme")}</h3>
              <p>{translateText("Ponedeljak - Petak: 10:00 - 20:00")}<br />{translateText("Subota: 10:00 - 15:00")}<br />{translateText("Nedelja: Zatvoreno")}</p>
            </div>
          </div>
        </div>

        {/* GOOGLE MAPS EMBED - Korišćen je princip iz ShippingSection.jsx */}
        <div className="contact-map">
          <h2>{translateText("Naša lokacija")}</h2>
          <div className="map-embed-container">
            <GoogleMapEmbed
              className="map-iframe"
              title={translateText("Daja Shop Lokacija")}
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
          >{translateText("Posetite nas u Podzemnom prolazu, u srcu Niša. Lako nas možete pronaći. Naš lokal je C31. Radujemo se Vašoj poseti!")}</p>
        </div>
      </div>

      {/* KONTAKT FORMA */}
      <section className="contact-form-section">
        <h2>{translateText("Pošaljite nam poruku")}</h2>
        <p>{translateText("Popunite kratak formular, a mi ćemo Vam odgovoriti u najkraćem mogućem roku, najčešće u roku od 24 časa.")}</p>
        <form className="contact-form" onSubmit={handleSubmit} onChange={() => { if (status !== 'sending') { requestId.current = null; setStatus('idle'); } }}>
          <fieldset className="contact-fields" disabled={status === 'sending'}>
          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor="contact-website">{translateText("Website")}</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="form-group">
            <label htmlFor="name">{translateText("Vaše puno ime i prezime*")}</label>
            <input
              type="text"
              id="name"
              name="name"
              minLength={2}
              maxLength={160}
              required
              placeholder={translateText("Npr. Petar Petrović")}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{translateText("Vaša e-mail adresa*")}</label>
            <input
              type="email"
              id="email"
              name="email"
              maxLength={240}
              required
              placeholder={translateText("npr. email@domen.com")}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{translateText("Broj telefona (opciono)")}</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              maxLength={60}
              placeholder={translateText("Npr. +381 6x xxx xxxx")}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">{translateText("Tekst poruke*")}</label>
            <textarea
              id="message"
              name="message"
              rows="5"
              minLength={10}
              maxLength={5000}
              required
              placeholder={translateText("Molimo Vas da detaljno opišete Vaš upit...")}
            ></textarea>
          </div>

          <button type="submit" className="btn--primary">
            {translateText(status === 'sending' ? 'Šaljemo poruku…' : 'Pošalji poruku')}
          </button>
          </fieldset>
          {status === 'success' && <p className="contact-notice contact-notice--success" role="status">{translateText("Vaša poruka je primljena. Hvala vam na javljanju! Odgovorićemo na navedenu email adresu.")}</p>}
          {status === 'error' && <p className="contact-notice contact-notice--error" role="alert">{translateText("Poruka nije primljena. Pokušajte ponovo ili nam pišite na ")}<a href={`mailto:${seoConfig.business.email}`}>{seoConfig.business.email}</a>{translateText(". Vaš unos je sačuvan u formularu.")}</p>}
        </form>
      </section>
    </div>
  );
}
