import React, { useEffect, useRef, useState } from 'react';
import './WatchFinder.css';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useProducts from '../hooks/useProducts.js';
import { money } from '../utils/currency.js';

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

function includesAny(haystack, needles = []) {
  if (!haystack || needles.length === 0) return false;
  return needles.some((needle) => haystack.includes(needle));
}

function normalizeSpecs(specs = {}) {
  const normalized = {};
  Object.entries(specs || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeText(key);
    if (!normalizedKey || value == null || value === '') return;
    normalized[normalizedKey] = String(value);
  });
  return normalized;
}

function readSpecValue(normalizedSpecs, aliases = []) {
  for (const alias of aliases) {
    if (normalizedSpecs[alias]) return normalizedSpecs[alias];
  }
  return '';
}

function parseDiameterMm(value) {
  if (value == null) return null;
  const nums = String(value)
    .replace(',', '.')
    .match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return null;
  const parsed = nums.map(Number).filter(Number.isFinite);
  if (parsed.length === 0) return null;
  if (parsed.length >= 2 && /[-–]/.test(String(value))) {
    return (parsed[0] + parsed[1]) / 2;
  }
  return parsed[0];
}

function getDiameterRange(value) {
  switch (value) {
    case '<36mm':
      return { min: null, max: 36 };
    case '36-40mm':
      return { min: 36, max: 40 };
    case '40-44mm':
      return { min: 40, max: 44 };
    case '44mm+':
      return { min: 44, max: null };
    default:
      return null;
  }
}

function scoreBudget(price, range) {
  if (!Array.isArray(range) || !Number.isFinite(price)) {
    return { score: 0, distance: Infinity };
  }

  const [min, max] = range;
  const low = min ?? 0;
  const hasUpperBound = max != null;
  const high = hasUpperBound ? max : Number.POSITIVE_INFINITY;
  const center = hasUpperBound ? (low + max) / 2 : low * 1.2;

  let outsideDistance = 0;
  if (price < low) outsideDistance = low - price;
  else if (hasUpperBound && price > high) outsideDistance = price - high;

  const width = hasUpperBound ? Math.max((max || low) - low, 1000) : Math.max(low * 0.6, 7000);
  const tolerance = Math.max(width * 0.55, 2500);

  if (outsideDistance === 0) {
    return { score: 5.2, distance: Math.abs(price - center) };
  }

  const closeness = Math.max(0, 1 - outsideDistance / tolerance);
  return {
    score: closeness * 3.2 - 1.2,
    distance: Math.abs(price - center),
  };
}

function scoreDiameter(diameter, range) {
  if (!range || !Number.isFinite(diameter)) return { score: 0, distance: Infinity };

  const low = range.min ?? Number.NEGATIVE_INFINITY;
  const high = range.max ?? Number.POSITIVE_INFINITY;

  if (diameter >= low && diameter <= high) return { score: 3.2, distance: 0 };

  const distance = diameter < low ? low - diameter : diameter - high;
  if (distance <= 1) return { score: 2.1, distance };
  if (distance <= 2.5) return { score: 1.1, distance };
  if (distance <= 4) return { score: 0.2, distance };
  return { score: -1, distance };
}

function compareFiniteDistance(a, b) {
  const aFinite = Number.isFinite(a);
  const bFinite = Number.isFinite(b);
  if (aFinite && bFinite) return a - b;
  if (aFinite) return -1;
  if (bFinite) return 1;
  return 0;
}

const SPEC_ALIASES = {
  stil: ['stil', 'style', 'dizajn'],
  precnik: [
    'precnik',
    'precnik kucista',
    'precnik kucista mm',
    'diameter',
    'case diameter',
  ],
  narukvica: ['narukvica', 'kais', 'kais narukvica', 'bracelet', 'strap', 'band'],
};

const NORMALIZED_SPEC_ALIASES = Object.fromEntries(
  Object.entries(SPEC_ALIASES).map(([key, aliases]) => [
    key,
    aliases.map((alias) => normalizeText(alias)),
  ]),
);

