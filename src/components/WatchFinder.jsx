import React, { useState } from 'react';
import './WatchFinder.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useProducts from '../hooks/useProducts.js';
import { money } from '../utils/currency.js';

const QUESTIONS = [
  {
    key: 'gender',
    title: 'Pol',
    paramKey: 'gender',
    options: [
      { label: 'Muški', value: 'MUŠKI' },
      { label: 'Ženski', value: 'ŽENSKI' },
      { label: 'Unisex', value: 'Unisex' },
      { label: 'Nije bitno', value: '' },
    ],
  },
  {
    key: 'stil',
    title: 'Stil',
    paramKey: 'spec_stil',
    options: [
      { label: 'Poslovni', value: 'Poslovni' },
      { label: 'Casual', value: 'Casual' },
      { label: 'Sport / G‑Shock', value: 'Sportski' },
      { label: 'Outdoor', value: 'Outdoor' },
      { label: 'Minimal / retro', value: 'Minimal' },
      { label: 'Nije bitno', value: '' },
    ],
  },
  {
    key: 'budzet',
    title: 'Budžet',
    paramKey: 'budget',
    options: [
      { label: 'Do 5k', value: '0-5000', range: [0, 5000] },
      { label: '5k–10k', value: '5000-10000', range: [5000, 10000] },
      { label: '10k–20k', value: '10000-20000', range: [10000, 20000] },
      { label: '20k–40k', value: '20000-40000', range: [20000, 40000] },
      { label: '40k+', value: '40000+', range: [40000, null] },
      { label: 'Nije bitno', value: '' },
    ],
  },
  {
    key: 'brand',
    title: 'Brend',
    paramKey: 'brand',
    options: [
      { label: 'Casio', value: 'CASIO' },
      { label: 'G‑Shock', value: 'G-SHOCK' },
      { label: 'Daniel Klein', value: 'DANIEL KLEIN' },
      { label: 'Orient', value: 'ORIENT' },
      { label: 'Q&Q', value: 'Q&Q' },
      { label: 'Nije bitno', value: '' },
    ],
  },
  {
    key: 'precnik',
    title: 'Prečnik',
    paramKey: 'spec_precnik',
    options: [
      { label: '<36mm', value: '<36mm' },
      { label: '36–40mm', value: '36-40mm' },
      { label: '40–44mm', value: '40-44mm' },
      { label: '44mm+', value: '44mm+' },
      { label: 'Nije bitno', value: '' },
    ],
  },
  {
    key: 'mehanizam',
    title: 'Mehanizam',
    paramKey: 'spec_mehanizam',
    options: [
      { label: 'Quartz', value: 'Quartz' },
      { label: 'Automatski', value: 'Automatski' },
      { label: 'Solar', value: 'Solar' },
      { label: 'Digitalni', value: 'Digitalni' },
      { label: 'Nije bitno', value: '' },
    ],
  },
  {
    key: 'narukvica',
    title: 'Narukvica',
    paramKey: 'spec_narukvica',
    options: [
      { label: 'Čelik', value: 'Čelik' },
      { label: 'Koža', value: 'Koža' },
      { label: 'Silikon', value: 'Silikon' },
      { label: 'Platno / NATO', value: 'Platno' },
      { label: 'Mesh', value: 'Mesh' },
      { label: 'Nije bitno', value: '' },
    ],
  },
];

const sectionVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
};

function buildSearchParams(answers) {
  const sp = new URLSearchParams();

  QUESTIONS.forEach((q) => {
    const val = answers[q.key];
    if (!val || (Array.isArray(val) && val.length === 0)) return;

    if (q.key === 'budzet') {
      const opt = q.options.find((o) => o.value === val);
      if (opt) {
        const [min, max] = opt.range;
        if (min != null) sp.set('min', String(min));
        if (max != null) sp.set('max', String(max));
      }
      return;
    }

    if (q.type === 'multi') {
      val.forEach((v) => sp.append(q.paramKey, v));
      return;
    }

    if (q.paramKey === 'brand' && val === '') return; // "Bez preference"
    if (q.paramKey) sp.append(q.paramKey, val);
  });

  return sp;
}

