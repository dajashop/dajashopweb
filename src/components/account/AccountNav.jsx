import { useStorefront } from '../../localization/StorefrontContext.jsx';
// src/components/account/AccountNav.jsx

import { useEffect, useId, useRef, useState } from 'react';
import './AccountNav.css';
import { Link } from 'react-router-dom';
import {
  LogOut,
  User,
  MapPin,
  Package,
  Heart,
  ChevronDown,
  Check,
  ShieldCheck,
  Cookie,
} from 'lucide-react';

// --- NAVIGATION ---
function AccountNav({ activeTab, logout }) {
  const { t: translateText } = useStorefront();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const dismiss = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMobileOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileOpen]);

  const navItems = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'orders', label: 'Porudžbine', icon: Package },
    { id: 'security', label: 'Bezbednost', icon: ShieldCheck },
    { id: 'addresses', label: 'Adrese', icon: MapPin },
    { id: 'wishlist', label: 'Lista želja', icon: Heart },
    { id: 'privacy', label: 'Privatnost', icon: Cookie },
  ];

  const activeItem =
    navItems.find((item) => item.id === activeTab) || navItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <>
      <nav className="account-nav desktop-nav card glass">
        <div className="nav-header">
          <span className="nav-title">{translateText("Moj Nalog")}</span>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="nav-item">
                <Link
                  to={`/account/${item.id}`}
                  replace
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{translateText(item.label)}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="active-indicator"
                    />
                  )}
                </Link>
              </li>
            );
          })}
          <li className="nav-item-logout">
            <button className="nav-btn logout-btn" onClick={logout}>
              <LogOut size={20} />
              <span>{translateText("Odjavi se")}</span>
            </button>
          </li>
        </ul>
      </nav>
      <div className="account-mobile-nav" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isMobileOpen}
          aria-controls={isMobileOpen ? menuId : undefined}
          className={`mobile-dropdown-trigger ${
            isMobileOpen ? 'open' : ''
          }`}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <div className="trigger-content">
            <ActiveIcon size={20} style={{ color: 'var(--color-primary)' }} />
            <span className="trigger-label">{translateText(activeItem.label)}</span>
          </div>
          <ChevronDown
            size={20}
            className={`chevron ${isMobileOpen ? 'rotate' : ''}`}
          />
        </button>
          {isMobileOpen && (
            <nav
              id={menuId}
              aria-label={translateText('Moj Nalog')}
              className="mobile-dropdown-menu"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    to={`/account/${item.id}`}
                    replace
                    aria-current={isActive ? 'page' : undefined}
                    className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{translateText(item.label)}</span>
                    {isActive && (
                      <Check
                        size={16}
                        className="account-menu-check"
                      />
                    )}
                  </Link>
                );
              })}
              <div className="mobile-menu-divider"></div>
              <button type="button" className="mobile-menu-item logout" onClick={() => { setIsMobileOpen(false); logout(); }}>
                <LogOut size={18} />
                <span>{translateText("Odjavi se")}</span>
              </button>
            </nav>
          )}
      </div>
    </>
  );
}

export default AccountNav;
