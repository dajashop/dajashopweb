import { useStorefront } from '../localization/StorefrontContext.jsx';
/**
 * @file src/components/HamburgerMenu.jsx
 * @description Hamburger Menu sa Admin Notifikacijama
 */
import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';

import { isAdminEmail, ordersApi, subscribeRealtime } from '../services/dajaPlatform.js';
import { getStaffAccessToken } from '../services/apiClient.js';
import SocialLinks from './SocialLinks.jsx';
import HeaderDropdown from './ui/HeaderDropdown.jsx';
import MobileStorefrontPreferences from '../localization/MobileStorefrontPreferences.jsx';

// Ikonice
import {
  Phone,
  HelpCircle,
  MapPin,
  X,
  ShieldCheck,
  Package,
  Home,
  ShoppingBag,
  Info,
  Briefcase,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import './HamburgerMenu.css';

const MENU_ICONS = {
  '/about': Info, '/catalog': ShoppingBag, '/usluge': Briefcase,
  '/contact': Phone, '/faq': HelpCircle, '/admin': ShieldCheck,
  '/account/profile': User, '/cart': ShoppingBag,
};

export default function HamburgerMenu({
  open,
  onClose,
  count = 0,
  user = null,
  staffReady = false,
  anchorEl = null,
  onUnreadOrdersChange,
}) {
  const isDesktop = useIsDesktop();
  const [portalReady, setPortalReady] = useState(false);
  const loc = useLocation();
  const { showAuth, logout } = useAuth();

  // --- STATE ZA NOTIFIKACIJE ---
  const [unreadOrders, setUnreadOrders] = useState(0);
  const isAdmin = user && isAdminEmail(user.email);

  // Match the server's first render, then keep the portal mounted so
  // AnimatePresence can finish the menu's closing animation.
  useEffect(() => setPortalReady(true), []);

  // --- LISTENER ZA NEPROCITANE PORUDZBINE ---
  useEffect(() => {
    if (!isAdmin) {
      setUnreadOrders(0);
      onUnreadOrdersChange?.(0);
      return;
    }

    let cancelled = false;
    const refreshUnread = () => {
      // The staff session is created immediately after customer login. Until
      // then there is nothing to load, and using a customer token here causes
      // a misleading 401 in the browser console.
      if (!getStaffAccessToken()) return;
      ordersApi
        .adminList()
        .then((orders) => {
          if (!cancelled) {
            const nextUnreadOrders = orders.filter((order) => !order.isRead).length;
            setUnreadOrders(nextUnreadOrders);
            onUnreadOrdersChange?.(nextUnreadOrders);
          }
        })
        .catch((error) => {
          console.error('Greska pri slusanju notifikacija:', error);
        });
    };

    refreshUnread();
    const unsubscribe = subscribeRealtime(
      ['orders.created', 'orders.updated'],
      refreshUnread,
    );

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isAdmin, onUnreadOrdersChange]);

  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  if (!portalReady || typeof document === 'undefined') return null;

  return isDesktop ? (
      <DesktopDropdown
        open={open}
        onClose={onClose}
        count={count}
        user={user}
        anchorEl={anchorEl}
        showAuth={showAuth}
        logout={logout}
        isAdmin={isAdmin}
        isStaff={staffReady}
        unreadOrders={unreadOrders} // <--- ŠALJEMO DOLE
      />
    ) : createPortal(
      <MobileSheet
        open={open}
        onClose={onClose}
        user={user}
        showAuth={showAuth}
        logout={logout}
        isAdmin={isAdmin}
        isStaff={staffReady}
        unreadOrders={unreadOrders} // <--- ŠALJEMO DOLE
      />,
    document.body
  );
}

/* ----- hook: desktop detekcija ----- */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(min-width:1024px)');
    const fn = () => setIsDesktop(m.matches);
    fn();
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
  logout,
  isAdmin,
  isStaff,
  unreadOrders,
}) {
  const { t: translateText } = useStorefront();
  const { pathname } = useLocation();

  const ddRef = useRef(null);

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

  return (
    <HeaderDropdown open={open} anchorRef={anchorEl} panelRef={ddRef} id="hm-panel" label={translateText('Meni')}>
          <nav className="header-dropdown__items">
            <DDItem to="/about" label={translateText("O nama")} onClose={onClose} />
            <DDItem to="/catalog" label={translateText("Prodavnica")} onClose={onClose} />
            <DDItem to="/usluge" label={translateText("Usluge")} onClose={onClose} />
            <DDItem to="/contact" label={translateText("Kontakt")} onClose={onClose} />
            <DDItem to="/faq" label={translateText("Pomoć / FAQ")} onClose={onClose} />

            {/* ADMIN SEKCIJA */}
            {isAdmin && (
              <>
                <div className="header-dropdown__separator" role="separator" />
                <DDItem
                  to="/admin"
                  label={translateText("Admin Dashboard")}
                  onClose={onClose}
                />

                {/* Link ka Porudžbinama sa brojačem */}
                <Link
                  to="/admin/orders"
                  className="header-dropdown__item hm__ddItem"
                  role="menuitem"
                  aria-current={pathname === '/admin/orders' ? 'page' : undefined}
                  onClick={onClose}
                ><Package className="header-dropdown__icon" size={18} strokeWidth={1.7} aria-hidden="true" />
                  <span className="header-dropdown__label">{translateText("Admin Porudžbine")}</span>{unreadOrders > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 shadow-sm">
                      {translateText(unreadOrders)}
                    </span>
                  )}
                  <ChevronRight className="header-dropdown__chevron" size={14} aria-hidden="true" />
                </Link>

                <div className="header-dropdown__separator" role="separator" />
              </>
            )}

            {isStaff && !isAdmin && (
              <>
                <div className="header-dropdown__separator" role="separator" />
                <DDItem to="/admin" label={translateText("Katalog proizvoda")} onClose={onClose} />
              </>
            )}

            {user ? (
              <>
                <DDItem
                  to="/account/profile"
                  label={translateText("Moj nalog")}
                  onClose={onClose}
                />
                <button
                  type="button"
                  role="menuitem"
                  className="header-dropdown__item hm__ddItem hm__logout"
                  onClick={() => {
                    onClose();
                    void logout();
                  }}
                >
                  <LogOut className="header-dropdown__icon" size={18} strokeWidth={1.7} aria-hidden="true" /><span className="header-dropdown__label">{translateText("Odjavi me")}</span></button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="header-dropdown__item hm__ddItem"
                onClick={() => {
                  showAuth('login');
                  onClose();
                }}
              ><User className="header-dropdown__icon" size={18} strokeWidth={1.7} aria-hidden="true" /><span className="header-dropdown__label">{translateText("Prijava / Registracija")}</span></button>
            )}

            <DDItem
              to="/cart"
              label={translateText(`Korpa (${count})`)}
              onClose={onClose}
              strong
            />
          </nav>
    </HeaderDropdown>
  );
}

