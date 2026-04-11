import React, { useMemo } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import HeroBgSlider from '../components/HeroBgSlider.jsx';
import BrandStrip from '../components/BrandStrip.jsx';
import TrustBar from '../components/TrustBar.jsx';
import WatchFinder from '../components/WatchFinder.jsx';
import useProducts from '../hooks/useProducts.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import OrganizationJsonLd from '../components/seo/OrganizationJsonLd.jsx';
import { ArrowRight, Phone, CheckCircle2, ShieldCheck, Wrench, Headset } from 'lucide-react';
import { seoConfig } from '../config/seo.js';

const HERO_SLIDES = [
  {
    src: '/images/banner-watches-casio.png',
    alt: 'Casio kolekcija',
    to: '/catalog?brand=CASIO',
  },
  {
    src: '/images/model_banner_bed6ebb9-b47f-438a-835e-f63534a7d455.jpg',
    alt: 'Daniel Klein izbor',
    to: '/catalog?brand=DANIEL%20KLEIN',
  },
  {
    src: '/images/casio-g-shock-original-ga-2100-4aer-carbon-core-guard_183960_205228.jpg',
    alt: 'G-Shock GA-2100',
    to: '/catalog?brand=CASIO&category=G-SHOCK',
  },
];

const TOP_SLUGS = [
  'casio-mtp-1314pl-8a',
  'daniel-3271',
  'qq-classic-qw12',
  'ga-100-1a1',
  'orient-diver',
  'daniel-klein-dk13965-4',
];

const CATEGORY_TILES = [
  {
    title: 'Ženski satovi',
    image: '/images/daniel-klain-5252.PNG',
    to: '/catalog?gender=ŽENSKI',
  },
  {
    title: 'G‑Shock',
    image: '/images/casio-g-shock-original-ga-2100-4aer-carbon-core-guard_183960_205228.jpg',
    to: '/catalog?brand=CASIO&category=G-SHOCK',
  },
  {
    title: 'Nakit & pokloni',
    image: '/images/Casiothumb.webp',
    to: '/catalog?category=NAKIT',
    wide: true,
  },
];

function BestProductItem({ product }) {
  if (!product) return null;
  const primaryImg =
    product.thumbnailUrl ||
    product.images?.[0]?.url ||
    product.image ||
    'https://via.placeholder.com/640x640.png?text=Watch';

  return (
    <article className="bestCard">
      <Link to={`/product/${product.slug}`} className="bestCard__img">
        <img src={primaryImg} alt={product.name} loading="lazy" />
      </Link>
      <div className="bestCard__body">
        <div className="bestCard__meta">RUČNI SAT</div>
        <Link to={`/product/${product.slug}`} className="bestCard__name">
          {product.name}
        </Link>
        <div className="bestCard__price">
          {Number(product.price || 0).toLocaleString('sr-RS')} RSD
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const { items, loading } = useProducts({ order: 'name', limit: 64 });

  const topProducts = useMemo(() => {
    if (!items?.length) return [];
    const filtered = items.filter((p) => TOP_SLUGS.includes(p.slug));
    const orderMap = TOP_SLUGS.reduce((acc, slug, idx) => {
      acc[slug] = idx;
      return acc;
    }, {});
    return filtered.sort((a, b) => (orderMap[a.slug] ?? 99) - (orderMap[b.slug] ?? 99));
  }, [items]);

  const bestProducts = useMemo(() => {
    const curated = topProducts.slice(0, 4);
    if (curated.length >= 4) return curated;
    const seen = new Set(curated.map((p) => p.id));
    const extras = (items || [])
      .filter((p) => !seen.has(p.id))
      .slice(0, 4 - curated.length);
    return [...curated, ...extras].slice(0, 4);
  }, [topProducts, items]);

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
        <HeroBgSlider slides={HERO_SLIDES} interval={5600} />
      </section>

      {/* TRUST BAR */}
      <TrustBar
        variant="glass"
        mobileVariant="cards"
        items={[
          { icon: CheckCircle2, title: 'Original proizvodi', desc: 'Direktno od brendova' },
          { icon: ShieldCheck, title: '2 godine garancije', desc: 'Na mehanizam i bateriju' },
          { icon: Wrench, title: 'Ovlašćeni servis', desc: 'Podešavanje i zamena' },
          { icon: Headset, title: 'Podrška', desc: 'Telefon, Viber, email' },
        ]}
      />

      {/* BRAND STRIP */}
      <BrandStrip
        brands={['CASIO', 'DANIEL KLEIN', 'Q&Q', 'ORIENT', 'G-SHOCK', 'EDIFICE', 'RETRO']}
      />

      {/* WATCH FINDER */}
      <section id="watchfinder" className="watchfinder-section watchfinder-section--light">
        <div className="watchfinder-section__inner">
          <WatchFinder
            fullWidth
            showIntro={false}
            layout="split"
            variant="editorial"
            className="watchfinder-home"
          />
        </div>
      </section>

      {/* CATEGORIES HERO TILES */}
      <section className="section container categories">
        <div className="categories-grid">
          {CATEGORY_TILES.map((tile) => (
            <Link
              key={tile.title}
              to={tile.to}
              className={`categoryTile ${tile.wide ? 'categoryTile--wide' : ''}`}
            >
              <div className="categoryTile__img">
                <img src={tile.image} alt={tile.title} loading="lazy" />
              </div>
              <div className="categoryTile__label">{tile.title}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* NAJPRODAVANIJE - vitrina */}
      <section className="section container best">
        <div className="section__head">
          <div className="section__titleRow">
            <h2 className="section__title">Preporučujemo</h2>
          </div>
        </div>
      <div className="best-grid">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card skeleton-card--best" />
            ))}
          {!loading &&
            bestProducts.map((p, idx) => (
              <BestProductItem key={p.id || p.slug || idx} product={p} />
            ))}
        </div>
        <div className="best__cta">
          <Link to="/catalog?sort=popular" className="btn btn--dark">
            Pogledajte sve <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* KOLEKCIJE / MOOD PLOČE removed per request */}
      {/* STORY BLOCK removed per request */}

      {/* SERVICE HERO CTA */}
      <section className="section container serviceHero">
        <Link to="/usluge" className="serviceHero__card">
          <div className="serviceHero__content">
            <p className="eyebrow">Servis</p>
            <h2>Servis i tim koji zna svaki model.</h2>
            <p className="lede">
              Zamena baterije i narukvice uz ovlašćene majstore i originalne
              delove.
            </p>
            <div className="serviceHero__cta">
              <span className="btn btn--ghost serviceHero__btn">
                Saznaj više <ArrowRight size={16} />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* CONCIERGE CTA */}
      <section className="section container concierge">
        <div className="concierge__card">
          <div>
            <p className="eyebrow">Treba preporuka?</p>
            <h3>Concierge / Kontakt</h3>
            <p className="lede">
              Javi se i zajedno ćemo odabrati sat koji odgovara tvom stilu i
              budžetu.
            </p>
            <div className="concierge__actions">
              <a className="btn btn--primary" href="tel:+381641262425">
                <Phone size={18} /> +381 64 126 24 25
              </a>
              <Link to="/contact" className="btn btn--ghost">
                Piši nam
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
