/**
 * @file src/components/HamburgerMenu.jsx
 * @description Hamburger Menu sa Admin Notifikacijama
 */
import React, {
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';

// --- FIREBASE IMPORTI ZA NOTIFIKACIJE ---
import { isAdminEmail, db } from '../services/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Ikonice
import {
  Phone,
  HelpCircle,
  Facebook,
  Instagram,
  MapPin,
  X,
  ShieldCheck,
  Package,
  Home,
  ShoppingBag,
  Info,
  Briefcase,
  User,
} from 'lucide-react';
import './HamburgerMenu.css';

const DROPDOWN_WIDTH = 220;

export default function HamburgerMenu({
  open,
  onClose,
  count = 0,
  user = null,
  anchorEl = null,
}) {
  const isDesktop = useIsDesktop();
  const loc = useLocation();
  const { showAuth } = useAuth();

  // --- STATE ZA NOTIFIKACIJE ---
  const [unreadOrders, setUnreadOrders] = useState(0);
  const isAdmin = user && isAdminEmail(user.email);

  // --- LISTENER ZA NEPROČITANE PORUDŽBINE ---
  useEffect(() => {
    if (!isAdmin) return;

    // Slušamo samo porudžbine koje nisu pročitane (isRead == false)
    const q = query(collection(db, 'orders'), where('isRead', '==', false));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadOrders(snapshot.size); // Ažuriramo broj
      },
      (error) => {
        console.error('Greška pri slušanju notifikacija:', error);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    isDesktop ? (
      <DesktopDropdown
        open={open}
        onClose={onClose}
        count={count}
        user={user}
        anchorEl={anchorEl}
        showAuth={showAuth}
        isAdmin={isAdmin}
        unreadOrders={unreadOrders} // <--- ŠALJEMO DOLE
      />
    ) : (
      <MobileSheet
        open={open}
        onClose={onClose}
        user={user}
        showAuth={showAuth}
        isAdmin={isAdmin}
        unreadOrders={unreadOrders} // <--- ŠALJEMO DOLE
      />
    ),
    document.body
  );
}

/* ----- hook: desktop detekcija ----- */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width:1024px)').matches
      : false
  );
  useEffect(() => {
    const m = window.matchMedia('(min-width:1024px)');
    const fn = () => setIsDesktop(m.matches);
    m.addEventListener?.('change', fn);
    return () => m.removeEventListener?.('change', fn);
  }, []);
  return isDesktop;
}

