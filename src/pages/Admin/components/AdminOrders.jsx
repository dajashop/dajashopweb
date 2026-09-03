// src/pages/Admin/components/AdminOrders.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  ChevronDown,
  User,
  MapPin,
  Phone,
  CreditCard,
  Truck,
  ExternalLink,
  Ticket,
} from 'lucide-react';
import { ordersService } from '../../../services/admin';
import { money } from '../../../utils/currency';
import ConfirmModal from '../../../components/modals/ConfirmModal'; // DODATO

const STATUS_OPTIONS = [
  'Na čekanju',
  'U obradi',
  'Poslato',
  'Isporučeno',
  'Otkazano',
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // NOVO: State za Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  // 1. Učitavanje podataka u realnom vremenu
  useEffect(() => {
    const unsub = ordersService.subscribe(
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, []);

  // NOVO: 2a. Iniciranje promene (Samo otvara modal)
  const initiateStatusChange = (
    orderId,
    newStatus,
    currentStatus,
    customerName
  ) => {
    if (newStatus === currentStatus) return;

    setPendingChange({
      orderId, // Ovo je docId
      newStatus,
      oldStatus: currentStatus,
      customerName,
    });
    setIsModalOpen(true);
  };

  // NOVO: 2b. Potvrda promene (Izvršava logiku koja je pre bila direktna)
  const confirmStatusChange = async () => {
    if (!pendingChange) return;

    const { orderId, newStatus } = pendingChange;
    const oldOrders = [...orders];

    // Odmah ažuriraj UI da se vidi promena
    setOrders(
      orders.map((o) => (o.docId === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      await ordersService.updateStatus(orderId, newStatus);
      setIsModalOpen(false);
      setPendingChange(null);
    } catch (error) {
      setOrders(oldOrders); // Vrati na staro ako pukne
      alert('Greška pri promeni statusa.');
      setIsModalOpen(false);
    }
  };

  // NOVO: 2c. Odustajanje
  const cancelStatusChange = () => {
    setIsModalOpen(false);
    setPendingChange(null);
  };

  // 3. Otvaranje detalja i označavanje kao PROČITANO
  const toggleDetails = async (order) => {
    const isExpanding = expandedOrderId !== order.id;
    setExpandedOrderId(isExpanding ? order.id : null);

    // Ako otvaramo porudžbinu koja NIJE pročitana, označi je u bazi kao pročitanu
    if (isExpanding && !order.isRead) {
      const previousOrders = orders;
      setOrders((current) => current.map((item) => item.docId === order.docId ? { ...item, isRead: true } : item));
      try {
        await ordersService.markAsRead(order.docId);
      } catch (error) {
        setOrders(previousOrders);
        console.error('Failed to mark as read', error);
      }
    }
  };

  // 4. Boje za statuse
  const getStatusColor = (status) => {
    switch (status) {
      case 'Isporučeno':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Poslato':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'U obradi':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Otkazano':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  if (loading)
    return (
      <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
        <span className="loading loading-spinner loading-lg mb-2"></span>
        Učitavanje porudžbina...
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
    >
      {/* HEADER TABELE */}
      <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <Package className="text-neutral-500" /> Upravljanje Porudžbinama
        </h2>
        <span className="text-sm text-neutral-500 font-medium bg-neutral-50 px-3 py-1 rounded-full border border-neutral-100">
          Ukupno: {orders.length}
        </span>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-bold tracking-wider border-b border-neutral-200">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Kupac</th>
              <th className="p-4">Datum</th>
              <th className="p-4">Status</th>
              <th className="p-4">Iznos</th>
              <th className="p-4 text-right">Detalji</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                {/* GLAVNI RED */}
                <tr
                  onClick={() => toggleDetails(order)}
                  className={`cursor-pointer transition-colors ${
                    expandedOrderId === order.id
                      ? 'bg-neutral-50'
                      : !order.isRead
                      ? 'bg-blue-50/60 font-semibold'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <td className="p-4 font-mono text-neutral-600 relative">
                    {!order.isRead && (
                      <span className="absolute top-1/2 left-1 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                    {order.id}
                  </td>
                  <td className="p-4">
                    <div className="text-neutral-900">
                      {order.customer.name} {order.customer.surname}
                    </div>
                    <div className="text-xs text-neutral-400 font-normal">
                      {order.customer.email}
                    </div>
                  </td>
                  <td className="p-4 text-neutral-500 font-normal">
                    <div className="flex items-center gap-1">
                      <Clock size={14} /> {order.date}
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      value={order.status || 'Na čekanju'}
                      // IZMENJENO: Pozivamo initiateStatusChange umesto direktne promene
                      onChange={(e) =>
                        initiateStatusChange(
                          order.docId,
                          e.target.value,
                          order.status,
                          `${order.customer.name} ${order.customer.surname}`
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 outline-none cursor-pointer transition-all appearance-none shadow-sm uppercase tracking-wide ${getStatusColor(
                        order.status
                      )}`}
                      style={{ textAlignLast: 'center' }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option
                          key={opt}
                          value={opt}
                          className="bg-white text-neutral-900"
                        >
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 font-bold text-neutral-900">
                    <div>{money(order.finalTotal)}</div>
                    {order.promoCode && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Ticket size={13} />
                        <code className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
                          {order.promoCode}
                        </code>
                        {Number(order.discountAmount) > 0 ? (
                          <span>−{money(order.discountAmount)}</span>
                        ) : (
                          <span>Besplatna dostava</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleDetails(order);
                      }}
                      aria-label={
                        expandedOrderId === order.id
                          ? `Zatvori detalje porudžbine ${order.id}`
                          : `Otvori detalje porudžbine ${order.id}`
                      }
                      className="p-2 hover:bg-white rounded-lg text-neutral-500 hover:text-neutral-900 border border-transparent hover:border-neutral-200 transition-all"
                    >
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${
                          expandedOrderId === order.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </td>
                </tr>

                {/* DETALJI (EXPANDED) */}
                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-0 border-b border-neutral-100"
                      >
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-neutral-50/50"
                        >
                          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* LEVA KOLONA: ARTIKLI */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                              <h4 className="text-xs font-bold uppercase text-neutral-400 mb-4 flex items-center gap-2">
                                <Package size={14} /> Sadržaj korpe (
                                {order.items.length})
                              </h4>

                              <div className="space-y-4">
                                {order.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-4 pb-4 border-b border-neutral-100 last:border-0 last:pb-0"
                                  >
                                    {/* SLIKA PROIZVODA (LINK) */}
                                    <Link
                                      to={`/product/${item.slug}`}
                                      target="_blank"
                                      className="w-24 h-24 flex-shrink-0 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 block group relative"
                                    >
                                      <img
                                        src={item.image || '/placeholder.png'}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </Link>

                                    <div className="flex-1 flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between items-start gap-2">
                                          <Link
                                            to={`/product/${item.slug}`}
                                            target="_blank"
                                            className="font-bold text-neutral-900 text-sm sm:text-base line-clamp-2 hover:text-blue-600 transition-colors"
                                          >
                                            {item.name}
                                          </Link>
                                          <span className="font-mono font-bold text-neutral-900 ml-2 whitespace-nowrap">
                                            {money(item.price * item.qty)}
                                          </span>
                                        </div>
                                        <div className="text-sm text-neutral-500 mt-1">
                                          Količina:{' '}
                                          <span className="font-bold text-neutral-900">
                                            {item.qty} kom
                                          </span>
                                          <span className="mx-2">•</span>
                                          Cena: {money(item.price)}
                                        </div>
                                      </div>

                                      <div className="mt-2">
                                        <Link
                                          to={`/product/${item.slug}`}
                                          target="_blank"
                                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                        >
                                          Pogledaj proizvod{' '}
                                          <ExternalLink size={12} />
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="border-t border-neutral-100 pt-4 mt-2 flex justify-between items-center text-sm">
                                <span className="text-neutral-500">
                                  Dostava:
                                </span>
                                <span className="font-bold text-neutral-900">
                                  {order.shippingCost === 0
                                    ? 'Besplatna'
                                    : money(order.shippingCost)}
                                </span>
                              </div>
                              {order.promoCode && (
                                <div className="mt-2 flex justify-between items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm">
                                  <span className="flex items-center gap-2 font-semibold text-emerald-800">
                                    <Ticket size={15} /> Promo kod
                                  </span>
                                  <span className="flex flex-wrap items-center justify-end gap-2 text-right font-bold text-emerald-800">
                                    <code className="rounded bg-white/80 px-2 py-1">{order.promoCode}</code>
                                    {Number(order.discountAmount) > 0
                                      ? `−${money(order.discountAmount)}`
                                      : 'Besplatna dostava'}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t border-neutral-100">
                                <span className="font-bold text-neutral-900">
                                  Ukupno:
                                </span>
                                <span className="font-bold text-blue-600 text-xl">
                                  {money(order.finalTotal)}
                                </span>
                              </div>
                            </div>

                            {/* DESNA KOLONA: PODACI O KUPCU */}
                            <div className="space-y-6">
                              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                                <h4 className="text-xs font-bold uppercase text-neutral-400 mb-4 flex items-center gap-2">
                                  <User size={14} /> Podaci kupca
                                </h4>
                                <div className="space-y-4 text-sm text-neutral-600">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400">
                                      <MapPin size={18} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-neutral-900 text-base mb-1">
                                        {order.customer.name}{' '}
                                        {order.customer.surname}
                                      </p>
                                      {order.shippingMethod === 'pickup' ? (
                                        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
                                          Lično preuzimanje u radnji
                                        </span>
                                      ) : (
                                        <>
                                          <p>{order.customer.address}</p>
                                          <p>
                                            {order.customer.postalCode}{' '}
                                            {order.customer.city}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400">
                                      <Phone size={18} />
                                    </div>
                                    <span className="font-medium text-neutral-900 select-all">
                                      {order.customer.phone}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                                <h4 className="text-xs font-bold uppercase text-neutral-400 mb-4 flex items-center gap-2">
                                  <Truck size={14} /> Logistika
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded-lg">
                                    <span className="text-neutral-500">
                                      Metod isporuke:
                                    </span>
                                    <span className="font-bold text-neutral-900">
                                      {order.shippingMethod === 'courier'
                                        ? 'Kurirska služba'
                                        : 'Preuzimanje'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center p-2 bg-neutral-50 rounded-lg">
                                    <span className="text-neutral-500">
                                      Način plaćanja:
                                    </span>
                                    <span className="font-bold text-neutral-900 flex items-center gap-2">
                                      <CreditCard size={14} />
                                      {order.paymentMethod === 'cod'
                                        ? 'Pouzećem'
                                        : 'Kartica'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* NOVO: Confirmation Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={cancelStatusChange}
        onConfirm={confirmStatusChange}
        title="Promena statusa porudžbine"
        message={
          pendingChange
            ? `Da li ste sigurni da želite da promenite status za ${pendingChange.customerName} u "${pendingChange.newStatus}"? Kupac će biti obavešten email-om.`
            : ''
        }
        confirmText="Promeni status"
        cancelText="Odustani"
        isDanger={pendingChange?.newStatus === 'Otkazano'}
      />
    </motion.div>
  );
}