const STYLE_TOKENS = {
  poslovni: ['poslovni', 'business', 'dress', 'elegant', 'classic'],
  casual: ['casual', 'svakodnev', 'daily', 'everyday', 'urban'],
  sportski: ['sportski', 'sport', 'g shock', 'gshock', 'chrono', 'active'],
  outdoor: ['outdoor', 'field', 'trek', 'tactical', 'adventure'],
  minimal: ['minimal', 'retro', 'vintage', 'clean', 'classic'],
};

const STRAP_TOKENS = {
  celik: ['celik', 'steel', 'inox', 'stainless'],
  koza: ['koza', 'leather'],
  silikon: ['silikon', 'silicone', 'resin', 'rubber'],
  platno: ['platno', 'nato', 'canvas', 'textile', 'fabric'],
  mesh: ['mesh', 'milanese'],
};

const QUESTIONS = [
  {
    key: 'gender',
    title: 'Pol',
    paramKey: 'gender',
    options: [
      { label: 'Muški', value: 'MUŠKI' },
      { label: 'Ženski', value: 'ŽENSKI' },
      { label: 'Unisex', value: 'Unisex' },
      { label: 'Svejedno', value: '' },
    ],
  },
  {
    key: 'stil',
    title: 'Stil',
    paramKey: 'spec_stil',
    options: [
      { label: 'Poslovni', value: 'Poslovni' },
      { label: 'Casual', value: 'Casual' },
      { label: 'Sport', value: 'Sportski' },
      { label: 'Svejedno', value: '' },
    ],
  },
  {
    key: 'budzet',
    title: 'Budžet',
    paramKey: 'budget',
    options: [
      { label: 'Do 10k', value: '0-10000', range: [0, 10000] },
      { label: '10k–20k', value: '10000-20000', range: [10000, 20000] },
      { label: '20k–40k', value: '20000-40000', range: [20000, 40000] },
      { label: 'Svejedno', value: '' },
    ],
  },
  {
    key: 'brand',
    title: 'Brend',
    paramKey: 'brand',
    options: [
      { label: 'Casio', value: 'CASIO' },
      { label: 'G‑Shock', value: 'G-SHOCK' },
      { label: 'Orient', value: 'ORIENT' },
      { label: 'Svejedno', value: '' },
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
      { label: 'Svejedno', value: '' },
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
      { label: 'Svejedno', value: '' },
    ],
  },
];

const BUDGET_RANGE_BY_VALUE = Object.fromEntries(
  QUESTIONS.find((q) => q.key === 'budzet')
    .options.filter((option) => Array.isArray(option.range))
    .map((option) => [option.value, option.range]),
);

const SECTION_VARIANTS = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
};

const SECTION_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const OPTIONS_GRID_VARIANTS = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.025,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

const OPTIONS_GRID_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const CHIP_ITEM_VARIANTS = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.985 },
};

const CHIP_ITEM_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const RESULTS_GRID_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
  exit: { opacity: 0, y: -8 },
};

const RESULTS_GRID_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const RESULT_ITEM_VARIANTS = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
};

const RESULT_ITEM_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const NOTE_CONTENT_VARIANTS = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -6 },
};

const NOTE_CONTENT_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const RESULTS_PREP_DELAY_MS = 1500;