/* ----- DESKTOP: centriran dropdown ----- */
function DesktopDropdown({
  open,
  onClose,
  count,
  user,
  anchorEl,
  showAuth,
  isAdmin,
  unreadOrders,
}) {
  const ddRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const recalc = useCallback(() => {
    if (!anchorEl?.current) return;
    const r = anchorEl.current.getBoundingClientRect();
    const GAP = 8;
    const leftCentered = Math.round(r.left + r.width / 2 - DROPDOWN_WIDTH / 2);
    const clampedLeft = Math.max(
      8,
      Math.min(leftCentered, window.innerWidth - DROPDOWN_WIDTH - 8)
    );
    setPos({ top: Math.round(r.bottom + GAP), left: clampedLeft });
  }, [anchorEl]);

  useLayoutEffect(() => {
    if (!open) return;
    recalc();
    const onScroll = () => recalc();
    const onResize = () => recalc();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, recalc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const onDown = (e) => {
      if (!ddRef.current) return;
      const clickInDrop = ddRef.current.contains(e.target);
      const clickInBtn = anchorEl?.current?.contains(e.target);
      if (!clickInDrop && !clickInBtn) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose, anchorEl]);

  const variants = {
    hidden: { opacity: 0, scale: 0.96, y: -6 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.14 } },
    exit: { opacity: 0, scale: 0.98, y: -4, transition: { duration: 0.12 } },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ddRef}
          className="hm__dropdown card"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: DROPDOWN_WIDTH,
            zIndex: 90,
          }}
          role="menu"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
        >
          <nav className="hm__ddNav">
            <DDItem to="/about" label="O nama" onClose={onClose} />
            <DDItem to="/catalog" label="Prodavnica" onClose={onClose} />
            <DDItem to="/usluge" label="Usluge" onClose={onClose} />
            <DDItem to="/contact" label="Kontakt" onClose={onClose} />
            <DDItem to="/faq" label="Pomoć / FAQ" onClose={onClose} />

            {/* ADMIN SEKCIJA */}
            {isAdmin && (
              <>
                <div className="border-t border-white/10 my-1"></div>
                <DDItem
                  to="/admin"
                  label="Admin Dashboard"
                  onClose={onClose}
                  style={{ color: '#facc15' }}
                />

                {/* Link ka Porudžbinama sa brojačem */}
                <Link
                  to="/admin/orders"
                  className="hm__ddItem"
                  role="menuitem"
                  onClick={onClose}
                  style={{
                    color: '#facc15',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  Admin Porudžbine
                  {unreadOrders > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 shadow-sm">
                      {unreadOrders}
                    </span>
                  )}
                </Link>

                <div className="border-t border-white/10 my-1"></div>
              </>
            )}

            {user ? (
              <DDItem
                to="/account/profile"
                label="Moj nalog"
                onClose={onClose}
              />
            ) : (
              <button
                type="button"
                role="menuitem"
                className="hm__ddItem"
                onClick={() => {
                  showAuth('login');
                  onClose();
                }}
              >
                Prijava / Registracija
              </button>
            )}

            <DDItem
              to="/cart"
              label={`Korpa (${count})`}
              onClose={onClose}
              strong
            />
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DDItem({ to, label, strong, onClose, style }) {
  return (
    <Link
      to={to}
      className={`hm__ddItem${strong ? ' is-strong' : ''}`}
      role="menuitem"
      onClick={onClose}
      style={style}
    >
      {label}
    </Link>
  );
}

/* ----- MOBILE: slide-over panel ----- */
function MobileSheet({ open, onClose, user, showAuth, isAdmin, unreadOrders }) {
  const panelRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const { items, count } = useCart();

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = prev);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstFocusableRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const onBackdropClick = useCallback(
    (e) => {
      if (e.target.getAttribute('data-backdrop') === '1') onClose?.();
    },
    [onClose]
  );

  const backdrop = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.16 } },
  };
  const panel = {
    hidden: { x: '100%' },
    visible: {
      x: 0,
      transition: { type: 'spring', stiffness: 420, damping: 36 },
    },
    exit: { x: '100%', transition: { duration: 0.18 } },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="hm__backdrop"
          data-backdrop="1"
          role="presentation"
          onMouseDown={onBackdropClick}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdrop}
          style={{ zIndex: 9999 }}
        >
          <motion.aside
            id="hm-panel"
            ref={panelRef}
            className="hm__panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hm-title"
            variants={panel}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 120 || info.velocity.x > 800) onClose?.();
            }}
          >
            {/* HEADER */}
            <div className="hm__head">
              <h2 id="hm-title" className="hm__title">
                Meni
              </h2>
              <button
                ref={firstFocusableRef}
                className="hm__close"
                aria-label="Zatvori meni"
                onClick={onClose}
              >
                <X size={24} />
              </button>
            </div>

            {/* NAVIGACIJA */}
            <nav className="hm__nav">
              <Link className="hm__link" to="/" onClick={onClose}>
                <Home size={18} style={{ marginRight: 10 }} /> Početna
              </Link>
              <Link className="hm__link" to="/catalog" onClick={onClose}>
                <ShoppingBag size={18} style={{ marginRight: 10 }} /> Prodavnica
              </Link>
              <Link className="hm__link" to="/usluge" onClick={onClose}>
                <Briefcase size={18} style={{ marginRight: 10 }} /> Usluge
              </Link>
              <Link className="hm__link" to="/about" onClick={onClose}>
                <Info size={18} style={{ marginRight: 10 }} /> O nama
              </Link>

              {user ? (
                <>
                  <Link
                    className="hm__link"
                    to="/account/profile"
                    onClick={onClose}
                  >
                    <User size={18} style={{ marginRight: 10 }} /> Moj nalog
                  </Link>

                  {isAdmin && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <div className="text-xs font-bold text-neutral-500 uppercase px-4 mb-1">
                        Admin Zona
                      </div>

                      <Link
                        className="hm__link"
                        to="/admin"
                        onClick={onClose}
                        style={{ color: '#facc15' }}
                      >
                        <ShieldCheck size={18} style={{ marginRight: 10 }} />
                        Dashboard
                      </Link>

                      {/* MOBILE ADMIN PORUDŽBINE SA NOTIFIKACIJOM */}
                      <Link
                        className="hm__link"
                        to="/admin/orders"
                        onClick={onClose}
                        style={{
                          color: '#facc15',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div className="flex items-center">
                          <Package size={18} style={{ marginRight: 10 }} />
                          Porudžbine
                        </div>
                        {unreadOrders > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-4 shadow-sm">
                            {unreadOrders}
                          </span>
                        )}
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="hm__link"
                  onClick={() => {
                    showAuth('login');
                    onClose();
                  }}
                >
                  <User size={18} style={{ marginRight: 10 }} /> Prijava /
                  Registracija
                </button>
              )}

              <Link className="hm__link hm__cart" to="/cart" onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🛒</span>
                  <span>Korpa</span>
                </div>
                <span className="hm__badge">{count}</span>
              </Link>

              {/* Mini Cart Items */}
              {items.length > 0 && (
                <div className="hm__miniCart">
                  {items.map((item) => (
                    <div key={item.id} className="hm__miniItem">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="hm__miniImg"
                        loading="lazy"
                      />
                      <div className="hm__miniInfo">
                        <div className="hm__miniName">{item.name}</div>
                        <div className="hm__miniQty">{item.qty} kom.</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </nav>

            {/* FOOTER */}
            <div className="hm__footer">
              <div className="hm__f-info">
                <Link to="/contact" className="hm__f-btn" onClick={onClose}>
                  <Phone size={16} /> Kontakt
                </Link>
                <Link to="/faq" className="hm__f-btn" onClick={onClose}>
                  <HelpCircle size={16} /> Pomoć
                </Link>
                <Link to="/contact" className="hm__f-btn" onClick={onClose}>
                  <MapPin size={16} /> Lokacija
                </Link>
              </div>

              <div className="hm__f-bottom">
                <div className="hm__f-socials">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                  >
                    <Facebook size={18} />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram size={18} />
                  </a>
                </div>
                <div className="hm__f-copy">
                  Daja Shop © {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