function filterProducts(answers, products) {
  if (!products) return [];
  const params = buildSearchParams(answers);
  const min = params.get('min');
  const max = params.get('max');

  const specEntries = [...params.entries()].filter(([k]) => k.startsWith('spec_'));
  const brands = params.getAll('brand');
  const genders = params.getAll('gender');

  const matches = products.filter((p) => {
    if (brands.length && !brands.includes(p.brand)) return false;
    if (genders.length && !genders.includes(p.gender)) {
      if (!(p.gender === undefined && genders.includes('Unisex'))) return false;
    }

    if (min || max) {
      const price = Number(p.price || 0);
      if (min && price < Number(min)) return false;
      if (max && price > Number(max)) return false;
    }

    for (const [k, v] of specEntries) {
      const productVal = p.specs?.[k.replace('spec_', '')] || p.specs?.[k];
      if (!v) continue;
      if (!productVal) return false;
      const val = productVal.toString().toLowerCase();
      if (!val.includes(v.toLowerCase())) return false;
    }

    return true;
  });

  const scored = matches.map((p) => {
    let score = 0;
    if (brands.includes(p.brand)) score += 2;
    if (genders.includes(p.gender)) score += 2;
    specEntries.forEach(([k, v]) => {
      const productVal = p.specs?.[k.replace('spec_', '')] || p.specs?.[k];
      if (productVal && productVal.toString().toLowerCase().includes(v.toLowerCase())) {
        score += 1;
      }
    });
    return { p, score };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.p.price || 0) - (b.p.price || 0);
    })
    .map((s) => s.p)
    .slice(0, 6);
}

const HELPERS = {
  gender: {
    help: 'Muški i ženski modeli se razlikuju u širini kućišta, dužini kaiša i dizajnu brojčanika.',
    tip: 'Unisex uzmi ako želiš manji prečnik ili neutralan stil koji pristaje većini zglobova.',
  },
  stil: {
    help: 'Stil određuje oblik kazaljki, veličinu kućišta, nivo robusnosti i vidljivost na ruci.',
    tip: 'Za odelo traži tanje kućište i čelik/kožu; za sport prioritet su otpornost, guma/silikon i veća čitljivost.',
  },
  budzet: {
    help: 'Budžet utiče na mehanizam (quartz vs. auto), vrstu stakla, završnu obradu i vodootpornost.',
    tip: 'Do 20k najviše vrednosti daju quartz modeli; 20k+ otvara automatik i bolje materijale.',
  },
  brand: {
    help: 'Brend nosi specifičan dizajn i servise; izbor brenda odmah skraćuje listu.',
    tip: 'Ako nisi siguran, ostavi “Nije bitno” pa filtriraj dalje po stilu i budžetu.',
  },
  precnik: {
    help: 'Prečnik i lug-to-lug dužina diktiraju kako sat sedi na zglobu.',
    tip: '36–40mm je najsvestranije; 40–44mm za sport/statement; 44mm+ kada želiš maksimalnu prisutnost.',
  },
  mehanizam: {
    help: 'Mehanizam utiče na preciznost, servis i osećaj pri nošenju.',
    tip: 'Quartz = najtačniji i bez brige; automatik = mehanički šarm, traži povremeno nošenje; solar = puni se svetlom.',
  },
  narukvica: {
    help: 'Materijal kaiša menja udobnost, težinu i formalnost sata.',
    tip: 'Čelik za eleganciju i trajnost; koža za klasičan look; silikon za sport i vodu; NATO/platno za lagan, ležeran stil.',
  },
};

