import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Catalog.css';
import { useNavigationType, useSearchParams } from 'react-router-dom';
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
import useProducts from '../hooks/useProducts.js';

// --- ADMIN IMPORTI (Potrebni da bismo znali da li da prikažemo skrivene satove) ---
import { useAuth } from '../hooks/useAuth';
import { isAdminEmail } from '../services/firebase';

const PER_PAGE = 32;

const TITLES = {
  satovi: 'Ručni Satovi',
  daljinski: 'Daljinski Upravljači',
  baterije: 'Baterije & Oprema',
  naocare: 'Sunčane Naočare',
};

const departmentSEO = {
  satovi: {
    title: 'Satovi - Katalog',
    description: 'Pregledajte našu kolekciju satova poznatih brendova.',
    keywords: 'satovi,rucni satovi,Casio,Orient,Daniel Klein',
    path: '/catalog',
  },
  daljinski: {
    title: 'Daljinski upravljači - Katalog',
    description: 'Daljinski upravljači za televizore i uređaje.',
    keywords: 'daljinski upravljaci,remote,upravljaci',
    path: '/daljinski',
  },
  baterije: {
    title: 'Baterije - Katalog',
    description: 'Baterije za satove i elektroniku.',
    keywords: 'baterije,dugmaste baterije,baterije za sat',
    path: '/baterije',
  },
  naocare: {
    title: 'Naočare - Katalog',
    description: 'Naočare za sunce i dioptrijske naočare.',
    keywords: 'naocare,suncane naocare,dioptrijske naocare',
    path: '/naocare',
  },
};

