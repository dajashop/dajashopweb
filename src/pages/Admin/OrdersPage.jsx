import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdminEmail } from '../../services/dajaPlatform';
import { useNavigate } from 'react-router-dom';
import AdminOrders from './components/AdminOrders'; // Tvoja postojeća komponenta
import SEOHead from '../../components/seo/SEOHead.jsx';

export default function OrdersPage() {
  const { user, authReady, staffReady, showAuth } = useAuth();
  const nav = useNavigate();
  const isAuthorized = isAdminEmail(user?.email) && staffReady;

  if (!authReady) return <div className="p-8 text-center text-slate-500">Provera pristupa…</div>;
  if (!isAuthorized) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Admin sesija nije dostupna. Prijavi se ponovo da nastaviš.</p>
        <button type="button" onClick={() => showAuth('login')} className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-white">
          Prijavi se
        </button>
      </div>
    );
  }

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