export default function WatchFinder({
  autoStart = false,
  showIntro = true,
  fullWidth = false,
  className = '',
  layout = 'stack',
  variant = 'light',
}) {
  const navigate = useNavigate();
  const isSplit = layout === 'split';
  const isDark = variant === 'dark';
  const hasIntro = showIntro && !isSplit;
  const initialMode = hasIntro ? 'intro' : 'quiz';
  const [mode, setMode] = useState(initialMode); // intro | quiz | results
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [submittedAnswers, setSubmittedAnswers] = useState({});

  const { items: products, loading } = useProducts({ order: 'name', limit: 200 });

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const progressFraction = `${String(Math.min(step + 1, totalSteps)).padStart(2, '0')} / ${String(
    totalSteps,
  ).padStart(2, '0')}`;
  const modeDescription = (() => {
    if (mode === 'quiz')
      return '7 kratkih pitanja, svaki klik te automatski vodi dalje. Brzo do predloga.';
    if (mode === 'results')
      return 'Predlozi po tvojim kriterijumima. Možeš ih otvoriti ili otići u katalog.';
    return '7 kratkih pitanja za brze predloge po stilu, budžetu i funkcijama.';
  })();
  const headingTitle =
    mode === 'quiz'
      ? current.title
      : mode === 'results'
        ? 'Rezultati'
        : isDark
          ? 'Watch Finder'
          : 'Nađi svoj sat';

  const handleStart = () => {
    setMode('quiz');
    setStep(0);
  };

  const handlePrev = () => {
    if (mode === 'quiz' && step === 0) {
      if (hasIntro) {
        setMode('intro');
      }
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const submitQuiz = (payload = answers) => {
    const res = filterProducts(payload, products);
    setResults(res);
    setSubmittedAnswers(payload);
    setMode('results');
  };

  const handleNext = () => {
    if (step >= totalSteps - 1) {
      submitQuiz();
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const handleSelect = (key, value) => {
    const nextAnswers = { ...answers, [key]: value };
    setAnswers(nextAnswers);
    const isLast = step >= totalSteps - 1;
    if (isLast) {
      submitQuiz(nextAnswers);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const handleReset = () => {
    setAnswers({});
    setSubmittedAnswers({});
    setResults([]);
    setStep(0);
    setMode(initialMode);
  };

  const goToCatalog = () => {
    const sp = buildSearchParams(Object.keys(submittedAnswers).length ? submittedAnswers : answers);
    const qs = sp.toString();
    navigate(qs ? `/catalog?${qs}` : '/catalog');
  };

  // Auto start quiz when requested
  React.useEffect(() => {
    if (autoStart && hasIntro && mode === 'intro') {
      setMode('quiz');
    }
  }, [autoStart, hasIntro, mode]);

  const rootClasses = ['watchfinder', className];
  if (fullWidth) rootClasses.push('watchfinder--full');
  rootClasses.push(isSplit ? 'watchfinder--split' : 'watchfinder--stack');
  if (isDark) rootClasses.push('watchfinder--dark');

  const renderProgress = (
    !isDark && (
      <div className="wf-progress">
        <div className="wf-progress__bar" aria-hidden="true">
          <motion.span
            layout
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </div>
        <div className="wf-progress__meta">
          <span className="wf-progress__fraction">{progressFraction}</span>
          <span className="wf-progress__percent">{progress}%</span>
        </div>
      </div>
    )
  );

  return (
    <motion.div
      className={rootClasses.join(' ').trim()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="wf-card">
        {isSplit ? (
          <div className="wf-grid">
            <div className="wf-aside">
              <div>
                <p className="eyebrow">Watch Finder</p>
                <h2>Pronađi sat koji ti stvarno leži.</h2>
                <p className="lede wf-aside__lede">{modeDescription}</p>
              </div>
              {mode !== 'intro' && renderProgress}
              <div className="wf-aside__actions">
                <button className="btn btn--ghost" onClick={handleReset}>
                  <RefreshCw size={16} /> Resetuj kviz
                </button>
                <button className="btn btn--primary" onClick={goToCatalog}>
                  Vidi u katalogu <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="wf-pane">
              <AnimatePresence mode="wait">
                {hasIntro && mode === 'intro' && (
                  <motion.div
                    key="intro"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="wf-intro wf-card-ghost"
                  >
                    <p className="wf-intro__copy">
                      Kratak kviz će ti preporučiti satove po stilu, budžetu i funkcijama.
                    </p>
                    <button className="btn btn--primary" onClick={handleStart}>
                      Pokreni kviz <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}

                {mode === 'quiz' && (
                  <motion.div
                    key={current.key}
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="wf-step wf-questionCard"
                  >
                    {!isDark && (
                      <div className="wf-step__head">
                        <span className="wf-pill">
                          Pitanje {step + 1}/{totalSteps}
                        </span>
                      </div>
                    )}
                      <div className="wf-options">
                        {current.options.map((opt) => {
                          const active = answers[current.key] === opt.value;
                          return (
                            <motion.button
                            key={opt.value || opt.label}
                            whileHover={{ y: -2, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`wf-chip ${active ? 'is-active' : ''}`}
                            onClick={() => handleSelect(current.key, opt.value)}
                          >
                            {opt.label}
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="wf-help">
                      <p className="wf-help__title">Need help?</p>
                      <p className="wf-help__copy">{HELPERS[current.key]?.help || 'Odaberi najbližu opciju – sve se može promeniti u rezultatima.'}</p>
                      <p className="wf-help__tip">Watch tip: {HELPERS[current.key]?.tip || 'Pogledaj predloge pa doradi filtere u katalogu.'}</p>
                    </div>

                    <div className="wf-actions">
                      <button className="btn btn--ghost wf-backOnly" aria-label="Nazad" onClick={handlePrev}>
                        <ArrowLeft size={16} />
                      </button>
                      <div className="wf-actions__right" />
                    </div>
                  </motion.div>
                )}

                {mode === 'results' && (
                  <motion.div
                    key="results-card"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="wf-step wf-questionCard wf-questionCard--done"
                  >
                    <div className="wf-step__head">
                      <span className="wf-pill wf-pill--success">Gotovo</span>
                      <div className="wf-step__title">Rezultati su spremni ispod.</div>
                      <p className="wf-step__hint">
                        Otvori predloge ili idi u katalog, a možeš i da pokreneš kviz ponovo.
                      </p>
                    </div>
                    <div className="wf-actions wf-actions--stack">
                      <button className="btn btn--primary" onClick={goToCatalog}>
                        Vidi u katalogu <ArrowRight size={16} />
                      </button>
                      <button className="btn btn--ghost" onClick={handleReset}>
                        <RefreshCw size={16} /> Nova pitanja
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isDark && <div className="wf-illustration" aria-hidden="true" />}
          </div>
        ) : (
          <div className="wf-inner">
            <div className="wf-head">
              <div>
                <p className="eyebrow">Watch Finder</p>
                <h2>{headingTitle}</h2>
                <p className="lede">{modeDescription}</p>
              </div>
              {mode !== 'intro' && renderProgress}
            </div>

            <div className="wf-body">
              <AnimatePresence mode="wait">
                {hasIntro && mode === 'intro' && (
                  <motion.div
                    key="intro"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="wf-intro"
                  >
                    <p className="wf-intro__copy">
                      Kratak kviz će ti preporučiti satove po stilu, budžetu i funkcijama.
                    </p>
                    <button className="btn btn--primary" onClick={handleStart}>
                      Odgovori na kratka pitanja <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}

                {mode === 'quiz' && (
                  <motion.div
                    key={current.key}
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="wf-step wf-questionCard"
                  >
                    {!isDark && (
                      <div className="wf-step__head">
                        <span className="wf-pill">
                          Pitanje {step + 1}/{totalSteps}
                        </span>
                      </div>
                    )}
                    <div className="wf-options">
                      {current.options.map((opt) => {
                        const active = answers[current.key] === opt.value;
                        return (
                          <motion.button
                            key={opt.value || opt.label}
                            whileHover={{ y: -2, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`wf-chip ${active ? 'is-active' : ''}`}
                            onClick={() => handleSelect(current.key, opt.value)}
                          >
                            {opt.label}
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="wf-help">
                      <p className="wf-help__title">Need help?</p>
                      <p className="wf-help__copy">{HELPERS[current.key]?.help || 'Odaberi najbližu opciju – sve se može promeniti u rezultatima.'}</p>
                      <p className="wf-help__tip">Watch tip: {HELPERS[current.key]?.tip || 'Pogledaj predloge pa doradi filtere u katalogu.'}</p>
                    </div>

                    <div className="wf-actions">
                      <button className="btn btn--ghost wf-backOnly" aria-label="Nazad" onClick={handlePrev}>
                        <ArrowLeft size={16} />
                      </button>
                      <div className="wf-actions__right" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isDark && <div className="wf-illustration" aria-hidden="true" />}
          </div>
        )}
      </div>

      <AnimatePresence>
        {mode === 'results' && (
          <motion.div
            key="results-grid"
            className={`wf-results ${isDark ? 'wf-results--on-dark' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="wf-results__head">
              <div>
                <p className="eyebrow">Rezultati</p>
                <h3>Predlozi na osnovu tvog izbora</h3>
              </div>
              <div className="wf-results__actions">
                <button className="btn btn--primary" onClick={goToCatalog}>
                  Vidi u katalogu <ArrowRight size={16} />
                </button>
                <button className="btn btn--ghost wf-reset" onClick={handleReset}>
                  <RefreshCw size={16} /> Nova pitanja
                </button>
              </div>
            </div>

            {loading && <div className="wf-skeleton">Učitavanje predloga…</div>}

            {!loading && results.length === 0 && (
              <div className="wf-empty">
                <div className="wf-empty__text">
                  Još uvek nema predloga — probaj druga pitanja.
                </div>
                <div className="wf-empty__actions">
                  <button className="btn btn--ghost" onClick={handleReset}>
                    <RefreshCw size={14} /> Pokreni ponovo
                  </button>
                  <button className="btn btn--primary" onClick={goToCatalog}>
                    Vidi u katalogu <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="wf-results__grid">
                {results.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    className="wf-card-mini"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link to={`/product/${p.slug}`} className="wf-card-mini__img">
                      <img src={p.thumbnailUrl || p.image} alt={p.name} loading="lazy" />
                    </Link>
                    <div className="wf-card-mini__body">
                      <div className="wf-card-mini__brand">{p.brand}</div>
                      <Link to={`/product/${p.slug}`} className="wf-card-mini__name">
                        {p.name}
                      </Link>
                      <div className="wf-card-mini__price">{money(p.price)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="wf-results__cta">
              <button className="btn btn--primary" onClick={goToCatalog}>
                Vidi u katalogu <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
