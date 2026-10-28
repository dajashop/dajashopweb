import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import JsonLd from '../components/seo/JsonLd.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import ServiceVisual from '../components/services/ServiceVisual.jsx';
import { ServiceBreadcrumbs, ServiceCard, ServiceVisit } from '../components/services/ServiceShared.jsx';
import { serviceCatalog, servicesOverview } from '../data/serviceCatalog.js';
import { seoConfig } from '../config/seo.js';
import { scrollToServiceSection } from '../utils/serviceSectionNavigation.js';
import './Usluge.css';

export default function Usluge() {
  const base = seoConfig.siteUrl.replace(/\/$/, '');
  return <div className="services-page">
    <SEOHead {...servicesOverview} url="/usluge" defer={false}>
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Lasersko graviranje — jedna od pet DajaShop usluga u Nišu" />
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
    <header className="services-hero services-hero--overview">
      <ServiceVisual />
      <div className="services-hero__copy">
        <span className="services-hero__location"><MapPin size={19} aria-hidden="true" />DajaShop u Nišu</span>
        <h1>Usluge sa pažnjom za svaki detalj.</h1>
        <p>Gravura koja ostaje. Sat koji ponovo radi i lepo stoji. Daljinski za jednostavniji ulazak. Sve na jednom mestu.</p>
        <div className="services-actions">
          <a className="services-button services-button--light" href="#sve-usluge" onClick={scrollToServiceSection}>Izaberite uslugu <ArrowDown size={20} aria-hidden="true" /></a>
          <Link className="services-hero__link" to="/contact">Kontaktirajte nas <ArrowUpRight size={20} aria-hidden="true" /></Link>
        </div>
      </div>
    </header>

    <section className="services-section" id="sve-usluge" aria-labelledby="services-all-title">
      <div className="services-section-heading">
        <h2 id="services-all-title">Šta možemo da uradimo za vas?</h2>
        <p>Izaberite uslugu i pogledajte šta obuhvata, šta da ponesete i kako da nam se javite.</p>
      </div>
      <div className="services-grid">{serviceCatalog.map((service, index) => <ServiceCard service={service} featured={index === 0} key={service.slug} />)}</div>
    </section>

    <section className="services-process" aria-labelledby="services-process-title">
      <div className="services-section-heading"><h2 id="services-process-title">Od vašeg pitanja do rešenja.</h2><p>Bez nejasnoća: mogućnost rada, cenu i rok dogovaramo sa vama pre početka.</p></div>
      <ol>
        <li><span>01</span><h3>Izaberite uslugu</h3><p>Pogledajte detalje i pripremite predmet ili podatke koji su potrebni.</p></li>
        <li><span>02</span><h3>Javite se ili svratite</h3><p>Pozovite nas za prvu informaciju ili dođite u našu radnju u Nišu.</p></li>
        <li><span>03</span><h3>Dogovorimo detalje</h3><p>Pregledamo predmet i zajedno potvrdimo odgovarajući način rada.</p></li>
      </ol>
    </section>
    <ServiceVisit />
  </div>;
}
