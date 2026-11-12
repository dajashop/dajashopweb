import { AdminTableSkeleton } from '../../../components/AdminSkeleton.jsx';
// src/pages/Admin/components/AdminOrders.jsx
import React, { useState, useEffect } from 'react';
import EngravingSummary from '../../../components/engraving/EngravingSummary';
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
  Mail,
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

const orderTime = new Intl.DateTimeFormat('sr-Latn-RS', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Belgrade',
});

function formatOrderTime(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? orderTime.format(date) : '—';
}

const supplierNames = { ekka: 'Ekka', bultime: 'Bultime', timezone: 'TimeZone', qandq: 'Stilius', linkel: 'Linkel', milano: 'Milano' };
const supplierResults = {
  in_stock: 'Na stanju', out_of_stock: 'Nema na stanju prema proveri', unknown: 'Stanje nije prikazano',
  missing: 'Stranica nije pronađena', error: 'Provera nije uspela', pending: 'Čeka proveru',
  checking: 'Provera u toku', paused: 'Provere dobavljača su pauzirane',
  disabled: 'Provera je isključena', removed: 'Link je promenjen ili uklonjen',
};

function SupplierChecks({ checks }) {
  if (!checks.length) return null;
  return (
    <ul aria-label="Stanje kod dobavljača" className="mt-2 flex flex-wrap gap-2">
      {checks.map(check => {
        const name = supplierNames[check.provider] ?? check.provider;
        const result = supplierResults[check.result] ?? 'Stanje nije poznato';
        const title = check.checkedAt ? `${result} · ${formatOrderTime(check.checkedAt)}` : result;
        const color = check.result === 'in_stock' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : ['out_of_stock', 'missing', 'error'].includes(check.result) ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-neutral-200 bg-neutral-50 text-neutral-600';
        const style = `inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-medium ${color}`;
        return (
          <li key={`${check.provider}:${check.url}`}>
            {/^https?:\/\//i.test(check.url) ? (
              <a href={check.url} target="_blank" rel="noopener noreferrer" title={title}
                aria-label={`${name}: ${title}`} className={`${style} hover:underline`}>
                {name} <ExternalLink size={12} aria-hidden="true" />
              </a>
            ) : <span title={title} className={style}>{name}<span className="sr-only"> {title}</span></span>}
          </li>
        );
      })}
    </ul>
  );
}

const emailStatuses = {
  pending: 'Čeka slanje', sending: 'Slanje u toku', sent: 'Čeka potvrdu dostave',
  failed: 'Greška pri slanju', expired: 'Istekao rok za slanje', suppressed: 'Slanje blokirano',
};
const emailFeedback = {
  DeliveryDelay: 'Dostava kasni', Bounce: 'Poruka vraćena', Complaint: 'Prijavljeno kao spam',
  Reject: 'SES odbio poruku', 'Rendering Failure': 'Greška pri pripremi poruke',
  RenderingFailure: 'Greška pri pripremi poruke',
};

