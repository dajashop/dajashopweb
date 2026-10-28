import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Check, Phone } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import JsonLd from '../components/seo/JsonLd.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import ServiceArtwork from '../components/services/ServiceArtwork.jsx';
import { ServiceBreadcrumbs, ServiceIcon, ServiceVisit } from '../components/services/ServiceShared.jsx';
import { getService, serviceCatalog } from '../data/serviceCatalog.js';
import { seoConfig } from '../config/seo.js';
import PageStatus from './PageStatus.jsx';
import './Usluge.css';

export default function ServiceDetail() {
  const { serviceSlug } = useParams();
  const service = getService(serviceSlug);
  if (!service) return <PageStatus status={404} />;
  const base = seoConfig.siteUrl.replace(/\/$/, '');
  const canonical = `${base}${service.path}`;
  const title = service.seoTitle || `${service.title} u Nišu`;
  const provider = { '@id': `${base}/#organization` };

  return <div className="svc-page svc-detail" key={service.slug}>
    <SEOHead title={title} description={service.description} keywords={service.keywords} image={service.image} url={service.path} defer={false}>
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`DajaShop — ${title}`} />
    </SEOHead>
    <BreadcrumbJsonLd defer={false} items={[{ name: 'Usluge', url: `${base}/usluge` }, { name: service.title, url: canonical }]} />
    <JsonLd defer={false} data={{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
          name: title, description: service.description, inLanguage: 'sr-Latn',
          isPartOf: { '@id': `${base}/usluge#webpage` },
          mainEntity: { '@id': `${canonical}#service` }
        },
        {
          '@type': 'Service', '@id': `${canonical}#service`,
          name: service.title, serviceType: service.title, description: service.description,
          url: canonical, image: `${base}${service.image}`, provider,
          areaServed: { '@type': 'City', name: seoConfig.business.city },
          availableChannel: { '@type': 'ServiceChannel', serviceLocation: provider }
        }
      ]
    }} />
    <ServiceBreadcrumbs service={service} />
    <header className="svc-hero">
      <div className="svc-hero-copy">
        <p className="svc-kicker">DajaShop, {service.category}</p>
        <h1>{service.title}<span className="svc-city"> u Nišu.</span></h1>
        <p className="svc-lead">{service.summary}</p>
        <div className="svc-actions">
          <a className="svc-button svc-button--primary" href={`tel:${seoConfig.business.phone.replace(/[^+\d]/g, '')}`}><Phone size={18} aria-hidden="true" /> Pozovite za informacije</a>
          <a className="svc-text-link" href="#o-usluzi">O usluzi <ArrowDown size={18} aria-hidden="true" /></a>
        </div>
      </div>
      <div className="svc-hero-art" aria-hidden="true">
        <span className="svc-art-label">{service.category}</span>
        <ServiceArtwork kind={service.kind} />
        <p className="svc-art-tagline">{service.tagline}</p>
      </div>
    </header>
    <div className="svc-details-layout svc-section" id="o-usluzi">
      <section className="svc-description" aria-labelledby="svc-about-title">
        <p className="svc-kicker">O usluzi</p>
        <h2 id="svc-about-title">{service.tagline}</h2>
        {service.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <h3>Šta usluga obuhvata</h3>
        <ul className="svc-checklist">{service.included.map(item => <li key={item}><Check size={19} aria-hidden="true" /><span>{item}</span></li>)}</ul>
        <Link className="svc-text-link" to={service.action.path}>{service.action.label} <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <aside className="svc-prepare" aria-labelledby="svc-prepare-title">
        <span className="svc-icon"><ServiceIcon kind={service.kind} size={28} /></span>
        <h2 id="svc-prepare-title">Pre nego što svratite</h2>
        <p>Ponesite ono što će nam pomoći da pronađemo odgovarajuće rešenje.</p>
        <ol>{service.bring.map(item => <li key={item}>{item}</li>)}</ol>
        <p className="svc-note">{service.note}</p>
      </aside>
    </div>
    <section className="svc-faq svc-section" aria-labelledby="svc-faq-title">
      <div><p className="svc-kicker">Dobro je znati</p><h2 id="svc-faq-title">Česta pitanja.</h2><p>Još nešto vas zanima? <Link to="/contact">Tu smo da pomognemo.</Link></p></div>
      <div className="svc-faq-items">{service.faqs.map(faq => <details key={faq.question}>
        <summary>{faq.question}<span aria-hidden="true" className="svc-faq-plus" /></summary>
        <p>{faq.answer}</p>
      </details>)}</div>
    </section>
    <ServiceVisit service={service} />
    <section className="svc-section" aria-labelledby="svc-related-title">
      <div className="svc-section-heading"><div><p className="svc-kicker">Još iz naše radnje</p><h2 id="svc-related-title">Ostale usluge.</h2></div><Link className="svc-text-link" to="/usluge">Sve usluge <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      <div className="svc-related">{serviceCatalog.filter(item => item.slug !== service.slug).map(item => <Link key={item.slug} to={item.path}>
        <ServiceIcon kind={item.kind} /><h3>{item.title}</h3><ArrowUpRight size={18} aria-hidden="true" />
      </Link>)}</div>
    </section>
  </div>;
}
