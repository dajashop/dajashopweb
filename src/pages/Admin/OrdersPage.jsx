import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdminEmail } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import AdminOrders from './components/AdminOrders'; // Tvoja postojeća komponenta
import SEOHead from '../../components/seo/SEOHead.jsx';

export default function OrdersPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  // Auth Check - Vraćamo na početnu ako nije admin
  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) {
      nav('/');
    }
  }, [user, nav]);

  if (!user || !isAdminEmail(user.email)) return null;

  return (
    <div className="min-h-screen pb-20 bg-[#f5f5f7]">
      <SEOHead title="Admin - Porudžbine" noIndex={true} />
      {/* HEADER */}
      <div className="bg-white border-b border-neutral-200 sticky top-[var(--header-bar-h)] z-30 shadow-sm">
        <div className="container py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-900">
            Admin Porudžbine
          </h1>
          <button
            onClick={() => nav('/admin')}
            className="text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            ← Nazad na Dashboard
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="container mt-8">
        <AdminOrders />
      </div>
    </div>
  );
}
