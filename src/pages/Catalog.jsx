import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import './Catalog.css';
import { useNavigationType, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { CatalogPreparationContext } from '../context/CatalogPreparation.jsx';
import { backgroundCatalogAllowed, prepareCatalogRoutes } from '../services/catalogPreparation.js';
import { CatalogParamsContext } from '../context/CatalogParams.jsx';
import { catalogUrl, decodeCatalogParams, filterUrlEntries, urlSlug, brandDisplayName } from '../utils/catalogUrls.js';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft, X } from 'lucide-react';

// Komponente
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { CatalogSkeleton } from '../components/LoadingSkeletons.jsx';
import Filters from '../components/Filters.jsx';
import Pagination from '../components/Pagination.jsx';
import FilterDrawer from '../components/FilterDrawer.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import { seoConfig } from '../config/seo.js';

// Hookovi
import usePublicListing from '../hooks/usePublicListing.js';
import { catalogPageRequest } from '../utils/catalogPageRequest.js';
import useFilterConfiguration from '../hooks/useFilterConfiguration.js';
import { configuredFilterParams, configuredFilterChips, filterLeaves, selectionKey } from '../utils/filterConfiguration.js';
import { diameterValue, isDiameterSpec } from '../utils/catalogFilters.js';
import { formatProductSpecLabel } from '../utils/catalogPresentation.js';
import { useAuth } from '../hooks/useAuth.js';
import { isAdminEmail } from '../services/dajaPlatform.js';

import { readSessionValue, writeSessionValue } from '../services/consentStorage.js';

const PER_PAGE = 32;
const scrollPositions = new Map();
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popularnost' },
  { value: 'newest', label: 'Najnovije' },
  { value: 'price-desc', label: 'Cena ↓' },
  { value: 'price-asc', label: 'Cena ↑' },
  { value: 'name', label: 'Naziv A-Z' },
];

const TITLES = {
  satovi: 'Ručni satovi',
  daljinski: 'Daljinski upravljači',
  baterije: 'Baterije i oprema',
  naocare: 'Naočare za sunce',
};

const departmentSEO = {
  satovi: {
    title: 'Satovi - Katalog',
    description: 'Ručni satovi brendova Casio, Orient, Daniel Klein i Q&Q. Uporedite modele po mehanizmu, dimenzijama, staklu i ceni i pronađite sat za svoj stil.',
    keywords: 'satovi,rucni satovi,Casio,Orient,Daniel Klein',
    path: '/catalog',
  },
  daljinski: {
    title: 'Daljinski upravljači - Katalog',
    description: 'Pregledajte daljinske upravljače i pronađite odgovarajući model za svoj uređaj. Pre izbora proverite oznaku uređaja i kompatibilnost u opisu proizvoda.',
    keywords: 'daljinski upravljaci,remote,upravljaci',
    path: '/daljinski',
  },
  baterije: {
    title: 'Baterije - Katalog',
    description: 'Baterije za satove i druge uređaje. Uporedite oznaku, dimenzije i napon sa postojećom baterijom kako biste izabrali odgovarajući model.',
    keywords: 'baterije,dugmaste baterije,baterije za sat',
    path: '/baterije',
  },
  naocare: {
    title: 'Naočare za sunce - Katalog',
    description: 'Otkrijte naočare za sunce u DajaShop prodavnici. Uporedite oblike, boje, dimenzije i potvrđene karakteristike sočiva i pronađite model koji vam odgovara.',
    keywords: 'naocare za sunce,DajaShop,naocare za sunce Nis',
    path: '/naocare',
  },
};

const brandDescriptions = {
  casio: 'Pregledajte Casio satove i uporedite prikaz vremena, funkcije i dimenzije kućišta. Detalji svakog modela pomažu vam da izaberete sat prema svojim navikama i budžetu.',
  orient: 'Istražite Orient satove i uporedite mehanizme, vrstu stakla i izgled brojčanika. Otvorite model koji vas zanima da pogledate fotografije i njegove specifikacije.',
  'daniel klein': 'Pronađite Daniel Klein sat prema svom stilu. Uporedite boje brojčanika, izgled narukvice ili kaiša, dimenzije i cenu dostupnih modela.',
  'q&q': 'Pregledajte Q&Q satove i uporedite veličinu kućišta, prikaz vremena i funkcije. Izaberite model koji vam odgovara za svakodnevno nošenje.',
};

