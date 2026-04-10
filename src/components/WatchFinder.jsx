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
    help: 'Pol najčešće utiče na proporcije sata, širinu kućišta, dužinu kaiša i ukupan vizuelni balans na ruci. Muški modeli su obično veći i izraženiji, ženski često elegantniji i uži, dok unisex ostavlja najviše prostora za neutralan izbor bez strogih pravila.',
    tip: 'Ako biraš poklon ili nisi siguran koliko upečatljiv sat treba da bude na zglobu, unisex je često najsigurnija opcija jer pokriva i klasične i modernije proporcije bez previše rizika.',
  },
  stil: {
    help: 'Stil je najbrži način da suziš izbor jer određuje da li tražiš sat za svakodnevicu, kancelariju, aktivniji ritam ili upečatljiv statement komad. Od njega zavise oblik kućišta, kontrast brojčanika, prisustvo dodatnih funkcija i koliko sat deluje formalno ili opušteno na ruci.',
    tip: 'Ako sat treba da radi u više situacija tokom dana, kreni od casual ili minimal/retro pravca. Poslovni je bolji kada želiš čist i uredan izgled, dok sport i outdoor imaju smisla kada su ti otpornost, čitljivost i robusniji karakter važniji od formalnosti.',
  },
  budzet: {
    help: 'Budžet ne menja samo cenu, već i nivo završne obrade, kvalitet materijala, osećaj na ruci i širinu izbora između jednostavnih i ozbiljnijih modela. U nižim rangovima fokus je na praktičnim i pouzdanim satovima, dok viši budžet obično otvara bolje kućište, detaljniji brojčanik, kvalitetniju narukvicu i premium prisustvo.',
    tip: 'Ako tražiš najbolji odnos uloženog i dobijenog, srednji raspon je često najzahvalniji. Ako želiš da sat deluje ozbiljnije, luksuznije ili kao poklon koji treba da ostavi jači utisak, idi stepen iznad onoga što si prvobitno planirao.',
  },
  brand: {
    help: 'Svaki brend nosi drugačiji dizajnerski potpis i očekivanje od proizvoda. Neki su poznati po funkcionalnosti i izdržljivosti, neki po elegantnijem izgledu, a neki po dobroj svakodnevnoj vrednosti. Kada izabereš brend, mnogo brže dolaziš do modela koji vizuelno i praktično liče na ono što tražiš.',
    tip: 'Ako već znaš da ti se dopada određeni karakter sata, izbor brenda može odmah preseći pola kataloga. Ako još vagaš između više pravaca, slobodno ostavi “Nije bitno” i pusti da stil i budžet prvo odrade glavno sužavanje.',
  },
  precnik: {
    help: 'Prečnik govori koliko će sat biti prisutan na zglobu i da li će delovati diskretno, uravnoteženo ili naglašeno. Manji modeli su elegantniji i lakši za nošenje uz formalniji stil, srednji raspon je najsvestraniji, dok veći prečnici daju sportskiji i izraženiji utisak.',
    tip: 'Ako ne znaš odakle da kreneš, 36–40mm je najbezbedniji izbor za većinu ljudi i stilova. Veći prečnici imaju smisla kada želiš jači vizuelni efekat ili robusniji karakter sata, ali mogu delovati prenaglašeno na užem zglobu.',
  },
  narukvica: {
    help: 'Narukvica ili kaiš u velikoj meri određuju kako sat izgleda, koliko je udoban i u kojim situacijama ga je najprirodnije nositi. Čelik deluje ozbiljnije i traje dugo, koža je klasična i elegantna, silikon je praktičan za aktivniji ritam, a platno i mesh daju opušteniji ili stilizovaniji karakter.',
    tip: 'Ako ti je važna svakodnevna praktičnost i lakše održavanje, čelik i silikon su najjednostavniji izbor. Ako ti je važniji utisak i stil na ruci, koža i mesh često daju više karaktera čak i kada je sam sat vrlo jednostavan.',
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
  const isEditorial = variant === 'editorial';
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
      return '6 kratkih pitanja, svaki klik te automatski vodi dalje. Brzo do predloga.';
    if (mode === 'results')
      return 'Predlozi po tvojim kriterijumima. Možeš ih otvoriti ili otići u katalog.';
    return '6 kratkih pitanja za brze predloge po stilu, budžetu i funkcijama.';
  })();
  const asideTitle = isEditorial ? 'Curated Watch Finder' : 'Pronađi sat koji ti stvarno leži.';
  const headingTitle =
    mode === 'quiz'
      ? current.title
      : mode === 'results'
        ? 'Rezultati'
        : isDark
          ? 'Watch Finder'
          : 'Nađi svoj sat';
  const activeHelper = mode === 'quiz' ? HELPERS[current.key] : null;
  const editorialNoteTitle =
    mode === 'quiz'
      ? current.title
      : mode === 'results'
        ? 'Predlozi su spremni za pregled.'
        : 'Odgovori kratko, a mi slažemo uži izbor.';
  const editorialNoteCopy =
    mode === 'quiz'
      ? activeHelper?.help ||
        'Odaberi opciju koja ti je najbliža. Sve možeš ponovo da prođeš bez gubitka toka.'
      : mode === 'results'
        ? 'Predlozi su složeni prema tvom izboru brenda, budžeta i detalja koje si označio tokom kviza.'
        : 'Kviz je namenjen brzom sužavanju izbora bez komplikovanih filtera i bez suvišnog skrolovanja.';
  const editorialNoteTip =
    mode === 'quiz'
      ? activeHelper?.tip || 'Ako si između dve opcije, izaberi onu kojoj više naginješ.'
      : mode === 'results'
        ? 'Ako želiš širi pregled, otvori katalog i nastavi od već primenjenih kriterijuma.'
        : 'Ne tražimo savršen odgovor, već smer koji vodi do boljih preporuka.';

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
  if (isEditorial) rootClasses.push('watchfinder--editorial');

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

  const resultsContent = (
    <>
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
          <div className="wf-empty__text">Još uvek nema predloga — probaj druga pitanja.</div>
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
    </>
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
                <h2>{asideTitle}</h2>
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
                        {(isSplit || isEditorial) && (
                          <div className="wf-step__question">{current.title}</div>
                        )}
                        {isEditorial && (
                          <p className="wf-step__hint">
                            Odaberi opciju koja najbolje opisuje ono što tražiš. Sledeći korak se
                            otvara odmah nakon izbora.
                          </p>
                        )}
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
                    {!isEditorial && (
                      <div className="wf-help">
                        <p className="wf-help__title">Need help?</p>
                        <p className="wf-help__copy">
                          {HELPERS[current.key]?.help ||
                            'Odaberi najbližu opciju – sve se može promeniti u rezultatima.'}
                        </p>
                        <p className="wf-help__tip">
                          Watch tip:{' '}
                          {HELPERS[current.key]?.tip ||
                            'Pogledaj predloge pa doradi filtere u katalogu.'}
                        </p>
                      </div>
                    )}

                    <div className="wf-actions">
                      <button
                        className="btn btn--ghost wf-backOnly"
                        aria-label="Nazad"
                        onClick={handlePrev}
                      >
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
                        {isEditorial && <div className="wf-step__question">{current.title}</div>}
                        {isEditorial && (
                          <p className="wf-step__hint">
                            Odaberi opciju koja najbolje opisuje ono što tražiš. Sledeći korak se
                            otvara odmah nakon izbora.
                          </p>
                        )}
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
                    {!isEditorial && (
                      <div className="wf-help">
                        <p className="wf-help__title">Need help?</p>
                        <p className="wf-help__copy">
                          {HELPERS[current.key]?.help ||
                            'Odaberi najbližu opciju – sve se može promeniti u rezultatima.'}
                        </p>
                        <p className="wf-help__tip">
                          Watch tip:{' '}
                          {HELPERS[current.key]?.tip ||
                            'Pogledaj predloge pa doradi filtere u katalogu.'}
                        </p>
                      </div>
                    )}

                    <div className="wf-actions">
                      <button
                        className="btn btn--ghost wf-backOnly"
                        aria-label="Nazad"
                        onClick={handlePrev}
                      >
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

        {isEditorial && (
          <div className="wf-editorialNote wf-editorialNote--full">
            <div className="wf-editorialNote__title">{editorialNoteTitle}</div>
            <p className="wf-editorialNote__copy">{editorialNoteCopy}</p>
            <p className="wf-editorialNote__tip">{editorialNoteTip}</p>
          </div>
        )}

        {isEditorial && (
          <AnimatePresence>
            {mode === 'results' && (
              <motion.div
                key="results-grid-editorial"
                className="wf-results wf-results--editorial wf-results--inline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {resultsContent}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {!isEditorial && mode === 'results' && (
          <motion.div
            key="results-grid"
            className={`wf-results ${isDark ? 'wf-results--on-dark' : ''} ${
              isEditorial ? 'wf-results--editorial' : ''
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {resultsContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
