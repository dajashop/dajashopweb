import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import HeroBgSlider from '../components/HeroBgSlider.jsx';
import BrandStrip from '../components/BrandStrip.jsx';
import TrustBar from '../components/TrustBar.jsx';
import WatchFinder from '../components/WatchFinder.jsx';
import useProducts from '../hooks/useProducts.js';
import { useAuth } from '../hooks/useAuth';
import { useFlash } from '../hooks/useFlash.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import OrganizationJsonLd from '../components/seo/OrganizationJsonLd.jsx';
import { isAdminEmail } from '../services/dajaPlatform';
import { saveProduct } from '../services/products';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Headset,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Search,
  X,
} from 'lucide-react';
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
const BEST_COUNT = 6;
const HOME_RECOMMENDED_RANK_FIELD = 'homeRecommendedRank';

const CATEGORY_TILES = [
  {
    title: 'Ženski satovi',
    image: '/images/daniel-klain-5252.PNG',
    to: '/catalog?gender=ŽENSKI',
  },
  {
    title: 'G-SHOCK',
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

function getPrimaryImage(product) {
  return (
    product?.thumbnailUrl ||
    product?.images?.[0]?.url ||
    product?.image ||
    'https://via.placeholder.com/640x640.png?text=Watch'
  );
}

function parseRecommendedRank(value) {
  const rank = Number(value);
  if (!Number.isFinite(rank) || rank < 1) return null;
  return Math.trunc(rank);
}

function BestProductItem({ product }) {
  if (!product) return null;
  const primaryImg = getPrimaryImage(product);

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

function BestEditCard({ onClick }) {
  return (
    <article className="bestCard bestCard--edit">
      <button type="button" className="bestEditCard__button" onClick={onClick}>
        <span className="bestEditCard__iconWrap">
          <PencilLine size={20} aria-hidden="true" />
        </span>
        <div className="bestEditCard__copy">
          <span className="bestEditCard__label">Admin alat</span>
          <span className="bestEditCard__title">Uredi preporučeno</span>
          <span className="bestEditCard__desc">
            Otvori listu satova i izaberi proizvode za ovu sekciju.
          </span>
        </div>
      </button>
    </article>
  );
}

export default function Home() {
  const { items, loading } = useProducts({ order: 'name', limit: 64 });
  const { user } = useAuth();
  const { flash } = useFlash();
  const bestGridRef = useRef(null);
  const scrollCooldownRef = useRef(null);
  const interactionTimerRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isBestHovered, setIsBestHovered] = useState(false);
  const [isBestInteracting, setIsBestInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = useState(false);
  const [recommendedDraftIds, setRecommendedDraftIds] = useState([]);
  const [recommendedSearch, setRecommendedSearch] = useState('');
  const [isSavingRecommended, setIsSavingRecommended] = useState(false);
  const isAdmin = !!user?.email && isAdminEmail(user.email);

  const adminRecommendedProducts = useMemo(() => {
    return (items || [])
      .filter(
        (p) => parseRecommendedRank(p?.[HOME_RECOMMENDED_RANK_FIELD]) !== null,
      )
      .sort(
        (a, b) =>
          parseRecommendedRank(a[HOME_RECOMMENDED_RANK_FIELD]) -
          parseRecommendedRank(b[HOME_RECOMMENDED_RANK_FIELD]),
      );
  }, [items]);

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
    const manual = adminRecommendedProducts.slice(0, BEST_COUNT);
    if (manual.length) {
      return manual;
    }

    const curated = topProducts.slice(0, BEST_COUNT);
    if (curated.length >= BEST_COUNT) return curated;
    const seen = new Set(curated.map((p) => p.id));
    const extras = (items || [])
      .filter((p) => !seen.has(p.id))
      .slice(0, BEST_COUNT - curated.length);
    return [...curated, ...extras].slice(0, BEST_COUNT);
  }, [adminRecommendedProducts, topProducts, items]);

  const watchProducts = useMemo(() => {
    const collator = new Intl.Collator('sr-RS', { sensitivity: 'base' });
    return (items || [])
      .filter((p) => (p.department || 'satovi') === 'satovi')
      .sort((a, b) => collator.compare(a.name || '', b.name || ''));
  }, [items]);

  const recommendedModalProducts = useMemo(() => {
    const selectedOrder = new Map(
      recommendedDraftIds.map((id, idx) => [id, idx]),
    );
    const query = recommendedSearch.trim().toLowerCase();

    return watchProducts
      .filter((p) => {
        if (!query) return true;
        const haystack = `${p.brand || ''} ${p.name || ''} ${p.slug || ''}`
          .trim()
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aPos = selectedOrder.has(a.id)
          ? selectedOrder.get(a.id)
          : Number.POSITIVE_INFINITY;
        const bPos = selectedOrder.has(b.id)
          ? selectedOrder.get(b.id)
          : Number.POSITIVE_INFINITY;
        if (aPos !== bPos) return aPos - bPos;
        return (a.name || '').localeCompare(b.name || '', 'sr-RS', {
          sensitivity: 'base',
        });
      });
  }, [watchProducts, recommendedDraftIds, recommendedSearch]);

  const openRecommendedModal = useCallback(() => {
    const source =
      adminRecommendedProducts.length > 0 ? adminRecommendedProducts : bestProducts;
    setRecommendedDraftIds(source.map((p) => p.id).filter(Boolean).slice(0, BEST_COUNT));
    setRecommendedSearch('');
    setIsRecommendedModalOpen(true);
  }, [adminRecommendedProducts, bestProducts]);

  const toggleRecommendedDraft = useCallback(
    (productId) => {
      setRecommendedDraftIds((prev) => {
        if (prev.includes(productId)) {
          return prev.filter((id) => id !== productId);
        }
        if (prev.length >= BEST_COUNT) {
          flash(
            'Maksimum dostignut',
            `Možeš da izabereš najviše ${BEST_COUNT} proizvoda.`,
            'info',
          );
          return prev;
        }
        return [...prev, productId];
      });
    },
    [flash],
  );

  const saveRecommendedSelection = useCallback(async () => {
    if (isSavingRecommended) return;

    const nextIds = recommendedDraftIds.filter(Boolean).slice(0, BEST_COUNT);
    const currentRankById = new Map(
      (items || [])
        .map((p) => ({
          id: p.id,
          rank: parseRecommendedRank(p?.[HOME_RECOMMENDED_RANK_FIELD]),
        }))
        .filter((p) => !!p.id && p.rank !== null)
        .map((p) => [p.id, p.rank]),
    );
    const nextRankById = new Map(nextIds.map((id, idx) => [id, idx + 1]));
    const changedIds = new Set([...currentRankById.keys(), ...nextRankById.keys()]);

    const updates = [];
    changedIds.forEach((id) => {
      const currentRank = currentRankById.has(id) ? currentRankById.get(id) : null;
      const nextRank = nextRankById.has(id) ? nextRankById.get(id) : null;
      if (currentRank === nextRank) return;
      updates.push(saveProduct({ id, [HOME_RECOMMENDED_RANK_FIELD]: nextRank }));
    });

    setIsSavingRecommended(true);
    try {
      await Promise.all(updates);
      flash('Sačuvano', 'Lista preporučenih satova je ažurirana.', 'success');
      setIsRecommendedModalOpen(false);
    } catch (error) {
      console.error('Saving recommended products failed:', error);
      const permissionDenied = error?.code === 'permission-denied';
      flash(
        permissionDenied ? 'Nema dozvolu za upis' : 'Greska pri cuvanju',
        permissionDenied
          ? 'Nemas DAJA admin prava za ovu akciju.'
          : 'Izbor nije sacuvan. Probaj ponovo.',
        'info',
      );
    } finally {
      setIsSavingRecommended(false);
    }
  }, [flash, isSavingRecommended, items, recommendedDraftIds]);

  const pauseForInteraction = useCallback((duration = 220) => {
    setIsBestInteracting(true);
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current);
    }
    interactionTimerRef.current = setTimeout(() => {
      setIsBestInteracting(false);
      interactionTimerRef.current = null;
    }, duration);
  }, []);

  const moveBestByCard = useCallback((direction = 1) => {
    const track = bestGridRef.current;
    if (!track || typeof window === 'undefined') return;

    const firstCard = track.querySelector('.bestCard, .skeleton-card--best');
    if (!firstCard) return;

    const styles = window.getComputedStyle(track);
    const gapValue = styles.columnGap !== 'normal' ? styles.columnGap : styles.gap;
    const gap = Number.parseFloat(gapValue) || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
    if (step <= 0 || maxScroll <= 0) return;

    const current = track.scrollLeft;
    let target = current + step * direction;

    if (direction > 0 && current >= maxScroll - step * 0.35) {
      target = 0;
    } else if (direction < 0 && current <= step * 0.35) {
      target = maxScroll;
    }

    target = Math.max(0, Math.min(target, maxScroll));
    track.scrollTo({ left: target, behavior: 'smooth' });

    if (scrollCooldownRef.current) clearTimeout(scrollCooldownRef.current);
    scrollCooldownRef.current = setTimeout(() => {
      scrollCooldownRef.current = null;
    }, 420);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const desktopQuery = window.matchMedia('(min-width: 1001px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncDesktop = () => setIsDesktop(desktopQuery.matches);
    const syncReducedMotion = () => setPrefersReducedMotion(reducedMotionQuery.matches);

    syncDesktop();
    syncReducedMotion();

    const addListener = (query, listener) => {
      if (query.addEventListener) query.addEventListener('change', listener);
      else query.addListener(listener);
    };
    const removeListener = (query, listener) => {
      if (query.removeEventListener) query.removeEventListener('change', listener);
      else query.removeListener(listener);
    };

    addListener(desktopQuery, syncDesktop);
    addListener(reducedMotionQuery, syncReducedMotion);

    return () => {
      removeListener(desktopQuery, syncDesktop);
      removeListener(reducedMotionQuery, syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scrollCooldownRef.current) clearTimeout(scrollCooldownRef.current);
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isRecommendedModalOpen || typeof window === 'undefined') return undefined;

    const prevOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsRecommendedModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isRecommendedModalOpen]);

  const visibleBestCardsCount =
    bestProducts.length + (isAdmin && !loading ? 1 : 0);
  const showDesktopArrows = !loading && isDesktop && visibleBestCardsCount > 4;
  const shouldAutoRotateBest =
    !loading &&
    !prefersReducedMotion &&
    !isRecommendedModalOpen &&
    bestProducts.length > 1 &&
    (!isDesktop || visibleBestCardsCount > 4);

  useEffect(() => {
    if (!shouldAutoRotateBest || isBestHovered || isBestInteracting) return undefined;

    const id = setInterval(() => {
      moveBestByCard(1);
    }, 4000);

    return () => clearInterval(id);
  }, [shouldAutoRotateBest, isBestHovered, isBestInteracting, moveBestByCard]);

  const handleBestScroll = useCallback(() => {
    if (scrollCooldownRef.current) return;
    pauseForInteraction(260);
  }, [pauseForInteraction]);

  const handleBestPointerDown = useCallback(() => {
    setIsBestInteracting(true);
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    }
  }, []);

  const handleBestPointerRelease = useCallback(() => {
    pauseForInteraction(180);
  }, [pauseForInteraction]);

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

      {/* NAJPRODAVANIJE - vitrina */}
      <section className="section container best">
        <div className="section__head">
          <div className="section__titleRow">
            <h2 className="section__title">Preporučujemo</h2>
          </div>
        </div>
        <div className="best-carousel">
          {showDesktopArrows && (
            <button
              type="button"
              className="best-carousel__arrow best-carousel__arrow--prev"
              onClick={() => moveBestByCard(-1)}
              aria-label="Prethodni proizvod"
            >
              <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}

          <div
            ref={bestGridRef}
            className="best-grid"
            onMouseEnter={() => setIsBestHovered(true)}
            onMouseLeave={() => {
              setIsBestHovered(false);
              pauseForInteraction(160);
            }}
            onPointerDown={handleBestPointerDown}
            onPointerUp={handleBestPointerRelease}
            onPointerCancel={handleBestPointerRelease}
            onPointerLeave={handleBestPointerRelease}
            onScroll={handleBestScroll}
          >
            {loading &&
              Array.from({ length: BEST_COUNT }).map((_, i) => (
                <div key={i} className="skeleton-card skeleton-card--best" />
              ))}
            {!loading && isAdmin && (
              <BestEditCard onClick={openRecommendedModal} />
            )}
            {!loading &&
              bestProducts.map((p, idx) => (
                <BestProductItem key={p.id || p.slug || idx} product={p} />
              ))}
          </div>

          {showDesktopArrows && (
            <button
              type="button"
              className="best-carousel__arrow best-carousel__arrow--next"
              onClick={() => moveBestByCard(1)}
              aria-label="Sledeci proizvod"
            >
              <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="best__cta">
          <Link to="/catalog?sort=popular" className="btn btn--dark">
            Pogledajte sve <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {isRecommendedModalOpen && (
        <div
          className="homeAdminModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-admin-recommended-title"
          onClick={() => setIsRecommendedModalOpen(false)}
        >
          <div
            className="homeAdminModal__card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="homeAdminModal__head">
              <div>
                <p className="homeAdminModal__eyebrow">Admin</p>
                <h3 id="home-admin-recommended-title">
                  Uredi preporučene proizvode
                </h3>
              </div>
              <button
                type="button"
                className="homeAdminModal__close"
                onClick={() => setIsRecommendedModalOpen(false)}
                aria-label="Zatvori modal"
              >
                <X size={18} />
              </button>
            </div>

            <p className="homeAdminModal__desc">
              Odaberi do {BEST_COUNT} satova. Redosled prati red kojim ih
              čekiraš.
            </p>

            <div className="homeAdminModal__toolbar">
              <label className="homeAdminModal__search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={recommendedSearch}
                  onChange={(event) => setRecommendedSearch(event.target.value)}
                  placeholder="Pretraži satove"
                />
              </label>
              <span className="homeAdminModal__counter">
                {recommendedDraftIds.length}/{BEST_COUNT}
              </span>
            </div>

            <div className="homeAdminModal__list">
              {recommendedModalProducts.map((product) => {
                const checked = recommendedDraftIds.includes(product.id);
                return (
                  <label
                    key={product.id}
                    className={`homeAdminModalItem ${checked ? 'is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecommendedDraft(product.id)}
                    />

                    <div className="homeAdminModalItem__img">
                      <img
                        src={getPrimaryImage(product)}
                        alt={product.name}
                        loading="lazy"
                      />
                    </div>

                    <div className="homeAdminModalItem__copy">
                      <span className="homeAdminModalItem__brand">
                        {product.brand}
                      </span>
                      <span className="homeAdminModalItem__name">
                        {product.name}
                      </span>
                      <span className="homeAdminModalItem__price">
                        {Number(product.price || 0).toLocaleString('sr-RS')} RSD
                      </span>
                    </div>
                  </label>
                );
              })}

              {!recommendedModalProducts.length && (
                <p className="homeAdminModal__empty">
                  Nema rezultata za ovu pretragu.
                </p>
              )}
            </div>

            <div className="homeAdminModal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setIsRecommendedModalOpen(false)}
              >
                Otkaži
              </button>
              <button
                type="button"
                className="btn btn--dark"
                onClick={saveRecommendedSelection}
                disabled={isSavingRecommended}
              >
                {isSavingRecommended ? 'Čuvanje...' : 'Sačuvaj izbor'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}


