import React, { useEffect, useMemo, useState } from 'react';
import './Filters.css';
import { useSearchParams } from 'react-router-dom';
import catalog from '../services/CatalogService.js';
import { motion, AnimatePresence } from 'framer-motion';
import { catalogSpecValue, diameterValue, filterCatalogProducts, isDiameterSpec, normalizedCatalogGender } from '../utils/catalogFilters.js';
import { formatProductSpecLabel } from '../utils/catalogPresentation.js';
import DiameterFilter from './DiameterFilter.jsx';
import ColorFilter, { isColorSpec } from './ColorFilter.jsx';
import MaterialFilter, { isBraceletMaterialSpec } from './MaterialFilter.jsx';
import ConfiguredFilters from './ConfiguredFilters.jsx';
import SectionHeader from './FilterSectionHeader.jsx';
import useFilterAnchor from '../hooks/useFilterAnchor.js';

function specificationOrder(key) {
  const label = formatProductSpecLabel(key)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[-\s]+/g, ' ').trim();
  if (/^(stil|style|dizajn)$/.test(label)) return 0;
  if (/^(serija|series)$/.test(label)) return 1;
  if (isDiameterSpec(key)) return 2;
  if (/^(tip mehanizma|mehanizam|movement( type)?)$/.test(label)) return 3;
  if (/^(staklo|tip stakla|glass|crystal( type)?)$/.test(label)) return 4;
  if (/(boja|boje|color|colour|materijal|material)/.test(label)) return 5;
  return 6;
}

