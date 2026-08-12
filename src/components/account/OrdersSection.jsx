import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { motion } from 'framer-motion';
import { Package, Loader2 } from 'lucide-react';
import './OrdersSection.css';
import { ordersApi } from '../../services/dajaPlatform';

// Uvozimo novu komponentu za prikaz pojedinačne porudžbine
import OrderCard from './OrderCard';

function OrdersSection() {
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

  if (loading)
    return (
      <div className="loading-state py-12 flex flex-col items-center justify-center text-[var(--color-muted)]">
                <Loader2 className="animate-spin mb-4" size={32} />       {' '}
        <p>Učitavanje Vaših porudžbina...</p>     {' '}
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="section-content"
    >
           {' '}
      <div className="section-header-row mb-6">
               {' '}
        <h3 className="text-2xl font-bold text-[var(--color-text)]">
                    Moje porudžbine        {' '}
        </h3>
             {' '}
      </div>
           {' '}
      {orders.length === 0 ? (
        <div className="empty-state flex flex-col items-center justify-center py-12 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]">
                   {' '}
          <Package
            size={48}
            className="text-[var(--color-muted)] opacity-30 mb-4"
          />
                   {' '}
          <p className="text-[var(--color-text)] font-medium">
                        Još uvek nemate porudžbina.          {' '}
          </p>
                   {' '}
          <p className="text-sm text-[var(--color-muted)] mt-2">
                        Istražite našu ponudu i pronađite savršen sat za sebe.  
                   {' '}
          </p>
                 {' '}
        </div>
      ) : (
        <div className="orders-list space-y-4">
                   {' '}
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
                 {' '}
        </div>
      )}
         {' '}
    </motion.div>
  );
}

export default OrdersSection;