function brandDescription(name) {
  return brandDescriptions[name.toLowerCase()] || `Pregledajte ${name} satove u DajaShop prodavnici. Uporedite mehanizam, dimenzije, vrstu stakla i cenu u detaljima svakog modela.`;
}

export default function Catalog({ department = 'satovi', seo }) {
  const { user, staffReady } = useAuth();
  const includeHiddenForAdmin = Boolean(staffReady && isAdminEmail(user?.email));
  const baseSeo = seo || departmentSEO[department] || departmentSEO.satovi;
  const siteRoot = seoConfig.siteUrl.replace(/\/$/, '');

  const [rawParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bootstrapListing = !includeHiddenForAdmin && ['/catalog', '/naocare', '/baterije', '/daljinski'].includes(location.pathname)
    && [...rawParams.keys()].every(key => ['page', 'sort', 'q', 'gclid', 'fbclid'].includes(key) || key.startsWith('utm_'));
  const { configuration: savedFilterConfiguration, loading: filterConfigurationLoading, error: filterConfigurationError } = useFilterConfiguration(department, bootstrapListing);
  const sp = useMemo(() => decodeCatalogParams(rawParams, savedFilterConfiguration, location.pathname), [rawParams, savedFilterConfiguration, location.pathname]);
  const setSp = (value, options) => {
    const next = new URLSearchParams(typeof value === 'function' ? value(new URLSearchParams(sp)) : value);
    const identity = params => {
      const filters = new URLSearchParams(params);
      filters.delete('page'); filters.sort();
      return filters.toString();
    };
    // Reset pagination only for an explicit filter action, never for Back or
    // the arrival of configuration that decodes an existing page URL.
    if (identity(next) !== identity(sp)) next.delete('page');
    navigate(catalogUrl(next, filterConfiguration, location.pathname), options);
  };
  const brandEntry = filterUrlEntries(savedFilterConfiguration).find(entry => entry.node.sources.includes('brand'));
  const genderEntry = filterUrlEntries(savedFilterConfiguration).find(entry => entry.node.sources.includes('gender'));
  const genderOptions = genderEntry?.options.filter(entry => sp.getAll(`cf_${genderEntry.node.id}`).includes(entry.option.id)) || [];
  const genders = savedFilterConfiguration ? genderOptions.map(entry => entry.option.label) : sp.getAll('gender');
  const selectedGender = genders.length === 1 ? genders[0] : '';
  const isGenderPage = ['/muski-satovi', '/zenski-satovi'].includes(location.pathname);
  const selectedBrands = brandEntry?.options.filter(entry => sp.getAll(`cf_${brandEntry.node.id}`).includes(entry.option.id)) || [];
  const routeBrand = location.pathname.startsWith('/brend/') ? decodeURIComponent(location.pathname.split('/')[2]) : '';
  const brandName = selectedBrands.length === 1 ? brandDisplayName(selectedBrands[0].option.label)
    : !savedFilterConfiguration && routeBrand ? brandDisplayName(routeBrand === 'q-q' ? 'Q&Q' : routeBrand.replace(/-/g, ' ')) : '';
  const brandPath = brandName && department === 'satovi' ? `/brend/${selectedBrands[0]?.slug || routeBrand}` : '';
  const activeSeo = brandPath ? { ...baseSeo, path: brandPath, title: `${brandName} satovi`, description: brandDescription(brandName) } : baseSeo;
  const hasFilteredCatalogUrl = [...sp.keys()].some(key => !['page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', ...(brandPath ? [`cf_${brandEntry?.node.id}`, 'brand'] : []), ...(isGenderPage ? [`cf_${genderEntry?.node.id}`, 'gender'] : [])].includes(key));
  const navType = useNavigationType();
  const sortParam = sp.get('sort') || 'popular';

  const handleSortChange = (val) => {
    const next = new URLSearchParams(sp);
    if (val) next.set('sort', val);
    else next.delete('sort');
    next.delete('page');
    setSp(next, { replace: true });
  };

  // Kluc za cuvanje pozicije skrola po odeljenju + aktivnim filterima
  const scrollKey = useMemo(
    () => `catalog-scroll:${location.key}:${location.pathname}${location.search}`,
    [location.key, location.pathname, location.search],
  );
  const savedScrollRef = useRef(null);

  const filterConfiguration = savedFilterConfiguration;
  const configuredParams = useMemo(() => filterConfiguration ? configuredFilterParams(sp, filterConfiguration) : sp, [sp, filterConfiguration]);
  const requestKey = catalogPageRequest(department, configuredParams);
  const listing = usePublicListing(requestKey, 'catalogPage', (bootstrapListing || !filterConfigurationLoading) && !filterConfigurationError, includeHiddenForAdmin);
  const prepareFilter = useCallback(async (node, params, signal) => {
    if (!filterConfiguration || !backgroundCatalogAllowed()) return;
    const routes = [];
    for (const leaf of filterLeaves({ filters: [node] })) {
      if (!leaf.visible || leaf.style === 'range') continue;
      const available = listing.data?.facets?.[leaf.id]?.values;
      for (const option of leaf.options) {
        if (!option.visible || (available && !available.some(value => value.value === option.id))) continue;
        const next = new URLSearchParams(params);
        const key = selectionKey(leaf);
        const ids = new Set(next.getAll(key));
        if (ids.has(option.id)) ids.delete(option.id); else ids.add(option.id);
        next.delete(key); ids.forEach(id => next.append(key, id));
        next.delete('page');
        routes.push(catalogPageRequest(department, configuredFilterParams(next, filterConfiguration)));
      }
    }
    await prepareCatalogRoutes(routes, includeHiddenForAdmin, signal);
  }, [department, filterConfiguration, includeHiddenForAdmin, listing.data?.facets]);
  const loading = listing.loading;
  const err = listing.error;
  const departmentItems = listing.data?.items || [];
  const facets = listing.data?.facets;
  useEffect(() => {
    if (filterConfigurationLoading || filterConfigurationError) return;
    const readable = catalogUrl(configuredParams, filterConfiguration, location.pathname);
    if (readable !== `${location.pathname}${location.search}`) navigate(readable, { replace: true });
  }, [configuredParams, filterConfiguration, filterConfigurationLoading, filterConfigurationError, location.pathname, location.search, navigate]);

  // --- FILTRIRANJE ---
  const activeFilters = useMemo(() => {
    if (filterConfigurationLoading || filterConfigurationError) return [];
    if (filterConfiguration) {
      const chips = configuredFilterChips(configuredParams, filterConfiguration);
      const q = configuredParams.get('q');
      if (q) chips.unshift({ key: 'q', val: q, label: `Traži: "${q}"` });
      return chips;
    }
    const active = [];
    const brands = sp.getAll('brand');
    const genders = sp.getAll('gender');
    const categories = sp.getAll('category');
    const min = sp.get('min');
    const max = sp.get('max');
    const q = sp.get('q');

    if (q) active.push({ key: 'q', val: q, label: `Traži: "${q}"` });
    brands.forEach((b) => active.push({ key: 'brand', val: b, label: b }));
    genders.forEach((g) => active.push({ key: 'gender', val: g, label: g }));
    categories.forEach((c) =>
      active.push({ key: 'category', val: c, label: c }),
    );

    if (min || max) {
      active.push({
        key: 'price',
        val: 'price',
        label: `${Number(min || 0).toLocaleString()} - ${Number(
          max || '∞',
        ).toLocaleString()} RSD`,
      });
    }

    [...new Set(sp.keys())].forEach((k) => {
      if (k.startsWith('spec_')) {
        const labelKey = k.replace('spec_', '');
        const values = [...new Set(sp.getAll(k))];
        const diameters = values.map(diameterValue);
        if (isDiameterSpec(labelKey) && diameters.length && diameters.every((value) => value !== null)) {
          const from = Math.min(...diameters).toLocaleString('sr-Latn');
          const to = Math.max(...diameters).toLocaleString('sr-Latn');
          active.push({ key: k, val: null, label: `Prečnik kućišta: ${from}–${to} mm` });
          return;
        }
        values.forEach((v) => {
          active.push({ key: k, val: v, label: `${formatProductSpecLabel(labelKey)}: ${v}` });
        });
      }
    });

    return active;
  }, [sp, configuredParams, filterConfiguration, filterConfigurationLoading, filterConfigurationError]);

  const mechanismEntry = filterUrlEntries(filterConfiguration).find(entry => entry.key === 'mehanizam');
  const chosenMechanism = mechanismEntry?.options.filter(entry => configuredParams.getAll(`cf_${mechanismEntry.node.id}`).includes(entry.option.id)) || [];
  const nonBrandChips = activeFilters.filter(chip => chip.key !== `cf_${brandEntry?.node.id}`);
  const automaticOnly = brandName && nonBrandChips.length === 1 && chosenMechanism.length === 1 && urlSlug(chosenMechanism[0].option.label) === 'automatski';
  const catalogTitle = brandName ? `${brandName}${selectedGender ? ` ${selectedGender.toLowerCase()}` : ''}${automaticOnly ? ' automatski' : ''} satovi`
    : selectedGender && department === 'satovi' ? `${selectedGender} satovi` : TITLES[department] || activeSeo.title;
  const catalogDescription = automaticOnly
    ? `Pregledajte automatske ${brandName} satove. Uporedite dimenzije kućišta, vrstu stakla, funkcije i cenu u detaljima svakog modela.`
    : brandName ? brandDescription(brandName) : activeSeo.description;

  const removeFilter = (key, val) => {
    const next = new URLSearchParams(configuredParams);
    if (key.startsWith('range:')) {
      next.delete(`cf_min_${key.slice(6)}`);
      next.delete(`cf_max_${key.slice(6)}`);
    } else if (key === 'price') {
      next.delete('min');
      next.delete('max');
    } else if (key === 'q') {
      next.delete('q');
    } else if (val === null) {
      next.delete(key);
    } else {
      const values = next.getAll(key).filter((v) => v !== val);
      next.delete(key);
      values.forEach((v) => next.append(key, v));
    }
    setSp(next, { replace: true });
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (sp.get('sort')) next.set('sort', sp.get('sort'));
    setSp(next, { replace: true });
  };

  const totalCount = listing.data?.total || 0;
  const hiddenCount = includeHiddenForAdmin ? listing.data?.hiddenCount || 0 : null;
  const page = listing.data?.page || 1;
  const getPageUrl = (number) => {
    const next = new URLSearchParams(sp);
    if (number === 1) next.delete('page');
    else next.set('page', String(number));
    return catalogUrl(next, filterConfiguration, location.pathname);
  };

  // Track each history entry before product-page effects reset the scroll.
  useBrowserLayoutEffect(() => {
    const stored = scrollPositions.get(scrollKey);
    const persisted = !stored && readSessionValue(scrollKey, 'preferences');
    let saved = stored;
    if (persisted) { try { saved = JSON.parse(persisted); } catch { /* Ignore unavailable storage. */ } }
    savedScrollRef.current = navType === 'POP' ? saved : null;
    window.scrollTo({ top: savedScrollRef.current?.y || 0, behavior: 'instant' });
    const capture = () => {
      const position = { y: window.scrollY };
      scrollPositions.delete(scrollKey);
      scrollPositions.set(scrollKey, position);
      while (scrollPositions.size > 60) scrollPositions.delete(scrollPositions.keys().next().value);
    };
    window.addEventListener('scroll', capture, { passive: true });
    const persist = () => {
      const position = scrollPositions.get(scrollKey);
      if (position) writeSessionValue(scrollKey, JSON.stringify(position), 'preferences');
    };
    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('scroll', capture);
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [scrollKey, navType]);
  useBrowserLayoutEffect(() => {
    if (loading || filterConfigurationLoading || !savedScrollRef.current) return;
    const saved = savedScrollRef.current;
    savedScrollRef.current = null;
    window.scrollTo({ top: saved.y, behavior: 'instant' });
  }, [loading, filterConfigurationLoading, scrollKey]);

  const itemsToShow = departmentItems;

  const renderContent = () => {
    if (!err && (loading || filterConfigurationLoading)) return <CatalogSkeleton square={department === 'naocare'} />;

    if (err && !listing.data) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-6 text-red-500">
          <AlertTriangle size={32} />
          <p className="mt-3 font-bold">Greška pri učitavanju</p>
        </div>
      );
    }

    if (totalCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-8 rounded-2xl border border-(--color-border) bg-surface text-center">
          <p className="text-xl font-semibold text-text">
            {brandName && !hasFilteredCatalogUrl
              ? `Trenutno nema dostupnih ${brandName} satova.`
              : 'Nema rezultata za izabrane filtere.'}
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-onPrimary font-bold shadow-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={18} /> Resetuj filtere
          </button>
        </div>
      );
    }

    return (
      <>
        {err && <p role="status">Nova stranica trenutno nije dostupna. <button type="button" onClick={listing.retry}>Pokušaj ponovo</button></p>}
        <ProductGrid items={itemsToShow} />
        <div className="catalog__footer">
          <div className="catalog__pagination" inert={listing.displayingPrevious || undefined}>
            <Pagination
              page={page}
              total={totalCount}
              perPage={PER_PAGE}
              getPageUrl={getPageUrl}
            />
          </div>
          <p className="catalog__page-count">
            Prikazano {itemsToShow.length} od ukupno {totalCount} proizvoda
          </p>
        </div>
      </>
    );
  };

  return (
    <CatalogPreparationContext.Provider value={prepareFilter}><CatalogParamsContext.Provider value={[configuredParams, setSp]}><motion.div
      className="catalog-page w-full max-w-[95%] mx-auto px-4 sm:px-6 py-6"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SEOHead
        title={`${brandName ? catalogTitle : activeSeo.title}${page > 1 ? ` — strana ${page}` : ''}`}
        description={catalogDescription}
        keywords={activeSeo.keywords}
        url={`${siteRoot}${activeSeo.path}${page > 1 ? `?page=${page}` : ''}`}
        noIndex={hasFilteredCatalogUrl}
      />
      <BreadcrumbJsonLd
        items={[
          {
            name: brandName ? `${brandName} satovi` : TITLES[department] || department,
            url: `${siteRoot}${activeSeo.path}`,
          },
        ]}
      />

      <div className="catalog-mobile-trigger lg:hidden mb-4">
        <FilterDrawer products={departmentItems} configuration={filterConfiguration} serverFacets={facets} configurationLoading={filterConfigurationLoading} configurationError={filterConfigurationError} />
      </div>

      <div className="catalog-layout lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">
        <aside className="sidebar-filters hidden lg:block sticky top-24">
          <Filters products={departmentItems} configuration={filterConfiguration} serverFacets={facets} configurationLoading={filterConfigurationLoading} configurationError={filterConfigurationError} />
        </aside>

        <main className="catalog-main min-w-0">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <Breadcrumbs
                trail={[
                  {
                    label: brandName ? `${brandName} satovi` : TITLES[department] || department,
                    href: activeSeo.path,
                  },
                ]}
              />
            </div>

            <div className="catalog__toprow mt-4 pb-4 border-b border-(--color-border) relative min-h-[40px]">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <h1 className="catalog__title text-2xl font-bold text-text mr-2 whitespace-nowrap">{catalogTitle}</h1>

                {activeFilters.length === 0 && (
                  <span className="catalog__pill catalog__pill--ghost">
                    Svi proizvodi
                  </span>
                )}

                {activeFilters.map((f, idx) => (
                  <button
                    key={`${f.key}-${f.val}-${idx}`}
                    onClick={() => removeFilter(f.key, f.val)}
                    className="catalog__pill"
                    title="Ukloni filter"
                  >
                    {f.label}
                    <X size={13} className="catalog__pill-x" />
                  </button>
                ))}

                {activeFilters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="catalog__pill catalog__pill--danger"
                  >
                    Obriši sve
                  </button>
                )}
              </div>

            </div>

            <p className="catalog__description">{catalogDescription}</p>

            <div className="catalog__subrow">
              <div className="catalog__showing">
                {listing.displayingPrevious ? (err ? 'Novi rezultati trenutno nisu dostupni' : 'Učitavanje novih rezultata…') : listing.data ? `Ukupno ${totalCount} proizvoda` : 'Učitavanje proizvoda…'}
                {listing.updating && <span className="ml-2 inline-flex items-center gap-1 text-neutral-500" role="status"><Loader2 size={14} className="animate-spin" /> Osvežavanje…</span>}
                {includeHiddenForAdmin && listing.data && (
                  <span className="ml-2 text-neutral-500">
                    · Sakriveno {hiddenCount}
                  </span>
                )}
              </div>
              <div className="catalog__sort-block">
                <span className="catalog__sort-label">Sortiraj</span>
                <div className="catalog__sort relative">
                  <select
                    value={sortParam}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="catalog__sort-select text-sm font-semibold text-text bg-white border border-(--color-border) rounded-full pl-3 pr-9 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.05)] hover:-translate-y-[1px] transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label="Sortiraj"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="catalog__sort-chevron" aria-hidden="true">▾</span>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            data-catalog-listing
            data-listing-key={includeHiddenForAdmin ? `admin:${requestKey}` : requestKey}
            aria-busy={listing.updating || loading}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </motion.div></CatalogParamsContext.Provider></CatalogPreparationContext.Provider>
  );
}
