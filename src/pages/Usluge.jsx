import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import JsonLd from '../components/seo/JsonLd.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import ServiceArtwork from '../components/services/ServiceArtwork.jsx';
import { ServiceBreadcrumbs, ServiceIcon, ServiceVisit } from '../components/services/ServiceShared.jsx';
import { serviceCatalog, servicesOverview } from '../data/serviceCatalog.js';
import { seoConfig } from '../config/seo.js';
import './Usluge.css';

export default function Usluge() {
  const base = seoConfig.siteUrl.replace(/\/$/, '');
  return <div className="svc-page">
    <SEOHead {...servicesOverview} url="/usluge" defer={false}>
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="DajaShop — usluge u Nišu" />
    </SEOHead>
    <BreadcrumbJsonLd defer={false} items={[{ name: 'Usluge', url: `${base}/usluge` }]} />
    <JsonLd defer={false} data={{
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      '@id': `${base}/usluge#webpage`, url: `${base}/usluge`,
      name: servicesOverview.title, description: servicesOverview.description,
      inLanguage: 'sr-Latn',
      mainEntity: {
        '@type': 'ItemList', numberOfItems: serviceCatalog.length,
        itemListElement: serviceCatalog.map((service, index) => ({
          '@type': 'ListItem', position: index + 1, name: service.title, url: `${base}${service.path}`
        }))
      }
    }} />
    <ServiceBreadcrumbs />
    <header className="svc-hero">
      <div className="svc-hero-copy">
        <p className="svc-kicker">DajaShop, usluge u Nišu</p>
        <h1>Usluge u Nišu.<br /><span>Pažnja u detaljima.</span></h1>
        <p className="svc-lead">Lični pečat na poklonu. Sat koji ponovo radi i dobro stoji. Daljinski za lakši ulazak. Pet usluga, na jednom mestu.</p>
        <div className="svc-actions">
          <a className="svc-button svc-button--primary" href="#sve-usluge">Istražite usluge <ArrowDown size={18} aria-hidden="true" /></a>
          <Link className="svc-text-link" to="/contact">Kontaktirajte nas <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className="svc-location"><MapPin size={16} aria-hidden="true" /> {seoConfig.business.street}, {seoConfig.business.city}</p>
      </div>
      <div className="svc-hero-art" aria-hidden="true">
        <span className="svc-art-label">Detalji koji znače</span>
        <ServiceArtwork />
        <div className="svc-art-caption"><span>01 — 05</span><span>Usluge u našoj radnji</span></div>
      </div>
    </header>
    <section className="svc-section" id="sve-usluge" aria-labelledby="svc-all-title">
      <div className="svc-section-heading">
        <div><p className="svc-kicker">Šta radimo</p><h2 id="svc-all-title">Izaberite svoju uslugu.</h2></div>
        <p>Otvorite uslugu za detalje, pripremu za dolazak i odgovore na česta pitanja.</p>
      </div>
      <div className="svc-grid">
        {serviceCatalog.map((service, index) => <Link className={`svc-card${index === 0 ? ' svc-card--featured' : ''}`} to={service.path} key={service.slug}>
          <div className="svc-card-content">
            <div className="svc-card-top"><span className="svc-icon"><ServiceIcon kind={service.kind} /></span><span className="svc-number">0{index + 1}</span></div>
            <p className="svc-card-category">{service.category}</p>
            <h3>{service.title}</h3>
            <p className="svc-card-summary">{service.summary}</p>
            <span className="svc-card-link">Saznajte više <ArrowUpRight size={20} aria-hidden="true" /></span>
          </div>
          {index === 0 && <div className="svc-card-art"><ServiceArtwork kind={service.kind} /></div>}
        </Link>)}
      </div>
    </section>
    <section className="svc-section" aria-labelledby="svc-process-title">
      <div className="svc-section-heading"><div><p className="svc-kicker">Kako izgleda poseta</p><h2 id="svc-process-title">Jednostavno, korak po korak.</h2></div></div>
      <ol className="svc-process">
        <li><span>01</span><h3>Izaberite uslugu</h3><p>Pogledajte šta usluga obuhvata i šta je korisno poneti.</p></li>
        <li><span>02</span><h3>Javite se ili svratite</h3><p>Za dodatne informacije nas pozovite, ili donesite predmet u radnju u Nišu.</p></li>
        <li><span>03</span><h3>Dogovorimo detalje</h3><p>Nakon pregleda potvrđujemo mogućnost izrade, cenu i rok.</p></li>
      </ol>
    </section>
    <ServiceVisit />
  </div>;
}
