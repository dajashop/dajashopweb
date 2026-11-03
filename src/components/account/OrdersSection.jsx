import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import './OrdersSection.css';
import { ordersApi } from '../../services/dajaPlatform';

// Uvozimo novu komponentu za prikaz pojedinačne porudžbine
import OrderCard from './OrderCard';
import { AccountSectionSkeleton } from './AccountSkeleton.jsx';

function OrdersSection() {
  const { t: translateText } = useStorefront();

  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.email) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    ordersApi
      .mine()
      .then((fetchedOrders) => {
        if (cancelled) return;
        setOrders(fetchedOrders);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Greska pri ucitavanju porudzbina:', error);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <AccountSectionSkeleton section="orders" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="section-content"
    >
           {translateText(' ')}
      <div className="section-header-row mb-6">
               {translateText(' ')}
        <h3 className="text-2xl font-bold text-[var(--color-text)]">{translateText("          Moje porudžbine        ")}{translateText(' ')}
        </h3>
             {translateText(' ')}
      </div>
           {translateText(' ')}
      {orders.length === 0 ? (
        <div className="empty-state flex flex-col items-center justify-center py-12 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]">
                   {translateText(' ')}
          <Package
            size={48}
            className="text-[var(--color-muted)] opacity-30 mb-4"
          />
                   {translateText(' ')}
          <p className="text-[var(--color-text)] font-medium">{translateText("            Još uvek nemate porudžbina.          ")}{translateText(' ')}
          </p>
                   {translateText(' ')}
          <p className="text-sm text-[var(--color-muted)] mt-2">{translateText("            Istražite našu ponudu i pronađite savršen sat za sebe.          ")}{translateText(' ')}
          </p>
                 {translateText(' ')}
        </div>
      ) : (
        <div className="orders-list space-y-4">
                   {translateText(' ')}
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
                 {translateText(' ')}
        </div>
      )}
         {translateText(' ')}
    </motion.div>
  );
}

export default OrdersSection;
