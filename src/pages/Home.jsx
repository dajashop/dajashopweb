import React, { useMemo, useState } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import HeroBgSlider from '../components/HeroBgSlider.jsx';
import BrandStrip from '../components/BrandStrip.jsx';
import TrustBar from '../components/TrustBar.jsx';
import HomeProductCard from '../components/home/HomeProductCard.jsx';
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

const HERO_BRANDS = [
  { label: 'Casio', to: '/catalog?brand=CASIO' },
  { label: 'Daniel Klein', to: '/catalog?brand=DANIEL%20KLEIN' },
  { label: 'Q&Q', to: '/catalog?brand=Q%26Q' },
  { label: 'Orient', to: '/catalog?brand=ORIENT' },
];

const PROMO_TRIO = [
  {
    title: 'Casio kolekcija',
    subtitle: 'Kupite kolekciju',
    image: '/images/banner-watches-casio.png',
    to: '/catalog?brand=CASIO',
  },
  {
    title: 'Daniel Klein',
    subtitle: 'Kupite kolekciju',
    image: '/images/model_banner_bed6ebb9-b47f-438a-835e-f63534a7d455.jpg',
    to: '/catalog?brand=DANIEL%20KLEIN',
  },
  {
    title: 'G‑Shock / Sport',
    subtitle: 'Kupite kolekciju',
    image: '/images/casio-g-shock-original-ga-2100-4aer-carbon-core-guard_183960_205228.jpg',
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

const GENDER_FILTERS = [
  { key: 'ALL', label: 'Svi' },
  { key: 'MUŠKI', label: 'Muški' },
  { key: 'ŽENSKI', label: 'Ženski' },
  { key: 'UNISEX', label: 'Unisex' },
];

const STYLE_FILTERS = [
  { key: 'ALL', label: 'Sve' },
  { key: 'SPORT', label: 'Sport' },
  { key: 'DRESS', label: 'Dress' },
  { key: 'RETRO', label: 'Retro' },
  { key: 'SMART', label: 'Smart' },
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

function normalize(val) {
  return (val || '').toString().toUpperCase().trim();
}

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

function matchesGender(product, selected) {
  if (selected === 'ALL') return true;
  const g = normalize(product.gender);
  if (selected === 'UNISEX') return g === 'UNISEX' || !g;
  if (selected === 'MUŠKI') return g === 'MUŠKI' || g === 'MUSKI';
  if (selected === 'ŽENSKI') return g === 'ŽENSKI' || g === 'ZENSKI';
  return true;
}

function matchesStyle(product, selected) {
  if (selected === 'ALL') return true;
  const cat = normalize(product.category);
  if (!cat) return selected === 'ALL';
  return cat.includes(selected);
}

export default function Home() {
  const [gender, setGender] = useState('ALL');
  const [style, setStyle] = useState('ALL');
  const [startFinder, setStartFinder] = useState(false);

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

  const filteredTop = useMemo(
    () =>
      topProducts.filter(
        (p) => matchesGender(p, gender) && matchesStyle(p, style),
      ),
    [topProducts, gender, style],
  );

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
        <div className="hero__overlay">
          <div className="container hero__content">
            <p className="eyebrow">Nova sezona</p>
            <h1>Preciznost. Bez šuma.</h1>
            <p className="lede">
              Kurirani izbor satova bez viška priče. Originali, 2 godine
              garancije i servis koji poznaje svaki model.
            </p>

            <div className="hero__cta">
              <Link to="/catalog" className="btn btn--primary">
                Pogledaj katalog <ArrowRight size={18} />
              </Link>
              <div className="hero__chips">
                {HERO_BRANDS.map((b) => (
                  <Link key={b.label} to={b.to} className="chip">
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hero__miniTrust">
              <span>✓ Original 100%</span>
              <span>✓ 24 meseca garancija</span>
              <span>✓ Ovlašćeni servis</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROMO TRIO */}
      <section className="section container promo-rail">
        {PROMO_TRIO.map((p) => (
          <Link key={p.title} to={p.to} className="promoCard">
            <div className="promoCard__img">
              <img src={p.image} alt={p.title} loading="lazy" />
            </div>
            <div className="promoCard__body">
              <div className="promoCard__title">{p.title}</div>
              <div className="promoCard__subtitle">{p.subtitle}</div>
            </div>
          </Link>
        ))}
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

      {/* WATCH FINDER HERO */}
      <section className="watchfinder-hero">
        <div className={`watchfinder-hero__panel ${startFinder ? 'is-active' : ''}`}>
          <div className="watchfinder-hero__text">
            <p className="eyebrow">Watch Finder</p>
            <h2>Pronađi sat koji ti stvarno leži.</h2>
            <p className="lede">
              Par kratkih odgovora vodi do predloga po stilu, budžetu i funkcijama. Ako nisi siguran,
              tu smo da pomognemo.
            </p>
            <div className="watchfinder-hero__actions">
              <Link to="/watch-finder" className="btn btn--primary">
                Pokreni Watch Finder
              </Link>
              <Link to="/usluge" className="btn btn--ghost">
                Saznaj više
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WATCH FINDER */}
      <section id="watchfinder" className="watchfinder-section watchfinder-section--dark">
        <div className="watchfinder-section__inner">
          <WatchFinder
            autoStart={startFinder}
            fullWidth
            showIntro={false}
            layout="stack"
            variant="dark"
          />
        </div>
      </section>

      {/* TOP SELEKCIJA */}
      <section className="section container">
        <div className="section__head">
          <div>
            <p className="eyebrow">Top selekcija</p>
            <h2 className="section__title">Bestseller izbor</h2>
          </div>
          <Link to="/catalog" className="link">
            Pogledaj sve
          </Link>
        </div>

        <div className="chips-row">
          <div className="chip-group" aria-label="Filter pol">
            {GENDER_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`chip ${gender === f.key ? 'is-active' : ''}`}
                onClick={() => setGender((prev) => (prev === f.key ? 'ALL' : f.key))}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="chip-group" aria-label="Filter stil">
            {STYLE_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`chip ${style === f.key ? 'is-active' : ''}`}
                onClick={() => setStyle((prev) => (prev === f.key ? 'ALL' : f.key))}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="top-grid">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}

          {!loading && filteredTop.length === 0 && (
            <div className="empty">
              Još punimo ovu selekciju. Pogledaj katalog dok čekamo drop.
            </div>
          )}

          {!loading &&
            filteredTop.map((p) => <HomeProductCard key={p.id} product={p} />)}
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
