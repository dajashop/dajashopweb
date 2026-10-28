import { Link } from 'react-router-dom';
import { ArrowUpRight, Battery, Check, ChevronRight, Link2, Mail, MapPin, Phone, Radio, Scissors, Sparkles } from 'lucide-react';
import { seoConfig } from '../../config/seo.js';
import ServiceVisual from './ServiceVisual.jsx';

const icons = { engraving: Sparkles, battery: Battery, strap: Link2, sizing: Scissors, remote: Radio };

export function ServiceIcon({ kind, size = 26 }) {
  const Icon = icons[kind] || Sparkles;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export function ServiceBreadcrumbs({ service }) {
  return <nav className="services-breadcrumbs" aria-label="Putanja stranice">
    <ol>
      <li><Link to="/">Početna</Link></li>
      <li><ChevronRight size={14} aria-hidden="true" />{service ? <Link to="/usluge">Usluge</Link> : <span aria-current="page">Usluge</span>}</li>
      {service && <li><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{service.title}</span></li>}
    </ol>
  </nav>;
}

export function ServiceCard({ service, featured = false }) {
  return <Link className={`services-card${featured ? ' services-card--featured' : ''}`} to={service.path}>
    <ServiceVisual kind={service.kind} variant="card" />
    <div className="services-card__body">
      <span className="services-card__category"><ServiceIcon kind={service.kind} size={21} />{service.category}</span>
      <h3>{service.title}</h3>
      <p>{service.summary}</p>
      <span className="services-card__link">Pogledajte uslugu <ArrowUpRight size={22} aria-hidden="true" /></span>
    </div>
  </Link>;
}

export function ServiceFacts({ items }) {
  return <ul className="services-facts" aria-label="Šta usluga obuhvata">
    {items.map(item => <li key={item}><span><Check size={22} aria-hidden="true" /></span>{item}</li>)}
  </ul>;
}

export function ServiceVisit({ service }) {
  const { business } = seoConfig;
  const phone = business.phone.replace(/[^+\d]/g, '');
  const subject = encodeURIComponent(service ? `Upit: ${service.title}` : 'Upit za uslugu');
  const query = encodeURIComponent(`${business.name}, ${business.street}, ${business.city}`);
  return <section className="services-visit" id="posetite-nas" aria-labelledby="services-visit-title">
    <div className="services-visit__copy">
      <span className="services-location"><MapPin size={20} aria-hidden="true" />Naša radnja u Nišu</span>
      <h2 id="services-visit-title">Svratite.<br />Tu smo za vaš sat i vaše ideje.</h2>
      <p>Donesite predmet ili nam se javite pre dolaska. Pregledaćemo šta je potrebno i dogovoriti cenu i rok pre početka rada.</p>
      <div className="services-actions">
        <a className="services-button services-button--dark" href={`tel:${phone}`}><Phone size={20} aria-hidden="true" />Pozovite nas</a>
        <a className="services-button services-button--outline" href={`mailto:${business.email}?subject=${subject}`}><Mail size={20} aria-hidden="true" />Pošaljite upit</a>
      </div>
    </div>
    <div className="services-visit__address">
      <MapPin size={36} strokeWidth={1.6} aria-hidden="true" />
      <h3>{business.name}</h3>
      <address>{business.street}<br />{business.postalCode} {business.city}</address>
      <a className="services-inline-link" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer">Otvorite mapu <ArrowUpRight size={20} aria-hidden="true" /><span className="services-sr-only"> (novi prozor)</span></a>
      <Link className="services-inline-link" to="/contact">Kontakt i radno vreme <ChevronRight size={20} aria-hidden="true" /></Link>
    </div>
  </section>;
}
