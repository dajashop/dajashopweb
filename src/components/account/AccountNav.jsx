// src/components/account/AccountNav.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AccountNav.css';
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
function AccountNav({ activeTab, setActiveTab, logout }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
  const handleMobileSelect = (id) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      <nav className="account-nav desktop-nav card glass">
        <div className="nav-header">
          <span className="nav-title">Moj Nalog</span>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="active-indicator"
                    />
                  )}
                </button>
              </li>
            );
          })}
          <li className="nav-item-logout">
            <button className="nav-btn logout-btn" onClick={logout}>
              <LogOut size={20} />
              <span>Odjavi se</span>
            </button>
          </li>
        </ul>
      </nav>
      <div className="mobile-nav-wrapper">
        <button
          className={`mobile-dropdown-trigger card glass ${
            isMobileOpen ? 'open' : ''
          }`}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <div className="trigger-content">
            <ActiveIcon size={20} style={{ color: 'var(--color-primary)' }} />
            <span className="trigger-label">{activeItem.label}</span>
          </div>
          <ChevronDown
            size={20}
            className={`chevron ${isMobileOpen ? 'rotate' : ''}`}
          />
        </button>
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              className="mobile-dropdown-menu card glass"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleMobileSelect(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {isActive && (
                      <Check
                        size={16}
                        className="ml-auto"
                        style={{ color: 'var(--color-primary)' }}
                      />
                    )}
                  </button>
                );
              })}
              <div className="mobile-menu-divider"></div>
              <button className="mobile-menu-item logout" onClick={logout}>
                <LogOut size={18} />
                <span>Odjavi se</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default AccountNav;
