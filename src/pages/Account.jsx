// src/pages/Account.jsx

import React, { useEffect } from 'react'; // Dodat useEffect
import { useAuth } from '../hooks/useAuth.js';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import './Account.css';
import { useNavigate, useParams } from 'react-router-dom'; // <--- NOVO: Import

// Uvezene izdvojene komponente
import AccountNav from '../components/account/AccountNav.jsx';
import ProfileSection from '../components/account/ProfileSection.jsx';
import AddressSection from '../components/account/AddressSection.jsx';
import WishlistSection from '../components/account/WishlistSection.jsx';
import OrdersSection from '../components/account/OrdersSection.jsx';
import SecuritySection from '../components/account/SecuritySection.jsx';
import PrivacySection from '../components/account/PrivacySection.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';

const allowedTabs = ['profile', 'orders', 'security', 'addresses', 'wishlist', 'privacy'];
const defaultTab = 'profile';

export default function Account() {
  const { user, logout, showAuth } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams();

  const activeTab = allowedTabs.includes(section) ? section : defaultTab;

  useEffect(() => {
    if (!section || !allowedTabs.includes(section)) {
      navigate(`/account/${defaultTab}`, { replace: true });
    }
  }, [section, allowedTabs, navigate]);

  const handleTabChange = (id) => {
    if (!allowedTabs.includes(id)) return;
    navigate(`/account/${id}`, { replace: true });
  };

  if (!user) {
    return (
      <div className="container account-page centered">
        <SEOHead title="Moj nalog" noIndex={true} />
        <motion.div
          className="glass account-empty-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="empty-icon-wrap large">
            <User size={64} />
          </div>

          <h1>Dobrodošli u Daja Shop Nalog</h1>
          <p className="lead">
            Prijavom dobijate pristup praćenju statusa porudžbina, čuvanju adresa
            i kreiranju liste želja.
          </p>

          <div className="auth-actions">
            <button
              className="btn-primary large"
              onClick={() => showAuth('login')}
            >
              Prijavi se odmah
            </button>
            <button
              className="btn-link-primary"
              onClick={() => showAuth('register')}
            >
              Novi korisnik? Registruj se
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container account-dashboard">
      <SEOHead title="Moj nalog" noIndex={true} />
      <AccountNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        logout={logout}
      />
      <main className="account-main">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && <ProfileSection key="prof" user={user} />}
          {activeTab === 'orders' && <OrdersSection key="ord" user={user} />}
          {activeTab === 'security' && (
            <SecuritySection key="sec" user={user} />
          )}
          {activeTab === 'addresses' && (
            <AddressSection key="addr" user={user} />
          )}
          {activeTab === 'wishlist' && <WishlistSection key="wish" />}
          {activeTab === 'privacy' && <PrivacySection key="privacy" user={user} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