function OrderEmailRow({ orderId, message }) {
  const [retryState, setRetryState] = useState(null);
  const received = message.feedback === 'Delivery';
  const deliveryTime = formatOrderTime(message.feedbackAt);
  const reason = emailFeedback[message.feedback] ?? emailStatuses[message.status] ?? 'Nema zapisa o slanju';
  const queued = retryState?.queued && message.status === retryState.status && message.attempts === retryState.attempts;

  async function retry() {
    setRetryState({ busy: true });
    try {
      await ordersService.retryEmail(orderId, message.id);
      setRetryState({ queued: true, status: message.status, attempts: message.attempts });
    } catch (error) {
      setRetryState({ error: error.message || 'Ponovno slanje nije zakazano.' });
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 py-2 text-sm">
      <span className="break-words text-neutral-700">{message.recipient}</span>
      <details className="group text-right">
        <summary className={`relative inline-block cursor-pointer list-none rounded-md px-2 py-0.5 font-semibold [&::-webkit-details-marker]:hidden ${received ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {received ? 'Primljeno' : 'Nije primljeno'}
          {received && (
            <span aria-hidden="true" className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 font-normal text-white group-hover:block group-open:hidden">
              {deliveryTime}
            </span>
          )}
        </summary>
        <div className="mt-1 max-w-48 text-neutral-600">
          <p>{received ? deliveryTime : queued ? 'Ponovno slanje zakazano.' : reason}</p>
          {!received && message.canRetry && message.id && !queued && (
            <button type="button" disabled={retryState?.busy} onClick={retry} className="mt-1 font-semibold text-blue-700 underline disabled:opacity-50">
              {retryState?.busy ? 'Zakazivanje…' : 'Probaj ponovo'}
            </button>
          )}
          {retryState?.error && !received && <p role="alert" className="mt-1 text-red-700">{retryState.error}</p>}
        </div>
      </details>
    </div>
  );
}

function OrderEmailStatus({ order }) {
  const deliveries = order.emailDeliveries ?? [];
  const messages = order.customer.email && !deliveries.some(message => message.tag === 'order-confirmation')
    ? [{ recipient: order.customer.email, status: order.customerEmailDisabled ? 'suppressed' : null }, ...deliveries]
    : deliveries;

  return (
    <div className="mt-4 border-t border-neutral-100 pt-3">
      <h4 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-neutral-500"><Mail size={14} /> Email poruke</h4>
      {messages.length ? (
        <div className="divide-y divide-neutral-100">
          {messages.map(message => <OrderEmailRow key={message.id ?? `${message.tag}:${message.recipient}`} orderId={order.docId} message={message} />)}
        </div>
      ) : <p className="mt-2 text-sm text-neutral-500">Nema zapisa o slanju.</p>}
    </div>
  );
}
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // NOVO: State za Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  // 1. Učitavanje podataka u realnom vremenu
  useEffect(() => {
    setLoading(true); setLoadError('');
    const unsub = ordersService.subscribe(
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (err) => { setLoadError(err.message || 'Porudžbine nisu učitane.'); setLoading(false); }
    );
    return () => unsub();
  }, [revision]);

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

  if (loadError && !orders.length) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{loadError} <button onClick={() => setRevision(value => value + 1)}>Pokušaj ponovo</button></p>;

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
              <th className="hidden p-4 md:table-cell">Kupac</th>
              <th className="hidden p-4 md:table-cell">Datum i vreme</th>
              <th className="p-4">Status</th>
              <th className="hidden p-4 md:table-cell">Iznos</th>
              <th className="p-4 text-right">Detalji</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100" aria-busy={loading}>
            {loading && !orders.length && <AdminTableSkeleton columns={6} variant="orders" />}
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
                    <div className="mt-1 space-y-1 font-sans text-sm font-normal md:hidden">
                      <div className="text-neutral-900">{order.customer.name} {order.customer.surname}</div>
                      <div>{order.createdAt ? <time dateTime={order.createdAt}>{formatOrderTime(order.createdAt)}</time> : order.date}</div>
                      <div className="font-bold text-neutral-900">{money(order.finalTotal)}</div>
                    </div>
                  </td>
                  <td className="hidden p-4 md:table-cell">
                    <div className="text-neutral-900">
                      {order.customer.name} {order.customer.surname}
                    </div>
                    <div className="text-xs text-neutral-400 font-normal">
                      {order.customer.email}
                    </div>
                  </td>
                  <td className="hidden p-4 font-normal text-neutral-500 md:table-cell">
                    <div className="flex items-center gap-1">
                      <Clock size={14} /> {order.createdAt ? <time dateTime={order.createdAt}>{formatOrderTime(order.createdAt)}</time> : order.date}
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
                  <td className="hidden p-4 font-bold text-neutral-900 md:table-cell">
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
                          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:p-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)]">
                            {/* LEVA KOLONA: ARTIKLI */}
                            <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-1">
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
                                      className="relative block h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 group sm:h-24 sm:w-24"
                                    >
                                      <img
                                        src={item.image || '/placeholder.png'}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </Link>

                                    <div className="flex min-w-0 flex-1 flex-col justify-between">
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
                                        <EngravingSummary item={item} admin />
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
                                      <SupplierChecks checks={(order.supplierChecks ?? []).filter(check => check.productId === (item.productId ?? item.id))} />
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

                              <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
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
                                    <a href={`tel:${order.customer.phone}`} className="break-all font-medium text-neutral-900 hover:underline">{order.customer.phone}</a>
                                  </div>
                                  {order.customer.email && <a href={`mailto:${order.customer.email}`} className="block break-all text-blue-700 hover:underline">{order.customer.email}</a>}
                                </div>
                              </div>

                              <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                                <h4 className="text-xs font-bold uppercase text-neutral-400 mb-4 flex items-center gap-2">
                                  <Truck size={14} /> Logistika
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg bg-neutral-50 p-2">
                                    <span className="text-neutral-500">
                                      Metod isporuke:
                                    </span>
                                    <span className="font-bold text-neutral-900">
                                      {order.shippingMethod === 'courier'
                                        ? 'Kurirska služba'
                                        : 'Preuzimanje'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg bg-neutral-50 p-2">
                                    <span className="text-neutral-500">
                                      Način plaćanja:
                                    </span>
                                    <span className="font-bold text-neutral-900 flex items-center gap-2">
                                      <CreditCard size={14} />
                                      {order.paymentMethod === 'cod'
                                        ? 'Pouzećem'
                                        : 'Pri preuzimanju'}
                                    </span>
                                  </div>
                                </div>
                                {order.statusChangedAt && new Date(order.statusChangedAt).getTime() !== new Date(order.createdAt).getTime() && (
                                  <div className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
                                    <p className="font-semibold text-neutral-900">Poslednja promena statusa</p>
                                    <p className="mt-1">{formatOrderTime(order.statusChangedAt)}</p>
                                  </div>
                                )}
                                <OrderEmailStatus order={order} />
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
        description={
          pendingChange
            ? `Da li ste sigurni da želite da promenite status za ${pendingChange.customerName} u "${pendingChange.newStatus}"?`
            : ''
        }
        confirmText="Promeni status"
        cancelText="Odustani"
        isDanger={pendingChange?.newStatus === 'Otkazano'}
      />
    </motion.div>
  );
}
