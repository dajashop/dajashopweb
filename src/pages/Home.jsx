import React from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel.jsx';
import BrandStrip from '../components/BrandStrip.jsx';
import HeroBgSlider from '../components/HeroBgSlider.jsx';
import FeaturedSlider from '../components/FeaturedSlider.jsx';
import { Check } from 'lucide-react';
import TrustBar from '../components/TrustBar.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import OrganizationJsonLd from '../components/seo/OrganizationJsonLd.jsx';
import { seoConfig } from '../config/seo.js';

const bgSlides = [
  {
    src: '/images/banner-watches-casio.png',
    alt: 'Casio',
    to: '/catalog?brand=CASIO',
  },
  {
    src: '/images/model_banner_bed6ebb9-b47f-438a-835e-f63534a7d455.jpg',
    alt: 'Daniel Klein',
    to: '/catalog?brand=DANIEL+KLEIN',
  },
  { src: '/images/q&q.png', alt: 'Q&Q', to: '/catalog?brand=Q%26Q' },
];

export default function Home() {
  return (
    <div className="home">
      <SEOHead
        title="Početna"
        description={seoConfig.siteDescription}
        keywords={seoConfig.siteKeywords}
        type="website"
      />
      <OrganizationJsonLd />

      {/* HERO */}
      <section className="hero">
        <HeroBgSlider slides={bgSlides} interval={5200} />
        <picture className="hero__media">
          {/* zameni placeholder realnim coverom */}
          <img src="/placeholder.png" alt="" />
        </picture>

        {/* glass panel
        <div className="hero__glass card shadow">
          <div className="hero__wrap container">
            <div className="hero__copy">
              <h1 className="hero__title">
                Vreme je da <span className="gradient">zablistaš</span>
              </h1>
              <p className="hero__lead">
                Minimalistički izbor satova – bez suvišnih priča. Samo dobar
                dizajn.
              </p>
              <div className="hero__actions">
                <Link to="/catalog" className="btn btn--primary">
                  Pogledaj katalog
                </Link>
                <Link to="/catalog?brand=CASIO" className="btn btn--ghost">
                  Casio
                </Link>
              </div>
            </div>
          </div>
        </div> */}
      </section>

      {/* TRUST BAR
      <section className="trust container">
        <div className="trust__item">
          <Check /> Original proizvodi
        </div>
        <div className="trust__item">🚚 Isporuka širom Srbije</div>
        <div className="trust__item">🔄 14 dana povraćaj</div>
        <div className="trust__item">☎️ Podrška</div>
      </section> */}
      <TrustBar variant="glass" mobileVariant="cards" />

      {/* BRAND STRIP (marquee-like, ali bez animacije koja smara) */}
      <BrandStrip
        brands={[
          'CASIO',
          'DANIEL KLEIN',
          'Q&Q',
          'ORIENT',
          'G-SHOCK',
          'EDIFICE',
          'SHEEN',
          'RETRO',
        ]}
      />

      {/* FEATURED SLIDER */}
      <FeaturedSlider />
      {/* <section className="section container">
        <div className="section__head">
          <h2 className="section__title">Izdvojeno</h2>
          <Link to="/catalog" className="link">
            Sve
          </Link>
        </div>

        <Carousel autoPlay interval={4500} showDots>
          {izdvojeno.map((item, i) => (
            <article key={i} className="card productCard">
              <div className="productCard__img">
                <img src={item.img} alt={`Model ${item.name}`} loading="lazy" />
              </div>
              <div className="productCard__body">
                <div className="productCard__brand">{item.brand}</div>
                <div className="productCard__name">{item.name}</div>
                <div className="productCard__price">{item.price}</div>
                <div className="productCard__actions">
                  <Link to={item.to} className="btn btn--primary">
                    Detalji
                  </Link>
                  <Link to="/cart" className="btn btn--ghost">
                    Dodaj
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </Carousel>
      </section> */}

      {/* EDITORIAL SLIDE (čisto, velika tipografija) */}
      <section className="section container">
        <div className="section__head">
          <h2 className="section__title">Kolekcije</h2>
        </div>

        <Carousel autoPlay interval={5200} arrows>
          <div className="editorial">
            <div className="editorial__copy">
              <h3>Retro</h3>
              <p>Ikonični modeli koji su obeležili generacije.</p>
              <Link to="/catalog?category=RETRO" className="btn btn--primary">
                Retro linija
              </Link>
            </div>
            <img
              className="editorial__img"
              src="images/Screenshot 2025-11-13 at 5.39.19 PM.png"
              alt=""
            />
          </div>

          <div className="editorial">
            <div className="editorial__copy">
              <h3>G-Shock</h3>
              <p>Robusnost bez kompromisa. Za teren i grad.</p>
              <Link to="/catalog?category=G-SHOCK" className="btn btn--primary">
                G-Shock
              </Link>
            </div>
            <img
              className="editorial__img"
              src="images/casio-g-shock-original-ga-2100-4aer-carbon-core-guard_183960_205228.jpg"
              alt=""
            />
          </div>

          <div className="editorial">
            <div className="editorial__copy">
              <h3>Ženski izbor</h3>
              <p>Elegancija koja prati tvoj dan.</p>
              <Link to="/catalog?gender=ŽENSKI" className="btn btn--primary">
                Pogledaj
              </Link>
            </div>
            <img
              className="editorial__img"
              src="/images/daniel-klain-5252.PNG"
              alt=""
            />
          </div>
        </Carousel>
      </section>
    </div>
  );
}
