import { useStorefront } from '../localization/StorefrontContext.jsx';
import { brandUrl, brandChoiceUrl, urlSlug, isBrandPath } from '../utils/catalogUrls.js';
import { useEffect, useState, useRef } from 'react';
import './Navbar.css';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const navSatovi = [
  {
    label: 'DANIEL KLEIN',
    children: [{ label: 'MUŠKI' }, { label: 'ŽENSKI' }],
  },
  {
    label: 'CASIO',
    children: [
      { label: 'G-SHOCK' },
      { label: 'BABY-G' },
      { label: 'EDIFICE' },
      { label: 'RETRO' },
    ],
  },
  {
    label: 'ORIENT',
    children: [{ label: '200m DIVERS' }, { label: 'ŽENSKI' }],
  },
  { label: 'ORIENT STAR', children: [{ label: 'MUŠKI' }, { label: 'ŽENSKI' }] },
  { label: 'Q&Q', children: [{ label: 'MUŠKI' }, { label: 'ŽENSKI' }] },
];

export default function NavBar() {
  const { t: translateText } = useStorefront();

  const [isMobile, setIsMobile] = useState(false);
  // Otvoren brend ili brzi izbor svih modela na telefonu.
  const [openIdx, setOpenIdx] = useState(null);
  const [otherDismissed, setOtherDismissed] = useState(false);


  const rowRef = useRef(null);
  const location = useLocation();
  const NavLabel = isMobile ? 'button' : Link;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!isMobile) setOpenIdx(null);
  }, [isMobile]);

  const handleGroupClick = (index) => {
    if (isMobile) {
      setOpenIdx((prev) => (prev === index ? null : index));
    }
  };

  const handleAllModelsClick = () => {
    if (isMobile) {
      setOpenIdx((prev) => (prev === 'all-models' ? null : 'all-models'));
    }
  };

  const closeOtherMenu = () => {
    setOpenIdx(null);
    setOtherDismissed(true);
  };

  const selectedBrand = new URLSearchParams(location.search)
    .get('brand')
    ?.trim()
    .toUpperCase() || (isBrandPath(location.pathname) ? decodeURIComponent(location.pathname.split('/')[2]) : '');
  const isActive = (path) =>
    location.pathname === path && !selectedBrand
      ? 'navbar__all active'
      : 'navbar__all';
  const isBrandActive = (label) =>
    (location.pathname === '/catalog' || isBrandPath(location.pathname)) && selectedBrand && urlSlug(selectedBrand) === urlSlug(label);

  return (
    <nav className="navbar" aria-label={translateText("Glavna navigacija")}>
      <div className="container navbar__wrap">
        <div className="navbar__row" ref={rowRef}>
          {/* Svi modeli: isti padajući meni kao brendovi, sa brzim izborom pola. */}
          <div
            className="navbar__group"
            data-open={isMobile && openIdx === 'all-models' ? 'true' : 'false'}
          >
            <NavLabel
              {...(isMobile ? { type: 'button' } : { to: '/catalog' })}
              className={`${isActive('/catalog')} navbar__label ${isMobile ? 'navbar__chip' : ''}`}
              onClick={handleAllModelsClick}
            >{translateText("SVI MODELI")}{isMobile && (
                <ChevronDown
                  size={14}
                  style={{
                    marginLeft: 4,
                    opacity: 0.6,
                    transform: openIdx === 'all-models' ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              )}
            </NavLabel>
            <div className="navbar__dropdown card">
              <Link to="/catalog" style={{ fontWeight: 'bold' }}>{translateText("Svi modeli")}</Link>
              <Link to="/muski-satovi">{translateText("MUŠKI")}</Link>
              <Link to="/zenski-satovi">{translateText("ŽENSKI")}</Link>
            </div>
          </div>

          {/* Brendovi Satova */}
          {navSatovi.map((g, i) => (
            <div
              key={g.label}
              className="navbar__group"
              data-open={isMobile && openIdx === i ? 'true' : 'false'}
            >
              <NavLabel
                {...(isMobile ? { type: 'button' } : { to: brandUrl(g.label) })}
                className={`navbar__label ${isMobile ? 'navbar__chip' : ''} ${
                  isBrandActive(g.label) ? 'active' : ''
                }`}
                onClick={() => handleGroupClick(i)}
              >
                {translateText(g.label)}
                {/* Chevron samo na mobilnom da sugeriše dropdown */}
                {isMobile && (
                  <ChevronDown
                    size={14}
                    style={{
                      marginLeft: 4,
                      opacity: 0.6,
                      transform:
                        openIdx === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                )}
              </NavLabel>

              {/* Desktop Dropdown (Samo na hover) */}
              <div className="navbar__dropdown card">
                <Link
                  to={brandUrl(g.label)}
                  style={{ fontWeight: 'bold' }}
                >{translateText("Svi ")}{translateText(g.label)}
                </Link>
                {g.children.map((c) => (
                  <Link
                    key={c.label}
                    to={brandChoiceUrl(g.label, c.label)}
                  >
                    {translateText(c.label)}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="navbar__group"
            data-dismissed={otherDismissed ? 'true' : undefined}
            onPointerEnter={() => setOtherDismissed(false)}
            onFocusCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOtherDismissed(false);
            }}
          >
            <Link to="/ostalo" className={`navbar__label ${isMobile ? 'navbar__chip' : ''}`} onClick={closeOtherMenu}>{translateText("Ostalo")}</Link>
            <div className="navbar__dropdown card">
              <Link to="/naocare" onClick={closeOtherMenu}>{translateText("Naočare za sunce")}</Link>
              <Link to="/daljinski" onClick={closeOtherMenu}>{translateText("Daljinski")}</Link>
              <Link to="/baterije" onClick={closeOtherMenu}>{translateText("Baterije")}</Link>
            </div>
          </div>
        </div>

        {/* --- MOBILNI SUB-MENI (ZA SVE) --- */}
        {isMobile && openIdx !== null && (
          <div className="navbar__sub">
            <div className="navbar__subrow">
              {/* Brzi izbor svih modela ili podmeni izabranog brenda. */}
              {translateText(openIdx === 'all-models' ? (
                <>
                  <Link
                    className="navbar__pill"
                    to="/catalog"
                    onClick={() => setOpenIdx(null)}
                    style={{
                      fontWeight: 'bold',
                      background: 'var(--color-text)',
                      color: 'var(--color-bg)',
                    }}
                  >{translateText("Svi modeli")}</Link>
                  <Link className="navbar__pill" to="/muski-satovi" onClick={() => setOpenIdx(null)}>{translateText("MUŠKI")}</Link>
                  <Link className="navbar__pill" to="/zenski-satovi" onClick={() => setOpenIdx(null)}>{translateText("ŽENSKI")}</Link>
                </>
              ) : (
                /* SCENARIO 2: OTVOREN JE NEKI BREND (Broj) */
                typeof openIdx === 'number' && (
                  <>
                    <Link
                      className="navbar__pill"
                      to={brandUrl(navSatovi[openIdx].label)}
                      onClick={() => setOpenIdx(null)}
                      style={{
                        fontWeight: 'bold',
                        background: 'var(--color-text)',
                        color: 'var(--color-bg)',
                      }}
                    >{translateText("Svi ")}{translateText(navSatovi[openIdx].label)}
                    </Link>
                    {navSatovi[openIdx].children.map((c) => (
                      <Link
                        key={c.label}
                        className="navbar__pill"
                        to={brandChoiceUrl(navSatovi[openIdx].label, c.label)}
                        onClick={() => setOpenIdx(null)}
                      >
                        {translateText(c.label)}
                      </Link>
                    ))}
                  </>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
