import { useStorefront } from '../localization/StorefrontContext.jsx';
// ==============================
// File: src/components/TrustBar.jsx
// Tailwind + lucide-react (desktop + dedicated mobile variants)
// ==============================
import React from 'react';
import { CheckCircle2, Shield, RotateCcw, Headset } from 'lucide-react';

/**
 * Možeš menjati stavke preko props.items ako želiš drugi sadržaj.
 */
const DEFAULT_ITEMS = [
  {
    icon: CheckCircle2,
    title: 'Original proizvodi',
    desc: 'Garancija autentičnosti',
  },
  {
    icon: Shield,
    title: 'Garancija 24 meseca',
    desc: 'Na mehanizam i bateriju',
  },
  { icon: RotateCcw, title: '14 dana povraćaj', desc: 'Bez suvišnih pitanja' },
  { icon: Headset, title: 'Podrška', desc: 'Tu smo za vas' },
];

/**
 * Props:
 * - items: [{ icon: LucideIcon, title: string, desc?: string }]
 * - variant: 'glass' | 'surface' | 'minimal'   (desktop panel stil)
 * - mobileVariant: 'scroll' | 'cards' | 'compact'
 * - stickyMobile: boolean (ako true, mobilna verzija je fiksirana pri dnu)
 * - className: dodatne klase za <section>
 */
export default function TrustBar({
  items = DEFAULT_ITEMS,
  variant = 'glass',
  mobileVariant = 'scroll',
  stickyMobile = false,
  className = '',
}) {
  const { t: translateText } = useStorefront();

  const panelBase = 'relative rounded-2xl ring-1 shadow-glass';
  const panelVariants = {
    glass: 'bg-white/70 backdrop-blur-xl ring-white/50',
    surface: 'bg-surface text-text ring-accent/20',
    minimal: 'bg-transparent ring-accent/10',
  };

  const DesktopPanel = (
    <div className={`${panelBase} ${panelVariants[variant]}`}>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 md:p-4">
        {/* eslint-disable-next-line no-unused-vars */}
        {items.map(({ icon: Icon, title, desc }, i) => (
          <li
            key={i}
            className="group flex items-center gap-3 sm:gap-4 rounded-xl p-3 sm:p-4 bg-[color-mix(in_oklab,var(--color-surface)_86%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-surface)_96%,transparent)] transition"
          >
            <span className="relative grid place-items-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--color-primary)_28%,transparent)]">
              <Icon
                className="h-5 w-5 sm:h-6 sm:w-6 text-primary"
                strokeWidth={2.2}
              />
            </span>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold text-text leading-tight truncate">
                {translateText(title)}
              </div>
              {desc && (
                <div className="text-xs sm:text-sm text-muted truncate">
                  {translateText(desc)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const MobileScroll = (
    <div
      className={`${panelBase} ${panelVariants[variant]} ${
        stickyMobile ? 'fixed left-3 right-3' : ''
      }`}
      style={
        stickyMobile
          ? { bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 60 }
          : undefined
      }
    >
      <ul className="flex gap-2 p-2 overflow-x-auto snap-x snap-mandatory">
        {/* eslint-disable-next-line no-unused-vars */}
        {items.map(({ icon: Icon, title, desc }, i) => (
          <li
            key={i}
            className="snap-start min-w-[230px] max-w-[260px] flex items-center gap-3 rounded-xl p-3 bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] ring-1 ring-accent/10"
          >
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--color-primary)_28%,transparent)]">
              <Icon className="h-5 w-5 text-primary" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text leading-tight line-clamp-1">
                {translateText(title)}
              </div>
              {desc && (
                <div className="text-xs text-muted line-clamp-1">{translateText(desc)}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const MobileCards = (
    <div
      className={`${panelBase} ${panelVariants[variant]} ${
        stickyMobile ? 'fixed left-3 right-3' : ''
      }`}
      style={
        stickyMobile
          ? { bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 60 }
          : undefined
      }
    >
      <ul className="grid grid-cols-2 gap-2 p-2">
        {/* eslint-disable-next-line no-unused-vars */}
        {items.map(({ icon: Icon, title, desc }, i) => (
          <li
            key={i}
            className="rounded-xl p-3 ring-1 ring-accent/10 bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)]"
          >
            <div className="flex flex-col items-start gap-2">
              <span className="grid place-items-center h-9 w-9 rounded-lg bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--color-primary)_28%,transparent)]">
                <Icon className="h-5 w-5 text-primary" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text leading-tight">
                  {translateText(title)}
                </div>
                {desc && <div className="text-xs text-muted">{translateText(desc)}</div>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const MobileCompact = (
    <div
      className={`${panelBase} ${panelVariants[variant]} ${
        stickyMobile ? 'fixed left-3 right-3' : ''
      }`}
      style={
        stickyMobile
          ? { bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 60 }
          : undefined
      }
    >
      <ul className="grid grid-cols-1 gap-1 p-2">
        {/* eslint-disable-next-line no-unused-vars */}
        {items.map(({ icon: Icon, title }, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <Icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
            <span className="text-sm text-text">{translateText(title)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderMobile = () => {
    switch (mobileVariant) {
      case 'cards':
        return MobileCards;
      case 'compact':
        return MobileCompact;
      case 'scroll':
      default:
        return MobileScroll;
    }
  };

  return (
    <section
      className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}
      aria-label={translateText("Trust bar")}
    >
      {/* Desktop (>= md) */}
      <div className="hidden md:block">{translateText(DesktopPanel)}</div>
      {/* Mobile (< md) */}
      <div className="md:hidden">{translateText(renderMobile())}</div>
    </section>
  );
}

/*
USAGE:
------
1) Install icons:  npm i lucide-react
2) Import and place:
   import TrustBar from "../components/TrustBar.jsx";

   // default mobile: horizontal scroll chips
   <TrustBar variant="glass" mobileVariant="scroll" />

   // alternative: card grid on mobile
   <TrustBar variant="surface" mobileVariant="cards" />

   // ultra-compact list on mobile
   <TrustBar variant="glass" mobileVariant="compact" />

   // sticky mobile bar at the bottom
   <TrustBar variant="glass" mobileVariant="scroll" stickyMobile />

Napomena:
- Boje se vuku iz CSS varijabli (theme.css). 
- Mobile varijanta je potpuno odvojena od desktop prikaza i menja se po breakpointu.
*/
