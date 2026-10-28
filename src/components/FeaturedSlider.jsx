import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../hooks/useCart.js";
import { useFlash } from "../hooks/useFlash.js"; // 👈 Import
import "./FeaturedSlider.css";


const FEATURED_CONFIG = [
  {
    id: "casio-mtp-1314pl-8a",
    brand: "CASIO",
    title: "CASIO Muški sat",
    model: "MTP-1314PL-8A",
    price: 22490,
    currency: "RSD",
    slug: "casio-mtp-1314pl-8a",
    image: "/images/MTP-1314PL-8AVEF.jpg",
    description:
      "Kratak opis proizvoda — istakni ključne karakteristike i stil.",
  },
  {
    id: "daniel-3271",
    brand: "DANIEL KLEIN",
    title: "Daniel 3271",
    model: "DQWE 16349",
    price: 24290,
    currency: "RSD",
    slug: "daniel-3271",
    image: "/images/thumb_13691.jpg",
    description: "Elegantna klasika za svaki dan — minimal i preciznost.",
  },
  {
    id: "qq-classic",
    brand: "Q&Q",
    title: "Q&Q Classic",
    model: "QW-12",
    price: 7290,
    currency: "RSD",
    slug: "qq-classic-qw12",
    image: "/images/QB64J202Y.jpg",
    description: "Pouzdan kvarc, čist dizajn i super vrednost.",
  },
];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 220 : -220, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({
    x: dir > 0 ? -220 : 220,
    opacity: 0,
    position: "absolute",
  }),
};

export default function FeaturedSlider({
  items = FEATURED_CONFIG,
  autoMs = 4500,
  imageFit = "contain",
}) {
  const { t: translateText, money } = useStorefront();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const { dispatch } = useCart?.() || { dispatch: null };
  const { flash } = useFlash(); // 👈 Hook
  const slideRef = useRef(null);

  const safeItems = useMemo(
    () => (items?.length ? items : FEATURED_CONFIG),
    [items]
  );
  const active = safeItems[index % safeItems.length];

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1 + safeItems.length) % safeItems.length);
    }, autoMs);
    return () => clearInterval(id);
  }, [index, paused, autoMs, safeItems.length]);

  function paginate(dir) {
    setDirection(dir);
    setIndex((i) => (i + dir + safeItems.length) % safeItems.length);
  }

  function onDragEnd(_, info) {
    const threshold = 80;
    if (info.offset.x < -threshold) paginate(1);
    else if (info.offset.x > threshold) paginate(-1);
  }

  const handleAdd = () => {
    dispatch({
      type: "ADD",
      item: {
        id: active.id,
        name: active.name || active.title, // fallback ako title koristimo kao name
        price: active.price,
        image: active.image,
        brand: active.brand,
        slug: active.slug,
      },
    });
    // ✅ Flash
    flash("Dodato u korpu", `${active.title} je u korpi.`, "cart");
  };

  return (
    <section
      className="relative mx-auto w-full px-4 sm:px-6 lg:px-8 py-8"
      aria-label={translateText("Izdvojeno")}
    >
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 mb-6">{translateText("Izdvojeno")}</h2>

      <div
        className="relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-2xl"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <button
          aria-label={translateText("Prethodno")}
          onClick={() => paginate(-1)}
          className="hidden md:grid place-items-center absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-black/10 shadow hover:bg-white/80 active:scale-95"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            className="-ml-0.5 opacity-70"
          >
            <path
              d="M15 6l-6 6 6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
        <button
          aria-label={translateText("Sledeće")}
          onClick={() => paginate(1)}
          className="hidden md:grid place-items-center absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-black/10 shadow hover:bg-white/80 active:scale-95"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            className="ml-0.5 opacity-70"
          >
            <path
              d="M9 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 p-6 md:p-4 md:px-20 md:items-center">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={`copy-${active.id}`}
              className="self-center md:space-y-4 space-y-1"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 0.9,
              }}
            >
              <h3 className="text-3xl md:text-5xl font-extrabold text-neutral-900">
                {translateText(active.title)}
              </h3>
              <p className="text-neutral-600 text-base md:text-lg leading-relaxed max-w-[52ch]">
                {translateText(active.description)}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-neutral-900">
                <span className="uppercase tracking-widest text-xs font-semibold text-neutral-500">{translateText("MODEL ")}{translateText(active.model)}
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">
                {money(active.price)}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to={`/product/${active.slug}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#9b9b9bff] px-5 text-white font-semibold shadow hover:opacity-70 active:scale-95 transition-all duration-200 ease-in"
                >{translateText("Detalji")}</Link>
                <button
                  onClick={handleAdd} // 👈 Ažurirano
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 font-semibold text-neutral-900 ring-1 ring-black/10 shadow hover:bg-white/90 active:scale-95"
                >{translateText("Dodaj")}</button>
              </div>
            </motion.div>

            <motion.div
              key={`img-${active.id}`}
              className="relative grid place-items-center h-[min(64vh,560px)] sm:h-[min(66vh,600px)] md:h-[min(68vh,640px)]"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 30,
                mass: 0.85,
              }}
            >
              <motion.div
                ref={slideRef}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={onDragEnd}
                className="relative grid place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-inner w-full max-w-[520px] sm:max-w-[560px] md:max-w-[620px] h-full"
                whileTap={{ cursor: "grabbing" }}
              >
                <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/40 via-transparent to-white/60" />
                <img
                  src={active.image}
                  alt={translateText(`${active.brand} ${active.model}`)}
                  className={`absolute inset-0 w-full h-full ${
                    imageFit === "contain"
                      ? "object-contain p-2 md:p-4"
                      : "object-cover"
                  }`}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 pb-5">
          {safeItems.map((_, i) => (
            <button
              key={i}
              aria-label={translateText(`Idi na slajd ${i + 1}`)}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-neutral-900" : "w-2 bg-neutral-900/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