function DDItem({ to, label, strong, onClose, style }) {
  const { t: translateText } = useStorefront();
  const { pathname } = useLocation();
  const Icon = MENU_ICONS[to] || Info;

  return (
    <Link
      to={to}
      className={`header-dropdown__item hm__ddItem${strong ? ' is-strong' : ''}`}
      role="menuitem"
      aria-current={pathname === to ? 'page' : undefined}
      onClick={onClose}
      style={style}
    >
      <Icon className="header-dropdown__icon" size={18} strokeWidth={1.7} aria-hidden="true" />
      <span className="header-dropdown__label">{translateText(label)}</span>
      <ChevronRight className="header-dropdown__chevron" size={14} aria-hidden="true" />
    </Link>
  );
}

/* ----- MOBILE: slide-over panel ----- */
function MobileSheet({ open, onClose, user, showAuth, logout, isAdmin, isStaff, unreadOrders }) {
  const { t: translateText } = useStorefront();
  const reduceMotion = useReducedMotion();

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
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      if (e.key !== 'Tab') return;
      const focusable = [...(panelRef.current?.querySelectorAll('a[href], button:not(:disabled), summary, [tabindex="0"]') || [])]
        .filter(element => element.getClientRects().length && !element.closest('details:not([open]) > :not(summary)'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const t = setTimeout(() => firstFocusableRef.current?.focus(), 60);
    return () => {
      clearTimeout(t);
      if (panelRef.current?.contains(document.activeElement) && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  const onBackdropClick = useCallback(
    (e) => {
      if (e.target.getAttribute('data-backdrop') === '1') onClose?.();
    },
    [onClose]
  );

  const backdrop = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: reduceMotion ? 0 : 0.18 } },
    exit: { opacity: 0, transition: { duration: reduceMotion ? 0 : 0.16 } },
  };
  const panel = {
    hidden: { x: reduceMotion ? 0 : '100%' },
    visible: {
      x: 0,
      transition: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 },
    },
    exit: { x: reduceMotion ? 0 : '100%', transition: { duration: reduceMotion ? 0 : 0.18 } },
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
              <h2 id="hm-title" className="hm__title">{translateText("Meni")}</h2>
              <button
                ref={firstFocusableRef}
                className="hm__close"
                aria-label={translateText("Zatvori meni")}
                onClick={onClose}
              >
                <X size={24} />
              </button>
            </div>

            <div className="hm__body">
            <MobileStorefrontPreferences />

            {/* NAVIGACIJA */}
            <nav className="hm__nav" aria-label={translateText('Meni')}>
              <div className="hm__navGroup">
                <MobileMenuLink to="/" icon={Home} label={translateText('Početna')} onClose={onClose} />
                <MobileMenuLink to="/catalog" icon={ShoppingBag} label={translateText('Prodavnica')} onClose={onClose} />
                <MobileMenuLink to="/usluge" icon={Briefcase} label={translateText('Usluge')} onClose={onClose} />
                <MobileMenuLink to="/about" icon={Info} label={translateText('O nama')} onClose={onClose} />
              </div>

              <div className="hm__navGroup">
              {user ? (
                <>
                  <MobileMenuLink to="/account/profile" icon={User} label={translateText('Moj nalog')} onClose={onClose} />
                  <button
                    type="button"
                    className="hm__link hm__logout"
                    onClick={() => {
                      onClose();
                      void logout();
                    }}
                  >
                    <LogOut className="hm__icon" size={20} strokeWidth={1.7} aria-hidden="true" />
                    <span className="hm__label">{translateText('Odjavi me')}</span>
                  </button>

                  {isAdmin && (
                    <div className="hm__staffGroup">
                      <p className="hm__groupTitle">{translateText('Admin Zona')}</p>
                      <MobileMenuLink to="/admin" icon={ShieldCheck} label={translateText('Admin Dashboard')} onClose={onClose} />
                      <MobileMenuLink to="/admin/orders" icon={Package} label={translateText('Porudžbine')} onClose={onClose}>
                        {unreadOrders > 0 && (
                          <span className="hm__orderBadge">
                            {translateText(unreadOrders)}
                          </span>
                        )}
                      </MobileMenuLink>
                    </div>
                  )}
                  {isStaff && !isAdmin && (
                    <div className="hm__staffGroup">
                      <p className="hm__groupTitle">{translateText('Katalog')}</p>
                      <MobileMenuLink to="/admin" icon={Package} label={translateText('Katalog proizvoda')} onClose={onClose} />
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
                  <User className="hm__icon" size={20} strokeWidth={1.7} aria-hidden="true" />
                  <span className="hm__label">{translateText('Prijava / Registracija')}</span>
                  <ChevronRight className="hm__arrow" size={16} aria-hidden="true" />
                </button>
              )}

              <MobileMenuLink className="hm__cart" to="/cart" icon={ShoppingBag} label={translateText('Korpa')} onClose={onClose}>
                <span className="hm__badge">{translateText(count)}</span>
              </MobileMenuLink>

              {/* Mini Cart Items */}
              {items.length > 0 && (
                <div className="hm__miniCart">
                  {items.map((item) => (
                    <div key={item.id} className="hm__miniItem">
                      <img
                        src={item.image}
                        alt={translateText(item.name)}
                        className="hm__miniImg"
                        loading="lazy"
                      />
                      <div className="hm__miniInfo">
                        <div className="hm__miniName">{translateText(item.name)}</div>
                        <div className="hm__miniQty">{translateText(item.qty)}{translateText(" kom.")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </nav>

            {/* FOOTER */}
            <div className="hm__footer">
              <div className="hm__f-info">
                <Link to="/contact" className="hm__f-btn" onClick={onClose}>
                  <Phone size={18} strokeWidth={1.7} aria-hidden="true" />{translateText('Kontakt')}</Link>
                <Link to="/faq" className="hm__f-btn" onClick={onClose}>
                  <HelpCircle size={18} strokeWidth={1.7} aria-hidden="true" />{translateText('Pomoć')}</Link>
                <Link to="/contact" className="hm__f-btn" onClick={onClose}>
                  <MapPin size={18} strokeWidth={1.7} aria-hidden="true" />{translateText('Lokacija')}</Link>
              </div>

              <div className="hm__f-bottom">
                <SocialLinks className="hm__f-socials" size={18} />
                <div className="hm__f-copy">{translateText("Daja Shop © ")}{translateText(new Date().getFullYear())}
                </div>
              </div>
            </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileMenuLink({ to, icon: Icon, label, onClose, className = '', children }) {
  const { pathname } = useLocation();
  return <Link to={to} className={`hm__link ${className}`} onClick={onClose}
    aria-current={pathname === to ? 'page' : undefined}>
    <Icon className="hm__icon" size={20} strokeWidth={1.7} aria-hidden="true" />
    <span className="hm__label">{label}</span>
    {children}
    <ChevronRight className="hm__arrow" size={16} aria-hidden="true" />
  </Link>;
}
