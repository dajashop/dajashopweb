import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, ChevronRight, Mail, MapPin, Plus } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import JsonLd from '../components/seo/JsonLd.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import ServiceVisual from '../components/services/ServiceVisual.jsx';
import { ServiceBreadcrumbs, ServiceFacts, ServiceIcon, ServiceVisit } from '../components/services/ServiceShared.jsx';
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
  const subject = encodeURIComponent(`Upit: ${service.title}`);

  return <div className="services-page services-page--detail" key={service.slug}>
    <SEOHead title={title} description={service.description} keywords={service.keywords} image={service.image} url={service.path} defer={false}>
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
    </SEOHead>
    <BreadcrumbJsonLd defer={false} items={[{ name: 'Usluge', url: `${base}/usluge` }, { name: service.title, url: canonical }]} />
    <JsonLd defer={false} data={{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
          name: title, description: service.description, inLanguage: 'sr-Latn',
          isPartOf: { '@id': `${base}/usluge#webpage` }, mainEntity: { '@id': `${canonical}#service` }
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
    <header className={`services-hero services-hero--${service.kind}`}>
      <ServiceVisual kind={service.kind} />
      <div className="services-hero__copy">
        <span className="services-hero__location"><MapPin size={19} aria-hidden="true" />U našoj radnji u Nišu</span>
        <h1>{service.title}</h1>
        <p>{service.summary}</p>
        <div className="services-actions">
          <a className="services-button services-button--light" href={`mailto:${seoConfig.business.email}?subject=${subject}`}><Mail size={20} aria-hidden="true" />Pošaljite upit</a>
          <a className="services-hero__link" href="#o-usluzi">Pogledajte detalje <ArrowDown size={20} aria-hidden="true" /></a>
        </div>
      </div>
    </header>
    <ServiceFacts items={service.included} />

    <section className="services-about services-section" id="o-usluzi" aria-labelledby="services-about-title">
      <div className="services-about__copy">
        <h2 id="services-about-title">{service.tagline}</h2>
        {service.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <Link className="services-service-action" to={service.action.path}>{service.action.label}<ArrowUpRight size={23} aria-hidden="true" /></Link>
      </div>
      <aside className="services-preparation" aria-labelledby="services-prepare-title">
        <span className="services-preparation__icon"><ServiceIcon kind={service.kind} size={32} /></span>
        <h2 id="services-prepare-title">Šta da ponesete?</h2>
        <ul>{service.bring.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="services-preparation__note">{service.note}</p>
      </aside>
    </section>

    <section className="services-faq" aria-labelledby="services-faq-title">
      <div className="services-section-heading">
        <h2 id="services-faq-title">Odgovori pre dolaska.</h2>
        <p>Niste pronašli odgovor? <Link className="services-inline-link" to="/contact">Javite nam se <ArrowUpRight size={20} aria-hidden="true" /></Link></p>
      </div>
      <div className="services-faq__items">{service.faqs.map(faq => <details key={faq.question}>
        <summary>{faq.question}<Plus size={24} aria-hidden="true" /></summary><p>{faq.answer}</p>
      </details>)}</div>
    </section>
    <ServiceVisit service={service} />

    <section className="services-section services-more" aria-labelledby="services-related-title">
      <div className="services-section-heading"><h2 id="services-related-title">Još usluga u našoj radnji.</h2><Link className="services-inline-link" to="/usluge">Sve usluge <ArrowUpRight size={21} aria-hidden="true" /></Link></div>
      <div className="services-related">{serviceCatalog.filter(item => item.slug !== service.slug).map(item => <Link key={item.slug} to={item.path}>
        <ServiceVisual kind={item.kind} variant="related" />
        <h3>{item.title}</h3><ChevronRight size={23} aria-hidden="true" />
      </Link>)}</div>
    </section>
  </div>;
}
