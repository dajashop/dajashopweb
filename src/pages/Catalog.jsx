import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Catalog.css';
import { useNavigationType, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { CatalogParamsContext } from '../context/CatalogParams.jsx';
import { catalogUrl, decodeCatalogParams, filterUrlEntries, urlSlug, brandDisplayName } from '../utils/catalogUrls.js';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft, X } from 'lucide-react';

// Komponente
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
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
import { configuredFilterParams, configuredFilterChips } from '../utils/filterConfiguration.js';
import { diameterValue, isDiameterSpec } from '../utils/catalogFilters.js';
import { formatProductSpecLabel } from '../utils/catalogPresentation.js';

import { useConsent } from '../context/ConsentContext.jsx';
import { readSessionValue, writeSessionValue } from '../services/consentStorage.js';

const PER_PAGE = 32;

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

export default function Catalog({ department = 'satovi', fixedGender, seo }) {
  const baseSeo = seo || departmentSEO[department] || departmentSEO.satovi;
  const siteRoot = seoConfig.siteUrl.replace(/\/$/, '');

  const [rawParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { configuration: savedFilterConfiguration, loading: filterConfigurationLoading, error: filterConfigurationError } = useFilterConfiguration(department);
  const sp = useMemo(() => decodeCatalogParams(rawParams, savedFilterConfiguration, location.pathname), [rawParams, savedFilterConfiguration, location.pathname]);
  const setSp = (value, options) => {
    const next = new URLSearchParams(typeof value === 'function' ? value(new URLSearchParams(sp)) : value);
    navigate(catalogUrl(next, filterConfiguration, location.pathname), options);
  };
  const brandEntry = filterUrlEntries(savedFilterConfiguration).find(entry => entry.node.sources.includes('brand'));
  const selectedBrands = brandEntry?.options.filter(entry => sp.getAll(`cf_${brandEntry.node.id}`).includes(entry.option.id)) || [];
  const routeBrand = location.pathname.startsWith('/brend/') ? decodeURIComponent(location.pathname.split('/')[2]) : '';
  const brandName = selectedBrands.length === 1 ? brandDisplayName(selectedBrands[0].option.label)
    : !savedFilterConfiguration && routeBrand ? brandDisplayName(routeBrand === 'q-q' ? 'Q&Q' : routeBrand.replace(/-/g, ' ')) : '';
  const brandPath = brandName && department === 'satovi' && !fixedGender ? `/brend/${selectedBrands[0]?.slug || routeBrand}` : '';
  const activeSeo = brandPath ? { ...baseSeo, path: brandPath, title: `${brandName} satovi`, description: brandDescription(brandName) } : baseSeo;
  const spKey = sp.toString();
  const hasFilteredCatalogUrl = [...sp.keys()].some(key => !['page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', ...(brandPath ? [`cf_${brandEntry?.node.id}`, 'brand'] : [])].includes(key));
  const navType = useNavigationType();
  const filterIdentityParams = new URLSearchParams(sp);
  filterIdentityParams.delete('page');
  const filterIdentity = `${department}:${filterIdentityParams}`;
  const previousFilters = useRef(filterIdentity);
  useEffect(() => {
    if (previousFilters.current === filterIdentity) return;
    previousFilters.current = filterIdentity;
    if (sp.has('page')) {
      const next = new URLSearchParams(sp);
      next.delete('page');
      setSp(next, { replace: true });
    }
  }, [filterIdentity, sp, setSp]);

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
    () => `catalog-scroll:${department}:${spKey}`,
    [department, spKey],
  );
  const savedScrollRef = useRef(null);

  const { preferencesAllowed } = useConsent();
  const filterConfiguration = savedFilterConfiguration;
  const configuredParams = useMemo(() => filterConfiguration ? configuredFilterParams(sp, filterConfiguration, fixedGender) : sp, [sp, filterConfiguration, fixedGender]);
  const requestKey = catalogPageRequest(department, configuredParams, fixedGender);
  const listing = usePublicListing(requestKey, 'catalogPage', !filterConfigurationLoading && !filterConfigurationError);
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
      if (fixedGender) chips.unshift({ key: 'gender', val: fixedGender, label: fixedGender });
      return chips;
    }
    const active = [];
    const brands = sp.getAll('brand');
    const genders = fixedGender ? [fixedGender] : sp.getAll('gender');
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
  }, [fixedGender, sp, configuredParams, filterConfiguration, filterConfigurationLoading, filterConfigurationError]);

  const mechanismEntry = filterUrlEntries(filterConfiguration).find(entry => entry.key === 'mehanizam');
  const chosenMechanism = mechanismEntry?.options.filter(entry => configuredParams.getAll(`cf_${mechanismEntry.node.id}`).includes(entry.option.id)) || [];
  const nonBrandChips = activeFilters.filter(chip => chip.key !== `cf_${brandEntry?.node.id}`);
  const automaticOnly = brandName && nonBrandChips.length === 1 && chosenMechanism.length === 1 && urlSlug(chosenMechanism[0].option.label) === 'automatski';
  const catalogTitle = brandName ? `${brandName}${fixedGender ? ` ${fixedGender.toLowerCase()}` : ''}${automaticOnly ? ' automatski' : ''} satovi`
    : fixedGender && department === 'satovi' ? `${fixedGender} satovi` : TITLES[department] || activeSeo.title;
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
  const page = listing.data?.page || 1;
  const getPageUrl = (number) => {
    const next = new URLSearchParams(sp);
    if (number === 1) next.delete('page');
    else next.set('page', String(number));
    return catalogUrl(next, filterConfiguration, location.pathname);
  };

  // Vrati skrol i paginaciju kad se vracamo (Back/Forward), bez Lenis-a
  useEffect(() => {
    if (navType === 'POP') {
      const savedRaw = readSessionValue(scrollKey, 'preferences');
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          savedScrollRef.current = saved;

          requestAnimationFrame(() => {
            window.scrollTo({
              top: saved?.y ?? 0,
              left: 0,
              behavior: 'auto',
            });
          });
          return;
        } catch (e) {
          console.warn('Ne mogu da parsiram sacuvanu poziciju', e);
        }
      }
    }

    // Novi filteri/odeljenje -> reset na vrh i prva strana
    savedScrollRef.current = null;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [spKey, department, navType, preferencesAllowed, scrollKey]);

  // Kada se data ucita, ponovi skrol (u slucaju da je layout naknadno narastao)
  useEffect(() => {
    if (navType !== 'POP') return;
    if (!savedScrollRef.current) return;
    if (loading) return;

    requestAnimationFrame(() => {
      window.scrollTo({
        top: savedScrollRef.current?.y ?? 0,
        left: 0,
        behavior: 'auto',
      });
    });
  }, [loading, navType]);

  // Cuvamo poziciju skrola i trenutnu stranicu pri izlasku sa kataloga
  useEffect(() => {
    return () => {
      const payload = JSON.stringify({ y: window.scrollY, page });
      writeSessionValue(scrollKey, payload, 'preferences');
    };
  }, [scrollKey, page, preferencesAllowed]);

  const start = (page - 1) * PER_PAGE;
  const itemsToShow = departmentItems;

  const renderContent = () => {
    if (loading || filterConfigurationLoading) {
      return (
        <div className="flex justify-center items-center h-64 text-muted">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={32} className="text-primary" />
          </motion.div>
          <span className="ml-3 text-lg font-medium">Učitavanje...</span>
        </div>
      );
    }

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
          <div className="catalog__pagination">
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
    <CatalogParamsContext.Provider value={[configuredParams, setSp]}><motion.div
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
        <FilterDrawer products={departmentItems} fixedGender={fixedGender} configuration={filterConfiguration} serverFacets={facets} configurationLoading={filterConfigurationLoading} configurationError={filterConfigurationError} />
      </div>

      <div className="catalog-layout lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">
        <aside className="sidebar-filters hidden lg:block sticky top-24">
          <Filters products={departmentItems} fixedGender={fixedGender} configuration={filterConfiguration} serverFacets={facets} configurationLoading={filterConfigurationLoading} configurationError={filterConfigurationError} />
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

                {activeFilters.map((f, idx) =>
                  f.key === 'gender' && f.val === fixedGender ? (
                    <span key={`${f.key}-${f.val}-${idx}`} className="catalog__pill catalog__pill--ghost">
                      {f.label}
                    </span>
                  ) : (
                    <button
                      key={`${f.key}-${f.val}-${idx}`}
                      onClick={() => removeFilter(f.key, f.val)}
                      className="catalog__pill"
                      title="Ukloni filter"
                    >
                      {f.label}
                      <X size={13} className="catalog__pill-x" />
                    </button>
                  ),
                )}

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
                Ukupno {totalCount} proizvoda
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
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </motion.div></CatalogParamsContext.Provider>
  );
}
