import { Link } from 'react-router-dom';
import { ArrowUpRight, Battery, Link2, Mail, MapPin, Phone, Radio, Scissors, Sparkles } from 'lucide-react';
import { seoConfig } from '../../config/seo.js';

const icons = { engraving: Sparkles, battery: Battery, strap: Link2, sizing: Scissors, remote: Radio };

export function ServiceIcon({ kind, size = 24 }) {
  const Icon = icons[kind] || Sparkles;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}

export function ServiceBreadcrumbs({ service }) {
  return <nav className="svc-breadcrumbs" aria-label="Putanja stranice">
    <ol>
      <li><Link to="/">Početna</Link></li>
      <li>{service ? <Link to="/usluge">Usluge</Link> : <span aria-current="page">Usluge</span>}</li>
      {service && <li><span aria-current="page">{service.title}</span></li>}
    </ol>
  </nav>;
}

export function ServiceVisit({ service }) {
  const { business } = seoConfig;
  const phone = business.phone.replace(/[^+\d]/g, '');
  const subject = encodeURIComponent(service ? `Upit: ${service.title}` : 'Upit za uslugu');
  const mapQuery = encodeURIComponent(`${business.name}, ${business.street}, ${business.city}`);
  return <section className="svc-visit" id="posetite-nas" aria-labelledby="svc-visit-title">
    <div>
      <p className="svc-eyebrow">Vidimo se u radnji</p>
      <h2 id="svc-visit-title">Donesite predmet.<br />Dogovorićemo detalje.</h2>
      <p>Pregledaćemo šta je potrebno i dogovoriti cenu i rok pre početka rada. Za informacije pre dolaska, pozovite nas ili pošaljite upit.</p>
      <div className="svc-actions">
        <a className="svc-button svc-button--primary" href={`tel:${phone}`}><Phone size={18} aria-hidden="true" /> Pozovite nas</a>
        <a className="svc-button svc-button--secondary" href={`mailto:${business.email}?subject=${subject}`}><Mail size={18} aria-hidden="true" /> Pošaljite upit</a>
      </div>
    </div>
    <div className="svc-address">
      <MapPin size={28} strokeWidth={1.5} aria-hidden="true" />
      <h3>{business.name}, {business.city}</h3>
      <address>{business.street}<br />{business.postalCode} {business.city}</address>
      <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer">Pronađite nas na mapi <ArrowUpRight size={16} aria-hidden="true" /><span className="svc-sr-only"> (novi prozor)</span></a>
      <Link to="/contact">Kontakt i radno vreme</Link>
    </div>
  </section>;
}