function countBy(products, getValue) {
  const counts = new Map();
  products.forEach((product) => {
    const value = getValue(product);
    if (value !== null && value !== undefined && value !== '') {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  });
  return counts;
}

function FilterCount({ count }) {
  return <span className="filter-count" aria-label={`${count} artikala`}>{count}</span>;
}

export default function Filters(props) {
  if (props.configurationLoading || props.configurationError) return <aside className="filters card glass"><p>{props.configurationError ? 'Filteri trenutno nisu dostupni. Osveži stranicu.' : 'Učitavanje filtera…'}</p></aside>;
  return props.configuration ? <ConfiguredFilters {...props} /> : <LegacyFilters {...props} />;
}

function LegacyFilters({ products, fixedGender, onClose }) {
  // <--- Dodat onClose prop
  const [sp, setSp] = useSearchParams();
  const filterAnchor = useFilterAnchor(sp.toString());

  const baseData = useMemo(() => {
    if (Array.isArray(products)) return products;
    return catalog.list();
  }, [products]);

  const brands = useMemo(() => {
    const b = baseData.map((p) => p.brand).filter(Boolean);
    return [...new Set(b)].sort();
  }, [baseData]);

  const brandCounts = useMemo(() =>
    countBy(filterCatalogProducts(baseData, sp, { fixedGender, ignoreKey: 'brand' }), (p) => p.brand),
  [baseData, sp, fixedGender]);

  const genderCounts = useMemo(() => {
    const candidates = filterCatalogProducts(baseData, sp, { ignoreKey: 'gender' });
    return new Map(['Muški', 'Ženski'].map((gender) => [
      gender,
      candidates.filter((product) => {
        const productGender = normalizedCatalogGender(product.gender);
        return productGender === 'UNISEX' || productGender === normalizedCatalogGender(gender);
      }).length,
    ]));
  }, [baseData, sp]);

  const categories = useMemo(() => {
    const candidates = filterCatalogProducts(baseData, sp, { fixedGender, ignoreKey: 'category' });
    return [...new Set([...candidates.map((p) => p.category), ...sp.getAll('category')].filter(Boolean))].sort();
  }, [sp, baseData, fixedGender]);

  const categoryCounts = useMemo(() =>
    countBy(filterCatalogProducts(baseData, sp, { fixedGender, ignoreKey: 'category' }), (p) => p.category),
  [baseData, sp, fixedGender]);

  const specifications = useMemo(() => {
    const candidates = filterCatalogProducts(baseData, sp, { fixedGender, ignoreSpecs: true });
    const keys = new Set(candidates.flatMap((product) => Object.keys(product.specs || {})));
    [...sp.keys()].filter((key) => key.startsWith('spec_')).forEach((key) => keys.add(key.slice(5)));

    return [...keys]
      .map((key) => {
        const matching = filterCatalogProducts(baseData, sp, { fixedGender, ignoreKey: `spec_${key}` });
        const counts = countBy(matching, (product) => catalogSpecValue(product.specs?.[key]));
        const values = [...new Set([...counts.keys(), ...sp.getAll(`spec_${key}`)])]
          .sort()
          .map((value) => ({ value, count: counts.get(value) || 0 }));
        return {
          key,
          values,
          diameterValues: specificationOrder(key) === 2
            ? [...new Set(baseData.map((product) => catalogSpecValue(product.specs?.[key])).filter((value) => diameterValue(value) !== null))]
            : null,
        };
      })
      .filter((spec) => spec.values.length > 0)
      .sort((a, b) => specificationOrder(a.key) - specificationOrder(b.key)
        || a.key.localeCompare(b.key, 'sr-Latn'));
  }, [sp, baseData, fixedGender]);

  const specificationSections = useMemo(() => {
    const braceletSpecs = specifications.filter((spec) => {
      const label = formatProductSpecLabel(spec.key).toLowerCase();
      return /(narukvic|kais|kaiš|bracelet|strap|band)/.test(label)
        && (isColorSpec(spec.key) || /(materijal|material)/.test(label));
    });
    if (braceletSpecs.length < 2) return specifications.map((spec) => ({ key: spec.key, title: formatProductSpecLabel(spec.key), specs: [spec] }));
    let braceletAdded = false;
    return specifications.flatMap((spec) => {
      if (!braceletSpecs.includes(spec)) return [{ key: spec.key, title: formatProductSpecLabel(spec.key), specs: [spec] }];
      if (braceletAdded) return [];
      braceletAdded = true;
      return [{ key: 'bracelet_filters', title: 'Narukvica', specs: [...braceletSpecs].sort((a, b) => Number(isColorSpec(a.key)) - Number(isColorSpec(b.key))) }];
    });
  }, [specifications]);

  const maxPriceLimit = useMemo(() => {
    if (!baseData || baseData.length === 0) return 50000;
    return Math.max(...baseData.map((p) => p.price));
  }, [baseData]);

  const [min, setMin] = useState(sp.get('min') || '');
  const [max, setMax] = useState(sp.get('max') || '');

  const [openSections, setOpenSections] = useState({
    brand: true,
    gender: true,
    category: false,
    price: true,
  });

  const toggleSection = (sec) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  function setParams(mutator) {
    const next = new URLSearchParams(sp);
    mutator(next);
    filterAnchor.prepare();
    setSp(next, { replace: true });
  }

  function toggleParam(key, val) {
    setParams((p) => {
      const arr = p.getAll(key);
      const has = arr.includes(val);
      p.delete(key);
      (has ? arr.filter((x) => x !== val) : [...arr, val]).forEach((v) =>
        p.append(key, v)
      );
    });
  }

  function toggleCategory(val) {
    toggleParam('category', val);
  }

  function checked(key, val) {
    return sp.getAll(key).includes(val);
  }

  function countSelected(key) {
    return sp.getAll(key).length;
  }

  function clearKey(key) {
    setParams((p) => p.delete(key));
  }

  function clearAll() {
    setParams((p) => {
      ['brand', 'gender', 'category', 'min', 'max'].forEach((k) => p.delete(k));
      Array.from(p.keys()).forEach((k) => {
        if (k.startsWith('spec_')) p.delete(k);
      });
    });
    setMin('');
    setMax('');
  }

  function setRange() {
    setParams((p) => {
      if (min && Number(min) > 0) p.set('min', min);
      else p.delete('min');
      if (max && Number(max) < maxPriceLimit) p.set('max', max);
      else p.delete('max');
    });
  }

  useEffect(() => {
    setMin(sp.get('min') || '');
    setMax(sp.get('max') || '');
  }, [sp]);

  const handleSliderChange = (e, type) => {
    const val = Number(e.target.value);
    if (type === 'min') {
      const newMin = Math.min(val, (Number(max) || maxPriceLimit) - 100);
      setMin(newMin.toString());
    } else {
      const newMax = Math.max(val, (Number(min) || 0) + 100);
      setMax(newMax.toString());
    }
  };

  const handleSliderCommit = () => {
    setRange();
  };

  const getPercent = (value) => {
    if (maxPriceLimit === 0) return 0;
    return Math.round((value / maxPriceLimit) * 100);
  };

  let activeTotal =
    countSelected('brand') +
    countSelected('gender') +
    countSelected('category') +
    (sp.get('min') || sp.get('max') ? 1 : 0);

  [...new Set(sp.keys())].forEach((k) => {
    if (k.startsWith('spec_')) activeTotal += isDiameterSpec(k.slice(5)) ? 1 : new Set(sp.getAll(k)).size;
  });

  if (baseData.length === 0) {
    return (
      <aside className="filters card glass p-4 text-center text-muted text-sm">
        Nema filtera za ovu kolekciju.
      </aside>
    );
  }

  return (
    <aside
      ref={filterAnchor.container}
      {...filterAnchor.events}
      className="filters card glass"
      aria-label="Filteri kataloga"
      data-lenis-prevent
    >
      <div className="f-top">
        <h3 className="f-top-title">Filteri</h3>
        <div className="f-top-actions">
          {activeTotal > 0 && <span className="f-badge">{activeTotal}</span>}
          {activeTotal > 0 && (
            <button type="button" className="f-clear" onClick={clearAll}>
              Očisti sve
            </button>
          )}
        </div>
      </div>

      <div className="f-scroll-container">
        {!fixedGender && (
          <div className={`f-section ${openSections.gender ? 'is-open' : ''}`}>
            <SectionHeader
              title="Pol"
              count={countSelected('gender')}
              onClear={() => clearKey('gender')}
              isOpen={openSections.gender}
              onToggle={() => toggleSection('gender')}
            />
            <AnimatePresence initial={false}>
              {openSections.gender && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="f-content-wrapper"
                >
                  <div className="f-content-inner">
                    <div className="filter-list" role="group">
                      {['Muški', 'Ženski'].map((gender) => (
                        <label
                          key={gender}
                          className={`filter-row ${
                            checked('gender', gender) ? 'is-active' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked('gender', gender)}
                            onChange={() => toggleParam('gender', gender)}
                            className="filter-input-hidden"
                          />
                          <span className="filter-text">{gender}</span>
                          <FilterCount count={genderCounts.get(gender) || 0} />
                          {checked('gender', gender) && (
                            <div className="filter-check">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {brands.length > 0 && (
          <div className={`f-section ${openSections.brand ? 'is-open' : ''}`}>
            <SectionHeader
              title="Brend"
              count={countSelected('brand')}
              onClear={() => clearKey('brand')}
              isOpen={openSections.brand}
              onToggle={() => toggleSection('brand')}
            />
            <AnimatePresence initial={false}>
              {openSections.brand && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="f-content-wrapper"
                >
                  <div className="f-content-inner">
                    <div className="filter-list" role="group">
                      {brands.map((b) => (
                        <label
                          key={b}
                          className={`filter-row ${
                            checked('brand', b) ? 'is-active' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked('brand', b)}
                            onChange={() => toggleParam('brand', b)}
                            className="filter-input-hidden"
                          />
                          <span className="filter-text">{b}</span>
                          <FilterCount count={brandCounts.get(b) || 0} />
                          {checked('brand', b) && (
                            <div className="filter-check">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {categories.length > 0 && (
          <div
            className={`f-section ${openSections.category ? 'is-open' : ''}`}
          >
            <SectionHeader
              title="Kolekcija"
              count={countSelected('category')}
              onClear={() => clearKey('category')}
              isOpen={openSections.category}
              onToggle={() => toggleSection('category')}
            />
            <AnimatePresence initial={false}>
              {openSections.category && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="f-content-wrapper"
                >
                  <div className="f-content-inner">
                    <div className="filter-list" role="group">
                      {categories.map((c) => (
                        <label
                          key={c}
                          className={`filter-row ${
                            checked('category', c) ? 'is-active' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked('category', c)}
                            onChange={() => toggleCategory(c)}
                            className="filter-input-hidden"
                          />
                          <span className="filter-text">{c}</span>
                          <FilterCount count={categoryCounts.get(c) || 0} />
                          {checked('category', c) && (
                            <div className="filter-check">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {specificationSections.map((section) => (
          <div
            key={section.key}
            className={`f-section ${openSections[section.key] ? 'is-open' : ''}`}
          >
            <SectionHeader
              title={section.title}
              count={section.specs.reduce((total, spec) => total + (spec.diameterValues?.length ? Number(countSelected(`spec_${spec.key}`) > 0) : countSelected(`spec_${spec.key}`)), 0)}
              onClear={() => setParams((params) => section.specs.forEach((spec) => params.delete(`spec_${spec.key}`)))}
              isOpen={!!openSections[section.key]}
              onToggle={() => toggleSection(section.key)}
            />
            <AnimatePresence initial={false}>
              {openSections[section.key] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="f-content-wrapper"
                >
                  <div className="f-content-inner">
                    {section.specs.map((spec) => (
                    <div key={spec.key} className={section.specs.length > 1 ? 'filter-subsection' : undefined}>
                    {section.specs.length > 1 && <h4 className="filter-subsection-title">{isColorSpec(spec.key) ? 'Boja' : 'Materijal'}</h4>}
                    {spec.diameterValues?.length ? (
                      <DiameterFilter values={spec.diameterValues} selected={sp.getAll(`spec_${spec.key}`)}
                        onChange={(values) => setParams((params) => {
                          params.delete(`spec_${spec.key}`);
                          values.forEach((value) => params.append(`spec_${spec.key}`, value));
                        })} />
                    ) : isColorSpec(spec.key) ? (
                      <ColorFilter values={spec.values} selected={sp.getAll(`spec_${spec.key}`)}
                        label={formatProductSpecLabel(spec.key)} onToggle={(value) => toggleParam(`spec_${spec.key}`, value)} />
                    ) : isBraceletMaterialSpec(spec.key) ? (
                      <MaterialFilter values={spec.values} selected={sp.getAll(`spec_${spec.key}`)}
                        label={formatProductSpecLabel(spec.key)} onToggle={(value) => toggleParam(`spec_${spec.key}`, value)} />
                    ) : (
                    <div className="filter-list" role="group">
                      {spec.values.map(({ value, count }) => (
                        <label
                          key={value}
                          className={`filter-row ${
                            checked(`spec_${spec.key}`, value) ? 'is-active' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked(`spec_${spec.key}`, value)}
                            onChange={() =>
                              toggleParam(`spec_${spec.key}`, value)
                            }
                            className="filter-input-hidden"
                          />
                          <span className="filter-text">{value}</span>
                          <FilterCount count={count} />
                          {checked(`spec_${spec.key}`, value) && (
                            <div className="filter-check">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                    )}
                    </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        <div className={`f-section ${openSections.price ? 'is-open' : ''}`}>
          <SectionHeader
            title="Cena"
            count={sp.get('min') || sp.get('max') ? 1 : 0}
            onClear={() => {
              setParams((p) => {
                p.delete('min');
                p.delete('max');
              });
              setMin('');
              setMax('');
            }}
            isOpen={openSections.price}
            onToggle={() => toggleSection('price')}
          />
          <AnimatePresence initial={false}>
            {openSections.price && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="f-content-wrapper"
              >
                <div className="f-content-inner">
                  <div className="price-wrapper">
                    <div className="price-values">
                      <span>{Number(min || 0).toLocaleString()} RSD</span>
                      <span>
                        {Number(max || maxPriceLimit).toLocaleString()} RSD
                      </span>
                    </div>
                    <div className="slider-container">
                      <div className="slider-track-bg"></div>
                      <div
                        className="slider-track-fill"
                        style={{
                          left: `${getPercent(Number(min) || 0)}%`,
                          width: `${
                            getPercent(Number(max) || maxPriceLimit) -
                            getPercent(Number(min) || 0)
                          }%`,
                        }}
                      ></div>
                      <input
                        type="range"
                        min="0"
                        max={maxPriceLimit}
                        value={Number(min) || 0}
                        onChange={(e) => handleSliderChange(e, 'min')}
                        onMouseUp={handleSliderCommit}
                        onTouchEnd={handleSliderCommit}
                        className="thumb thumb--left"
                        style={{
                          zIndex:
                            (Number(min) || 0) > maxPriceLimit - 100 ? 5 : 3,
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={maxPriceLimit}
                        value={Number(max) || maxPriceLimit}
                        onChange={(e) => handleSliderChange(e, 'max')}
                        onMouseUp={handleSliderCommit}
                        onTouchEnd={handleSliderCommit}
                        className="thumb thumb--right"
                        style={{ zIndex: 4 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="f-bottom-actions">
          {activeTotal > 0 && (
            <button
              type="button"
              className="btn-large-reset"
              onClick={clearAll}
            >
              Ukloni sve filtere
            </button>
          )}

          {/* NOVO DUGME ZA ZATVARANJE (Samo na mobilnom) */}
          {onClose && (
            <button type="button" className="btn-large-close" onClick={onClose}>
              Zatvori filtere
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