function getViewportWidth() {
  if (typeof window === 'undefined') return 1280;
  return window.innerWidth;
}

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
  if (!Array.isArray(products) || products.length === 0) return [];

  const selectedBudgetRange = BUDGET_RANGE_BY_VALUE[answers.budzet];
  const selectedDiameterRange = getDiameterRange(answers.precnik);
  const selectedBrand = normalizeText(answers.brand);
  const selectedGender = normalizeText(answers.gender);
  const selectedStyle = normalizeText(answers.stil);
  const selectedStrap = normalizeText(answers.narukvica);

  const ranked = products
    .filter((product) => {
      const dept = normalizeText(product.department || 'satovi');
      if (dept && dept !== 'satovi') return false;
      if (product.isVisible === false) return false;
      return true;
    })
    .map((product) => {
      const normalizedSpecs = normalizeSpecs(product.specs);
      const price = Number(product.price) || 0;
      const productBrand = normalizeText(product.brand);
      const productGender = normalizeText(product.gender);
      const isProductUnisex = !productGender || productGender.includes('unisex');
      const styleSource = [
        readSpecValue(normalizedSpecs, NORMALIZED_SPEC_ALIASES.stil),
        product.category,
        product.name,
      ]
        .filter(Boolean)
        .map((value) => normalizeText(value))
        .join(' ');
      const strapSource = normalizeText(
        readSpecValue(normalizedSpecs, NORMALIZED_SPEC_ALIASES.narukvica),
      );
      const diameterMm = parseDiameterMm(
        readSpecValue(normalizedSpecs, NORMALIZED_SPEC_ALIASES.precnik),
      );

      let score = 0;
      let matchedCriteria = 0;
      let hardMisses = 0;
      let budgetDistance = Infinity;
      let diameterDistance = Infinity;

      if (selectedBrand) {
        if (productBrand === selectedBrand) {
          score += 6.6;
          matchedCriteria += 1;
        } else if (
          productBrand.includes(selectedBrand) ||
          selectedBrand.includes(productBrand)
        ) {
          score += 4.2;
          matchedCriteria += 1;
        } else {
          score -= 3.4;
          hardMisses += 1;
        }
      }

      if (selectedGender) {
        const wantsUnisex = selectedGender.includes('unisex');
        if (wantsUnisex) {
          if (isProductUnisex) {
            score += 3.2;
            matchedCriteria += 1;
          } else {
            score += 1.2;
          }
        } else if (productGender === selectedGender) {
          score += 4.4;
          matchedCriteria += 1;
        } else if (isProductUnisex) {
          score += 2.1;
          matchedCriteria += 1;
        } else {
          score -= 2.4;
          hardMisses += 1;
        }
      }

      if (selectedBudgetRange) {
        const budgetResult = scoreBudget(price, selectedBudgetRange);
        score += budgetResult.score;
        budgetDistance = budgetResult.distance;
        if (budgetResult.score >= 3) matchedCriteria += 1;
      }

      if (selectedStyle) {
        const styleTokens = STYLE_TOKENS[selectedStyle] || [selectedStyle];
        if (includesAny(styleSource, styleTokens)) {
          score += 3.4;
          matchedCriteria += 1;
        } else if (styleSource) {
          score -= 0.9;
          hardMisses += 1;
        }
      }

      if (selectedStrap) {
        const strapTokens = STRAP_TOKENS[selectedStrap] || [selectedStrap];
        if (includesAny(strapSource, strapTokens)) {
          score += 2.8;
          matchedCriteria += 1;
        } else if (strapSource) {
          score -= 0.7;
        }
      }

      if (selectedDiameterRange) {
        const diameterResult = scoreDiameter(diameterMm, selectedDiameterRange);
        score += diameterResult.score;
        diameterDistance = diameterResult.distance;
        if (diameterResult.score >= 2) matchedCriteria += 1;
        if (diameterResult.score < 0) hardMisses += 1;
      }

      if (matchedCriteria > 0) {
        score += matchedCriteria * 0.45;
      }
      if (hardMisses >= 3) {
        score -= 1.4;
      }

      const popularity = Number(
        product.popularity ??
          product.popularityScore ??
          product.ordersCount ??
          product.sold ??
          product.views ??
          product.viewsCount ??
          0,
      );
      if (Number.isFinite(popularity) && popularity > 0) {
        score += Math.min(popularity / 5000, 0.7);
      }

      return {
        p: product,
        score,
        matchedCriteria,
        hardMisses,
        budgetDistance,
        diameterDistance,
      };
    });

  const preferred = ranked.filter((item) => item.score > 0);
  const softFallback = ranked.filter((item) => item.score > -2);
  const source = preferred.length >= 6 ? preferred : softFallback.length ? softFallback : ranked;

  return source
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchedCriteria !== a.matchedCriteria) {
        return b.matchedCriteria - a.matchedCriteria;
      }
      if (a.hardMisses !== b.hardMisses) return a.hardMisses - b.hardMisses;

      const budgetCmp = compareFiniteDistance(a.budgetDistance, b.budgetDistance);
      if (budgetCmp !== 0) return budgetCmp;

      const diameterCmp = compareFiniteDistance(a.diameterDistance, b.diameterDistance);
      if (diameterCmp !== 0) return diameterCmp;

      return (Number(a.p.price) || 0) - (Number(b.p.price) || 0);
    })
    .slice(0, 6)
    .map((item) => item.p);
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
    tip: 'Ako već znaš da ti se dopada određeni karakter sata, izbor brenda može odmah preseći pola kataloga. Ako još vagaš između više pravaca, slobodno ostavi “Svejedno” i pusti da stil i budžet prvo odrade glavno sužavanje.',
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
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const isPhoneViewport = viewportWidth <= 700;
  const isIntroViewport = viewportWidth <= 1024;
  const hasIntro = (showIntro && !isSplit) || isIntroViewport;
  const initialMode = hasIntro ? 'intro' : 'quiz';
  const [mode, setMode] = useState(initialMode); // intro | quiz | loading | results
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const resultsDelayRef = useRef(null);

  const { items: products, loading } = useProducts({ order: 'name', limit: 200 });

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const modeDescription = (() => {
    if (mode === 'quiz')
      return 'Odgovori na par pitanja i odmah dobijaš jasne preporuke.';
    if (mode === 'results')
      return 'Predlozi po tvojim kriterijumima. Možeš ih otvoriti ili otići u katalog.';
    return '6 kratkih pitanja za brze predloge po stilu, budžetu i funkcijama.';
  })();
  const asideTitle = isEditorial ? 'Zbunjuje te\nPreviše izbora?' : 'Pronađi sat koji ti stvarno leži.';
  const headingTitle =
    mode === 'quiz'
      ? current.title
      : mode === 'results'
        ? 'Rezultati'
        : isDark
          ? 'Watch Finder'
          : 'Nađi svoj sat';
  const shouldReduceMotion = useReducedMotion();
  const canGoBack = mode === 'quiz' && (step > 0 || hasIntro);
  const sectionVariants = shouldReduceMotion ? SECTION_VARIANTS_REDUCED : SECTION_VARIANTS;
  const optionsGridVariants = shouldReduceMotion
    ? OPTIONS_GRID_VARIANTS_REDUCED
    : OPTIONS_GRID_VARIANTS;
  const chipItemVariants = shouldReduceMotion ? CHIP_ITEM_VARIANTS_REDUCED : CHIP_ITEM_VARIANTS;
  const resultsGridVariants = shouldReduceMotion
    ? RESULTS_GRID_VARIANTS_REDUCED
    : RESULTS_GRID_VARIANTS;
  const resultItemVariants = shouldReduceMotion
    ? RESULT_ITEM_VARIANTS_REDUCED
    : RESULT_ITEM_VARIANTS;
  const noteContentVariants = shouldReduceMotion
    ? NOTE_CONTENT_VARIANTS_REDUCED
    : NOTE_CONTENT_VARIANTS;
  const sectionTransition = shouldReduceMotion
    ? { duration: 0.18, ease: 'linear' }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };
  const chipMotionTransition = shouldReduceMotion
    ? { duration: 0.14 }
    : { type: 'spring', stiffness: 280, damping: 24, mass: 0.84 };
  const cardMotionTransition = shouldReduceMotion
    ? { duration: 0.14 }
    : { type: 'spring', stiffness: 210, damping: 25, mass: 0.9 };
  const buttonMotionTransition = shouldReduceMotion
    ? { duration: 0.12 }
    : { type: 'spring', stiffness: 300, damping: 24, mass: 0.82 };
  const rootInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 };
  const rootAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const rootTransition = shouldReduceMotion
    ? { duration: 0.22, ease: 'linear' }
    : { duration: 0.36, ease: [0.22, 1, 0.36, 1] };
  const noteTransition = shouldReduceMotion
    ? { duration: 0.14, ease: 'linear' }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] };
  const chipHoverAnimation = shouldReduceMotion
    ? undefined
    : isEditorial
      ? { y: -3, scale: 1.02 }
      : { y: -2, scale: 1.016 };
  const chipTapAnimation = shouldReduceMotion ? undefined : { scale: 0.975 };
  const buttonHoverAnimation = shouldReduceMotion ? undefined : { y: -1, scale: 1.01 };
  const buttonTapAnimation = shouldReduceMotion ? undefined : { scale: 0.985 };
  const cardHoverAnimation = shouldReduceMotion ? undefined : { y: -3, scale: 1.01 };
  const editorialNoteMotionKey = mode === 'quiz' ? `quiz-${current.key}` : mode;
  const activeHelper = mode === 'quiz' ? HELPERS[current.key] : null;
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
  const showPhoneIntroOnly = isPhoneViewport && mode === 'intro';
  const showEditorialNote = isEditorial && !showPhoneIntroOnly && !(isIntroViewport && mode === 'intro');
  const showSelectionScreen = mode === 'loading' || mode === 'results';

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

  const clearResultsDelay = () => {
    if (!resultsDelayRef.current) return;
    clearTimeout(resultsDelayRef.current);
    resultsDelayRef.current = null;
  };

  const submitQuiz = (payload = answers) => {
    clearResultsDelay();
    setSubmittedAnswers(payload);
    setMode('loading');
    resultsDelayRef.current = setTimeout(() => {
      const res = filterProducts(payload, products);
      setResults(res);
      setMode('results');
      resultsDelayRef.current = null;
    }, RESULTS_PREP_DELAY_MS);
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
    clearResultsDelay();
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => () => clearResultsDelay(), []);

  useEffect(() => {
    if (mode === 'intro' && !hasIntro) {
      setMode('quiz');
    }
  }, [hasIntro, mode]);

  // Auto start quiz when requested
  React.useEffect(() => {
    if (autoStart && hasIntro && mode === 'intro' && !isIntroViewport) {
      setMode('quiz');
    }
  }, [autoStart, hasIntro, isIntroViewport, mode]);

  const rootClasses = ['watchfinder', className];
  if (fullWidth) rootClasses.push('watchfinder--full');
  rootClasses.push(isSplit ? 'watchfinder--split' : 'watchfinder--stack');
  if (isDark) rootClasses.push('watchfinder--dark');
  if (isEditorial) rootClasses.push('watchfinder--editorial');
  if (isPhoneViewport) rootClasses.push('watchfinder--phone');
  if (isIntroViewport) rootClasses.push('watchfinder--intro-range');
  if (mode === 'intro') rootClasses.push('watchfinder--intro-active');
  if (showSelectionScreen) rootClasses.push('watchfinder--selection-only');
  if (isPhoneViewport && mode !== 'intro') rootClasses.push('watchfinder--phone-active');

  if (showSelectionScreen) {
    return (
      <Motion.div
        className={rootClasses.join(' ').trim()}
        initial={rootInitial}
        animate={rootAnimate}
        transition={rootTransition}
      >
        <Motion.div className="wf-card" layout transition={cardMotionTransition}>
          <AnimatePresence mode="wait">
            {mode === 'loading' ? (
              <Motion.div
                key="selection-loading"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={sectionTransition}
                className="wf-selectionState wf-selectionState--loading"
              >
                <p className="wf-intro__eyebrow">WATCH FINDER</p>
                <h3 className="wf-selectionTitle">Pravimo selekciju za tebe…</h3>
                <p className="wf-selectionCopy">
                  Samo trenutak, proveravamo modele koji se najbolje poklapaju sa tvojim odgovorima.
                </p>
                <div className="wf-selectionLoader" aria-hidden="true" />
              </Motion.div>
            ) : (
              <Motion.div
                key="selection-ready"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={sectionTransition}
                className="wf-selectionState wf-selectionState--ready"
              >
                <div className="wf-selectionHead">
                  <p className="eyebrow">Rezultati</p>
                  <h3>Rezultati su spremni</h3>
                </div>

                {results.length === 0 ? (
                  <div className="wf-empty">Nismo našli dovoljno modela za ovu kombinaciju filtera.</div>
                ) : (
                  <div className="wf-selectionList" role="list">
                    {results.map((p) => (
                      <article className="wf-selectionItem" role="listitem" key={p.id}>
                        <div className="wf-selectionItem__img">
                          <img src={p.thumbnailUrl || p.image} alt={p.name} loading="lazy" />
                        </div>
                        <div className="wf-selectionItem__meta">
                          <div className="wf-selectionItem__brand">{p.brand}</div>
                          <div className="wf-selectionItem__name">{p.name}</div>
                        </div>
                        <div className="wf-selectionItem__price">{money(p.price)}</div>
                      </article>
                    ))}
                  </div>
                )}

                <Motion.button
                  className="btn btn--primary wf-selectionCta"
                  onClick={goToCatalog}
                  whileHover={buttonHoverAnimation}
                  whileTap={buttonTapAnimation}
                  transition={buttonMotionTransition}
                >
                  Pogledaj sve <ArrowRight size={16} />
                </Motion.button>
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.div>
      </Motion.div>
    );
  }

  const resultsContent = (
    <>
      <div className="wf-results__head">
        <div>
          <p className="eyebrow">Rezultati</p>
          <h3>Predlozi na osnovu tvog izbora</h3>
        </div>
        <div className="wf-results__actions">
          <Motion.button
            className="btn btn--primary"
            onClick={goToCatalog}
            whileHover={buttonHoverAnimation}
            whileTap={buttonTapAnimation}
            transition={buttonMotionTransition}
          >
            Pogledaj sve <ArrowRight size={16} />
          </Motion.button>
          <Motion.button
            className="btn btn--ghost wf-iconBtn wf-reset"
            onClick={handleReset}
            aria-label="Nova pitanja"
            title="Nova pitanja"
            whileHover={buttonHoverAnimation}
            whileTap={buttonTapAnimation}
            transition={buttonMotionTransition}
          >
            <RotateCcw size={18} />
          </Motion.button>
        </div>
      </div>

      {loading && <div className="wf-skeleton">Učitavanje predloga…</div>}

      {!loading && results.length === 0 && (
        <div className="wf-empty">
          <div className="wf-empty__text">Još uvek nema predloga — probaj druga pitanja.</div>
          <div className="wf-empty__actions">
            <Motion.button
              className="btn btn--ghost wf-iconBtn wf-reset"
              onClick={handleReset}
              aria-label="Pokreni ponovo"
              title="Pokreni ponovo"
              whileHover={buttonHoverAnimation}
              whileTap={buttonTapAnimation}
              transition={buttonMotionTransition}
            >
              <RotateCcw size={18} />
            </Motion.button>
            <Motion.button
              className="btn btn--primary"
              onClick={goToCatalog}
              whileHover={buttonHoverAnimation}
              whileTap={buttonTapAnimation}
              transition={buttonMotionTransition}
            >
              Pogledaj sve <ArrowRight size={14} />
            </Motion.button>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <Motion.div
          className="wf-results__grid"
          variants={resultsGridVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {results.map((p) => (
            <Motion.div
              variants={resultItemVariants}
              key={p.id}
              className="wf-card-mini"
              layout
              whileHover={cardHoverAnimation}
              transition={cardMotionTransition}
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
            </Motion.div>
          ))}
        </Motion.div>
      )}

      <div className="wf-results__cta">
        <Motion.button
          className="btn btn--primary"
          onClick={goToCatalog}
          whileHover={buttonHoverAnimation}
          whileTap={buttonTapAnimation}
          transition={buttonMotionTransition}
        >
          Pogledaj sve <ArrowRight size={16} />
        </Motion.button>
      </div>
    </>
  );

  return (
    <Motion.div
      className={rootClasses.join(' ').trim()}
      initial={rootInitial}
      animate={rootAnimate}
      transition={rootTransition}
    >
      <Motion.div className="wf-card" layout transition={cardMotionTransition}>
        {showPhoneIntroOnly ? (
          <Motion.div
            key="phone-intro"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={sectionTransition}
            className="wf-introSimple"
          >
            <p className="wf-intro__eyebrow">WATCH FINDER</p>
            <h2 className="wf-intro__title">Zbunjuje te previše izbora?</h2>
            <p className="wf-intro__copy">
              Odgovori na par kratkih pitanja i odmah dobijaš predloge koji su stvarno za tebe.
            </p>
            <Motion.button
              className="btn btn--primary"
              onClick={handleStart}
              whileHover={buttonHoverAnimation}
              whileTap={buttonTapAnimation}
              transition={buttonMotionTransition}
            >
              Pokreni pitanja <ArrowRight size={16} />
            </Motion.button>
          </Motion.div>
        ) : isSplit ? (
          <div className="wf-grid">
            <div className="wf-aside">
              <div>
                <p className="eyebrow">Watch Finder</p>
                <h2>{asideTitle}</h2>
                <p className="lede wf-aside__lede">{modeDescription}</p>
              </div>
              <div className="wf-aside__actions">
                <Motion.button
                  className="btn btn--ghost wf-iconBtn wf-reset"
                  onClick={handleReset}
                  aria-label="Resetuj kviz"
                  title="Resetuj kviz"
                  whileHover={buttonHoverAnimation}
                  whileTap={buttonTapAnimation}
                  transition={buttonMotionTransition}
                >
                  <RotateCcw size={18} />
                </Motion.button>
                <Motion.button
                  className="btn btn--primary"
                  onClick={goToCatalog}
                  whileHover={buttonHoverAnimation}
                  whileTap={buttonTapAnimation}
                  transition={buttonMotionTransition}
                >
                  Pogledaj sve <ArrowRight size={16} />
                </Motion.button>
              </div>
            </div>

            <Motion.div className="wf-pane" layout transition={cardMotionTransition}>
              <AnimatePresence mode="wait">
                {hasIntro && mode === 'intro' && (
                  <Motion.div
                    key="intro"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={sectionTransition}
                    className="wf-introSimple"
                  >
                    <p className="wf-intro__eyebrow">WATCH FINDER</p>
                    <h3 className="wf-intro__title">Zbunjuje te previše izbora?</h3>
                    <p className="wf-intro__copy">
                      Odgovori na par kratkih pitanja i odmah dobijaš preporuke po stilu, budžetu
                      i detaljima koje tražiš.
                    </p>
                    <Motion.button
                      className="btn btn--primary"
                      onClick={handleStart}
                      whileHover={buttonHoverAnimation}
                      whileTap={buttonTapAnimation}
                      transition={buttonMotionTransition}
                    >
                      Pokreni pitanja <ArrowRight size={16} />
                    </Motion.button>
                  </Motion.div>
                )}

                {mode === 'quiz' && (
                  <Motion.div
                    key={current.key}
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={sectionTransition}
                    className="wf-step wf-questionCard"
                  >
                    {!isDark && (
                      <div className="wf-step__head">
                        {isEditorial ? (
                          <div className="wf-step__topRow">
                            <button
                              className="wf-backInline"
                              aria-label="Nazad"
                              onClick={handlePrev}
                              disabled={!canGoBack}
                            >
                              <ArrowLeft size={22} />
                            </button>
                            <div className="wf-step__question">{current.title}</div>
                          </div>
                        ) : (
                          (isSplit || isEditorial) && (
                            <div className="wf-step__question">{current.title}</div>
                          )
                        )}
                        {isEditorial && (
                          <p className="wf-step__hint">
                            Odaberi opciju koja najbolje opisuje ono što tražiš. Sledeći korak se
                            otvara odmah nakon izbora.
                          </p>
                        )}
                      </div>
                    )}
                    <Motion.div
                      className="wf-options"
                      variants={optionsGridVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {current.options.map((opt) => {
                        const active = answers[current.key] === opt.value;
                        return (
                          <Motion.button
                            key={opt.value || opt.label}
                            variants={chipItemVariants}
                            transition={chipMotionTransition}
                            whileHover={chipHoverAnimation}
                            whileTap={chipTapAnimation}
                            className={`wf-chip ${active ? 'is-active' : ''}`}
                            onClick={() => handleSelect(current.key, opt.value)}
                          >
                            {opt.label}
                          </Motion.button>
                        );
                      })}
                    </Motion.div>
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

                    {!isEditorial && (
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
                    )}
                  </Motion.div>
                )}

                {mode === 'results' && (
                  <Motion.div
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
                      <Motion.button
                        className="btn btn--primary"
                        onClick={goToCatalog}
                        whileHover={buttonHoverAnimation}
                        whileTap={buttonTapAnimation}
                        transition={buttonMotionTransition}
                      >
                        Pogledaj sve <ArrowRight size={16} />
                      </Motion.button>
                      <Motion.button
                        className="btn btn--ghost wf-iconBtn wf-reset"
                        onClick={handleReset}
                        aria-label="Nova pitanja"
                        title="Nova pitanja"
                        whileHover={buttonHoverAnimation}
                        whileTap={buttonTapAnimation}
                        transition={buttonMotionTransition}
                      >
                        <RotateCcw size={18} />
                      </Motion.button>
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </Motion.div>
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
            </div>

            <div className="wf-body">
              <AnimatePresence mode="wait">
                {hasIntro && mode === 'intro' && (
                  <Motion.div
                    key="intro"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={sectionTransition}
                    className="wf-introSimple"
                  >
                    <p className="wf-intro__eyebrow">WATCH FINDER</p>
                    <h3 className="wf-intro__title">Zbunjuje te previše izbora?</h3>
                    <p className="wf-intro__copy">
                      Odgovori na par kratkih pitanja i odmah dobijaš preporuke po stilu, budžetu
                      i detaljima koje tražiš.
                    </p>
                    <Motion.button
                      className="btn btn--primary"
                      onClick={handleStart}
                      whileHover={buttonHoverAnimation}
                      whileTap={buttonTapAnimation}
                      transition={buttonMotionTransition}
                    >
                      Pokreni pitanja <ArrowRight size={16} />
                    </Motion.button>
                  </Motion.div>
                )}

                {mode === 'quiz' && (
                  <Motion.div
                    key={current.key}
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={sectionTransition}
                    className="wf-step wf-questionCard"
                  >
                    {!isDark && isEditorial && (
                      <div className="wf-step__head">
                        <div className="wf-step__topRow">
                          <button
                            className="wf-backInline"
                            aria-label="Nazad"
                            onClick={handlePrev}
                            disabled={!canGoBack}
                          >
                            <ArrowLeft size={22} />
                          </button>
                          <div className="wf-step__question">{current.title}</div>
                        </div>
                        {isEditorial && (
                          <p className="wf-step__hint">
                            Odaberi opciju koja najbolje opisuje ono što tražiš. Sledeći korak se
                            otvara odmah nakon izbora.
                          </p>
                        )}
                      </div>
                    )}
                    <Motion.div
                      className="wf-options"
                      variants={optionsGridVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {current.options.map((opt) => {
                        const active = answers[current.key] === opt.value;
                        return (
                          <Motion.button
                            key={opt.value || opt.label}
                            variants={chipItemVariants}
                            transition={chipMotionTransition}
                            whileHover={chipHoverAnimation}
                            whileTap={chipTapAnimation}
                            className={`wf-chip ${active ? 'is-active' : ''}`}
                            onClick={() => handleSelect(current.key, opt.value)}
                          >
                            {opt.label}
                          </Motion.button>
                        );
                      })}
                    </Motion.div>
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

                    {!isEditorial && (
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
                    )}
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
            {isDark && <div className="wf-illustration" aria-hidden="true" />}
          </div>
        )}

        {showEditorialNote && (
          <div className="wf-editorialNote wf-editorialNote--full">
            <div className="wf-editorialNote__lead">Treba ti pomoć?</div>
            <AnimatePresence mode="wait" initial={false}>
              <Motion.div
                key={editorialNoteMotionKey}
                className="wf-editorialNote__content"
                variants={noteContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={noteTransition}
              >
                <p className="wf-editorialNote__copy">{editorialNoteCopy}</p>
                <p className="wf-editorialNote__tip">{editorialNoteTip}</p>
              </Motion.div>
            </AnimatePresence>
          </div>
        )}

        {isEditorial && (
          <AnimatePresence>
            {mode === 'results' && (
              <Motion.div
                key="results-grid-editorial"
                className="wf-results wf-results--editorial wf-results--inline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={sectionTransition}
              >
                {resultsContent}
              </Motion.div>
            )}
          </AnimatePresence>
        )}
      </Motion.div>

      <AnimatePresence>
        {!isEditorial && mode === 'results' && (
          <Motion.div
            key="results-grid"
            className={`wf-results ${isDark ? 'wf-results--on-dark' : ''} ${
              isEditorial ? 'wf-results--editorial' : ''
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={sectionTransition}
          >
            {resultsContent}
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