export default function Catalog({ department = 'satovi' }) {
  const activeSeo = departmentSEO[department] || departmentSEO.satovi;
  const siteRoot = seoConfig.siteUrl.replace(/\/$/, '');

  const [sp, setSp] = useSearchParams();
  const spKey = sp.toString();
  const navType = useNavigationType();

  // Kluc za cuvanje pozicije skrola po odeljenju + aktivnim filterima
  const scrollKey = useMemo(
    () => `catalog-scroll:${department}:${spKey}`,
    [department, spKey],
  );
  const savedScrollRef = useRef(null);

  // --- PROVERA ADMINA ---
  const { user } = useAuth();
  const isAdmin = user && isAdminEmail(user.email);

  // --- FETCH DATA ---
  const {
    items: allItems,
    loading,
    err,
  } = useProducts({
    order: sp.get('sort') || 'name',
  });

  // --- FILTRIRANJE ---
  const activeFilters = useMemo(() => {
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

    Array.from(sp.keys()).forEach((k) => {
      if (k.startsWith('spec_')) {
        const labelKey = k.replace('spec_', '');
        sp.getAll(k).forEach((v) => {
          active.push({ key: k, val: v, label: `${labelKey}: ${v}` });
        });
      }
    });

    return active;
  }, [sp]);

  const removeFilter = (key, val) => {
    const next = new URLSearchParams(sp);
    if (key === 'price') {
      next.delete('min');
      next.delete('max');
    } else if (key === 'q') {
      next.delete('q');
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

  // --- GLAVNA LOGIKA: Odeljenje + Vidljivost ---
  const departmentItems = useMemo(() => {
    if (!allItems) return [];

    return allItems.filter((p) => {
      // 1. Provera odeljenja
      const productDept = p.department || 'satovi';
      if (productDept !== department) return false;

      // 2. LOGIKA VIDLJIVOSTI:
      // Ako je proizvod sakriven (isVisible === false)...
      if (p.isVisible === false) {
        // ...prikazujemo ga SAMO ako je korisnik ADMIN.
        // Ako nije admin, sakrivamo ga (return false).
        if (!isAdmin) return false;
      }

      return true;
    });
  }, [allItems, department, isAdmin]); // Dodat isAdmin u zavisnosti

  // Glavna logika filtriranja (Pretraga, Brendovi...)
  const filteredData = useMemo(() => {
    let out = [...departmentItems];

    const q = sp.get('q')?.toLowerCase() || '';
    const brands = sp.getAll('brand');
    const genders = sp.getAll('gender');
    const categories = sp.getAll('category');
    const min = sp.get('min') ? Number(sp.get('min')) : null;
    const max = sp.get('max') ? Number(sp.get('max')) : null;

    if (q)
      out = out.filter((p) =>
        (p.brand + ' ' + p.name).toLowerCase().includes(q),
      );
    if (brands.length) out = out.filter((p) => brands.includes(p.brand));

    if (genders.length) {
      out = out.filter((p) => {
        if (genders.includes(p.gender)) return true;
        if (!p.gender || p.gender === 'Unisex') return true;
        return false;
      });
    }

    if (categories.length)
      out = out.filter((p) => categories.includes(p.category));
    if (min !== null) out = out.filter((p) => p.price >= min);
    if (max !== null) out = out.filter((p) => p.price <= max);

    const specParams = Array.from(sp.keys()).filter((k) =>
      k.startsWith('spec_'),
    );
    specParams.forEach((paramKey) => {
      const specName = paramKey.replace('spec_', '');
      const selectedValues = sp.getAll(paramKey);
      if (selectedValues.length > 0) {
        out = out.filter(
          (p) =>
            p.specs &&
            p.specs[specName] &&
            selectedValues.includes(p.specs[specName]),
        );
      }
    });

    return out;
  }, [departmentItems, sp]);

  const [page, setPage] = useState(1);
  const totalCount = filteredData.length;

  // Vrati skrol i paginaciju kad se vracamo (Back/Forward), bez Lenis-a
  useEffect(() => {
    if (navType === 'POP') {
      const savedRaw = sessionStorage.getItem(scrollKey);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          savedScrollRef.current = saved;
          if (saved?.page) setPage(saved.page);

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
    setPage(1);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [spKey, department, navType, scrollKey]);

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
      sessionStorage.setItem(scrollKey, payload);
    };
  }, [scrollKey, page]);

  const start = (page - 1) * PER_PAGE;
  const itemsToShow = filteredData.slice(start, start + PER_PAGE);

  const renderContent = () => {
    if (loading) {
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

    if (err) {
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
            Nema rezultata za izabrane filtere.
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
        <ProductGrid items={itemsToShow} />
        <div className="mt-8">
          <Pagination
            page={page}
            total={totalCount}
            perPage={PER_PAGE}
            onChange={setPage}
          />
        </div>
      </>
    );
  };

  return (
    <motion.div
      className="catalog-page w-full max-w-[95%] mx-auto px-4 sm:px-6 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SEOHead
        title={activeSeo.title}
        description={activeSeo.description}
        keywords={activeSeo.keywords}
        url={`${siteRoot}${activeSeo.path}`}
      />
      <BreadcrumbJsonLd
        items={[
          {
            name: TITLES[department] || department,
            url: `${siteRoot}${activeSeo.path}`,
          },
        ]}
      />

      <div className="catalog-mobile-trigger lg:hidden mb-4">
        <FilterDrawer products={departmentItems} />
      </div>

      <div className="catalog-layout lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">
        <aside className="sidebar-filters hidden lg:block sticky top-24">
          <Filters products={departmentItems} />
        </aside>

        <main className="catalog-main min-w-0">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
              <Breadcrumbs
                trail={[
                  { label: 'Početna', href: '/' },
                  {
                    label: TITLES[department] || department,
                    href:
                      department === 'satovi' ? '/catalog' : `/${department}`,
                  },
                ]}
              />
            </div>

            <div className="catalog__toprow mt-4 pb-4 border-b border-(--color-border) relative min-h-[40px]">
              <div className="flex flex-wrap items-center gap-2 pr-[110px]">
                <h1 className="text-2xl font-bold text-text mr-2 whitespace-nowrap">
                  Rezultat za:
                </h1>

                {activeFilters.length === 0 && (
                  <span className="text-muted text-sm font-medium">
                    Svi proizvodi
                  </span>
                )}

                {activeFilters.map((f, idx) => (
                  <button
                    key={`${f.key}-${f.val}-${idx}`}
                    onClick={() => removeFilter(f.key, f.val)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-white text-xs font-bold uppercase tracking-wide hover:bg-neutral-700 transition-colors shadow-sm"
                    title="Ukloni filter"
                  >
                    {f.label}
                    <X size={13} className="text-white/70" />
                  </button>
                ))}

                {activeFilters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-xs font-bold uppercase tracking-wide hover:bg-red-100 transition-colors"
                  >
                    Obriši sve
                  </button>
                )}
              </div>

              <div className="absolute right-0 top-1 catalog__count text-sm font-semibold text-muted bg-surface px-3 py-1 rounded-full border border-(--color-border) whitespace-nowrap">
                {totalCount} kom.
              </div>
            </div>
          </div>

          <motion.div
            key={department + sp.toString()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </motion.div>
  );
}
