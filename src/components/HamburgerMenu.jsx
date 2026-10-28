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
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';

import { isAdminEmail, ordersApi, subscribeRealtime } from '../services/dajaPlatform.js';
import { getStaffAccessToken } from '../services/apiClient.js';
import SocialLinks from './SocialLinks.jsx';
import HeaderDropdown from './ui/HeaderDropdown.jsx';

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

            {/* NAVIGACIJA */}
            <nav className="hm__nav">
              <Link className="hm__link" to="/" onClick={onClose}>
                <Home size={18} style={{ marginRight: 10 }} />{translateText(" Početna")}</Link>
              <Link className="hm__link" to="/catalog" onClick={onClose}>
                <ShoppingBag size={18} style={{ marginRight: 10 }} />{translateText(" Prodavnica")}</Link>
              <Link className="hm__link" to="/usluge" onClick={onClose}>
                <Briefcase size={18} style={{ marginRight: 10 }} />{translateText(" Usluge")}</Link>
              <Link className="hm__link" to="/about" onClick={onClose}>
                <Info size={18} style={{ marginRight: 10 }} />{translateText(" O nama")}</Link>

              {user ? (
                <>
                  <Link
                    className="hm__link"
                    to="/account/profile"
                    onClick={onClose}
                  >
                    <User size={18} style={{ marginRight: 10 }} />{translateText(" Moj nalog")}</Link>
                  <button
                    type="button"
                    className="hm__link hm__logout"
                    onClick={() => {
                      onClose();
                      void logout();
                    }}
                  >
                    <LogOut size={18} style={{ marginRight: 10 }} />{translateText(" Odjavi me")}</button>

                  {isAdmin && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <div className="text-xs font-bold text-neutral-500 uppercase px-4 mb-1">{translateText("Admin Zona")}</div>

                      <Link
                        className="hm__link"
                        to="/admin"
                        onClick={onClose}
                        style={{ color: '#facc15' }}
                      >
                        <ShieldCheck size={18} style={{ marginRight: 10 }} />{translateText("Dashboard")}</Link>

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
                          <Package size={18} style={{ marginRight: 10 }} />{translateText("Porudžbine")}</div>
                        {unreadOrders > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-4 shadow-sm">
                            {translateText(unreadOrders)}
                          </span>
                        )}
                      </Link>
                    </div>
                  )}
                  {isStaff && !isAdmin && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <div className="text-xs font-bold text-neutral-500 uppercase px-4 mb-1">{translateText("Katalog")}</div>
                      <Link className="hm__link" to="/admin" onClick={onClose} style={{ color: '#0f9f78' }}>
                        <Package size={18} style={{ marginRight: 10 }} />{translateText(" Katalog proizvoda")}</Link>
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
                  <User size={18} style={{ marginRight: 10 }} />{translateText(" Prijava / Registracija")}</button>
              )}

              <Link className="hm__link hm__cart" to="/cart" onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🛒</span>
                  <span>{translateText("Korpa")}</span>
                </div>
                <span className="hm__badge">{translateText(count)}</span>
              </Link>

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
            </nav>

            {/* FOOTER */}
            <div className="hm__footer">
              <div className="hm__f-info">
                <Link to="/contact" className="hm__f-btn" onClick={onClose}>
                  <Phone size={16} />{translateText(" Kontakt")}</Link>
                <Link to="/faq" className="hm__f-btn" onClick={onClose}>
                  <HelpCircle size={16} />{translateText(" Pomoć")}</Link>
                <Link to="/contact" className="hm__f-btn" onClick={onClose}>
                  <MapPin size={16} />{translateText(" Lokacija")}</Link>
              </div>

              <div className="hm__f-bottom">
                <SocialLinks className="hm__f-socials" size={18} />
                <div className="hm__f-copy">{translateText("Daja Shop © ")}{translateText(new Date().getFullYear())}
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
