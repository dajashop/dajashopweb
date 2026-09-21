import React, { useEffect, useMemo, useState } from 'react';
import './Filters.css';
import { useSearchParams } from 'react-router-dom';
import catalog from '../services/CatalogService.js';
import { motion, AnimatePresence } from 'framer-motion';

function SectionHeader({ title, count, onClear, isOpen, onToggle }) {
  return (
    <div
      className="f-head cursor-pointer"
      onClick={onToggle}
      role="button"
      aria-expanded={isOpen}
    >
      <span className="f-title">{title}</span>
      <div className="f-head-right">
        <div className="f-actions">
          {count > 0 && (
            <span className="f-badge" aria-label={`${count} izabrano`}>
              {count}
            </span>
          )}
          {count > 0 && (
            <button
              type="button"
              className="f-clear"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              Očisti
            </button>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="f-chevron"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </motion.svg>
      </div>
    </div>
  );
}

export default function Filters({ products, onClose }) {
  // <--- Dodat onClose prop
  const [sp, setSp] = useSearchParams();

  const baseData = useMemo(() => {
    if (Array.isArray(products)) return products;
    return catalog.list();
  }, [products]);

  const brands = useMemo(() => {
    const b = baseData.map((p) => p.brand).filter(Boolean);
    return [...new Set(b)].sort();
  }, [baseData]);

  const categories = useMemo(() => {
    const selectedBrands = sp.getAll('brand');
    if (selectedBrands.length === 0) {
      const allCats = baseData.map((p) => p.category).filter(Boolean);
      return [...new Set(allCats)].sort();
    }
    const filteredProducts = baseData.filter((p) =>
      selectedBrands.includes(p.brand)
    );
    const dynamicCats = filteredProducts.map((p) => p.category).filter(Boolean);
    return [...new Set(dynamicCats)].sort();
  }, [sp, baseData]);

  const specifications = useMemo(() => {
    const selectedBrands = sp.getAll('brand');
    const selectedCategories = sp.getAll('category');
    const selectedGenders = sp.getAll('gender');

    let filtered = baseData;

    if (selectedBrands.length > 0)
      filtered = filtered.filter((p) => selectedBrands.includes(p.brand));
    if (selectedCategories.length > 0)
      filtered = filtered.filter((p) =>
        selectedCategories.includes(p.category)
      );
    if (selectedGenders.length > 0) {
      filtered = filtered.filter((p) => {
        if (selectedGenders.includes(p.gender)) return true;
        if (!p.gender || p.gender === 'Unisex') return true;
        return false;
      });
    }

    const specsMap = {};
    filtered.forEach((p) => {
      if (!p.specs) return;
      Object.entries(p.specs).forEach(([key, val]) => {
        if (!val) return;
        if (!specsMap[key]) specsMap[key] = new Set();
        specsMap[key].add(val);
      });
    });

    return Object.entries(specsMap)
      .map(([key, valuesSet]) => ({
        key,
        values: [...valuesSet].sort(),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [sp, baseData]);

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
    setParams((p) => {
      const currentCats = p.getAll('category');
      const has = currentCats.includes(val);
      p.delete('category');
      const newCats = has
        ? currentCats.filter((x) => x !== val)
        : [...currentCats, val];
      newCats.forEach((v) => p.append('category', v));

      if (!has) {
        const matchingProducts = baseData.filter(
          (prod) => prod.category === val
        );
        const associatedBrands = [
          ...new Set(
            matchingProducts.map((prod) => prod.brand).filter(Boolean)
          ),
        ];
        const currentBrands = p.getAll('brand');
        associatedBrands.forEach((brand) => {
          if (!currentBrands.includes(brand)) {
            p.append('brand', brand);
          }
        });
      }
    });
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

  Array.from(sp.keys()).forEach((k) => {
    if (k.startsWith('spec_')) activeTotal += sp.getAll(k).length;
  });

  if (baseData.length === 0) {
    return (
      <aside className="filters card glass p-4 text-center text-muted text-sm">
        Nema filtera za ovu kategoriju.
      </aside>
    );
  }

  return (
    <aside
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
              title="Kategorija"
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

        {specifications.map((spec) => (
          <div
            key={spec.key}
            className={`f-section ${openSections[spec.key] ? 'is-open' : ''}`}
          >
            <SectionHeader
              title={spec.key}
              count={countSelected(`spec_${spec.key}`)}
              onClear={() => clearKey(`spec_${spec.key}`)}
              isOpen={!!openSections[spec.key]}
              onToggle={() => toggleSection(spec.key)}
            />
            <AnimatePresence initial={false}>
              {openSections[spec.key] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="f-content-wrapper"
                >
                  <div className="f-content-inner">
                    <div className="filter-list" role="group">
                      {spec.values.map((val) => (
                        <label
                          key={val}
                          className={`filter-row ${
                            checked(`spec_${spec.key}`, val) ? 'is-active' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked(`spec_${spec.key}`, val)}
                            onChange={() =>
                              toggleParam(`spec_${spec.key}`, val)
                            }
                            className="filter-input-hidden"
                          />
                          <span className="filter-text">{val}</span>
                          {checked(`spec_${spec.key}`, val) && (
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
