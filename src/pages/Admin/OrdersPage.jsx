import { AdminDashboardSkeleton } from '../../components/AdminSkeleton.jsx';
import { useAuth } from '../../hooks/useAuth';
import { isAdminEmail } from '../../services/dajaPlatform';
import { Link } from 'react-router-dom';
import AdminOrders from './components/AdminOrders';
import SEOHead from '../../components/seo/SEOHead.jsx';

export default function OrdersPage() {
  const { user, authReady, staffReady, showAuth } = useAuth();
  const isAuthorized = isAdminEmail(user?.email) && staffReady;

  if (!authReady) return <AdminDashboardSkeleton />;
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
      <div className="container pt-6 sm:pt-8">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Porudžbine</h1>
          <Link to="/admin" className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-offset-4">
            Nazad na admin
          </Link>
        </header>
        <AdminOrders />
      </div>
    </div>
  );
}
