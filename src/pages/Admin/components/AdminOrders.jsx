import { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminSkeleton from '../../../components/AdminSkeleton.jsx';
import EngravingSummary from '../../../components/engraving/EngravingSummary';
import ConfirmModal from '../../../components/modals/ConfirmModal';
import { ordersService } from '../../../services/admin';
import { money } from '../../../utils/currency';

const statusStyles = {
  'Na čekanju': 'border-neutral-200 bg-neutral-50 text-neutral-700',
  'U obradi': 'border-amber-200 bg-amber-50 text-amber-900',
  Poslato: 'border-blue-200 bg-blue-50 text-blue-800',
  Isporučeno: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Otkazano: 'border-red-200 bg-red-50 text-red-800',
};

const orderTime = new Intl.DateTimeFormat('sr-Latn-RS', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Belgrade',
});

function OrderTime({ value, fallback = '—' }) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return fallback;
  return <time dateTime={date.toISOString()} className="tabular-nums">{orderTime.format(date)}</time>;
}

const supplierNames = { ekka: 'Ekka', bultime: 'Bultime', timezone: 'TimeZone', qandq: 'Q&Q', linkel: 'Linkel', milano: 'Milano' };
const supplierResults = {
  in_stock: 'Na stanju', out_of_stock: 'Nema na stanju prema proveri', unknown: 'Stanje nije prikazano',
  missing: 'Stranica nije pronađena', error: 'Provera nije uspela', pending: 'Čeka proveru',
  checking: 'Provera u toku', paused: 'Provere dobavljača su pauzirane',
  disabled: 'Provera je isključena', removed: 'Link je promenjen ili uklonjen',
};
const emailStatuses = {
  pending: 'Čeka slanje', sending: 'Slanje u toku', sent: 'SES prihvatio, čeka potvrdu dostave',
  failed: 'Greška pri slanju', expired: 'Istekao rok za slanje', suppressed: 'Slanje blokirano',
};
const emailFeedback = {
  Delivery: 'Dostavljeno serveru primaoca', DeliveryDelay: 'Dostava kasni', Bounce: 'Poruka vraćena',
  Complaint: 'Prijavljeno kao spam', Reject: 'SES odbio poruku',
  'Rendering Failure': 'Greška pri pripremi poruke', RenderingFailure: 'Greška pri pripremi poruke',
};

const textLink = 'underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const heading = 'text-sm font-semibold text-neutral-900';

function StatusText({ tone = 'neutral', children }) {
  const styles = {
    neutral: 'text-neutral-600 before:bg-neutral-400',
    good: 'text-emerald-800 before:bg-emerald-600',
    waiting: 'text-amber-900 before:bg-amber-500',
    issue: 'text-red-800 before:bg-red-500',
  };
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-medium before:h-1.5 before:w-1.5 before:shrink-0 before:self-center before:rounded-full ${styles[tone]}`}>
      {children}
    </span>
  );
}

function SupplierChecks({ checks }) {
  return (
    <div className="mt-3 border-t border-neutral-200 pt-2 text-xs">
      <p className="font-medium text-neutral-600">Stanje kod dobavljača</p>
      {checks.length === 0 ? <p className="mt-1 text-neutral-500">Nema evidentiranih linkova.</p> : (
        <ul className="mt-1 space-y-1.5">
          {checks.map(check => {
            const name = supplierNames[check.provider] ?? check.provider;
            const tone = check.result === 'in_stock' ? 'good'
              : ['out_of_stock', 'missing', 'error'].includes(check.result) ? 'issue'
              : ['pending', 'checking', 'paused'].includes(check.result) ? 'waiting' : 'neutral';
            const timestamp = check.checkedAt ?? (check.result === 'pending' ? check.requestedAt : null);
            return (
              <li key={`${check.provider}:${check.url}`} className="grid grid-cols-[minmax(4rem,auto)_minmax(0,1fr)] items-baseline gap-x-3">
                <div className="font-semibold text-neutral-800">
                  {/^https?:\/\//i.test(check.url) ? (
                    <a href={check.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${textLink}`}>
                      {name} <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : name}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <StatusText tone={tone}>{supplierResults[check.result] ?? 'Stanje nije poznato'}</StatusText>
                  {timestamp && <span className="text-neutral-500"><OrderTime value={timestamp} /></span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OrderEmailStatus({ order }) {
  return (
    <section className="border-t border-neutral-200 pt-3">
      <h4 className={heading}>Email poruke</h4>
      <div className="mt-2 divide-y divide-neutral-200">
        {['order-confirmation', 'new-order-notification'].map(tag => {
          const isCustomer = tag === 'order-confirmation';
          const messages = (order.emailDeliveries ?? []).filter(message => message.tag === tag);
          return (
            <div key={tag} className="py-2 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold text-neutral-700">{isCustomer ? 'Potvrda kupcu' : 'Obaveštenje prodavnici'}</p>
              {messages.length ? (
                <ul className="mt-1 space-y-2 text-xs">
                  {messages.map(message => {
                    const tone = message.feedback === 'Delivery' ? 'good'
                      : message.feedback === 'DeliveryDelay' ? 'waiting'
                      : message.feedback || ['failed', 'expired', 'suppressed'].includes(message.status) ? 'issue' : 'waiting';
                    const timestamp = message.feedbackAt ?? message.sentAt;
                    return (
                      <li key={message.recipient} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                        <span className="break-words text-neutral-700">{message.recipient}</span>
                        <div>
                          <StatusText tone={tone}>{emailFeedback[message.feedback] ?? emailStatuses[message.status] ?? 'Status nije poznat'}</StatusText>
                          {timestamp && <p className="mt-0.5 text-neutral-500"><OrderTime value={timestamp} /></p>}
                          {message.attempts > 0 && message.status !== 'sent' && <p className="text-neutral-500">Pokušaji {message.attempts}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-neutral-500">{isCustomer && order.customerEmailDisabled ? 'Slanje kupcu je isključeno.' : 'Nema zapisa o slanju.'}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrderDetails({ order, id }) {
  const { customer } = order;
  const pickup = order.shippingMethod === 'pickup';
  return (
    <div id={id} className="grid gap-5 border-t border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-0">
      <section className="min-w-0 lg:pr-6">
        <h4 className={heading}>Artikli <span className="ml-1 font-normal text-neutral-500">{order.items.length}</span></h4>
        <ul className="mt-2 divide-y divide-neutral-200">
          {order.items.map((item, index) => {
            const productUrl = item.slug ? `/product/${item.slug}` : null;
            return (
              <li key={index} className="py-3 first:pt-1">
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-x-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
                  <img src={item.image || '/placeholder.png'} alt="" className="aspect-square w-full rounded-md border border-neutral-200 bg-white object-contain" />
                  <div className="min-w-0">
                    {productUrl ? (
                      <Link to={productUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-baseline gap-1.5 font-semibold ${textLink}`}>
                        <span className="break-words">{item.name}</span> <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
                      </Link>
                    ) : <p className="break-words font-semibold">{item.name}</p>}
                    <p className="mt-0.5 text-xs text-neutral-600">{item.qty} kom × {money(item.price)}</p>
                    <EngravingSummary item={item} admin />
                  </div>
                  <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">{money(item.price * item.qty)}</span>
                </div>
                <SupplierChecks checks={(order.supplierChecks ?? []).filter(check => check.productId === (item.productId ?? item.id))} />
              </li>
            );
          })}
        </ul>
        <dl className="space-y-1.5 border-t border-neutral-200 pt-3 text-sm tabular-nums">
          <div className="flex justify-between gap-3"><dt className="text-neutral-600">Dostava</dt><dd>{order.shippingCost === 0 ? 'Besplatna' : money(order.shippingCost)}</dd></div>
          {order.promoCode && (
            <div className="flex justify-between gap-3 text-emerald-800">
              <dt>Promo kod <span className="font-semibold">{order.promoCode}</span></dt>
              <dd>{Number(order.discountAmount) > 0 ? `−${money(order.discountAmount)}` : 'Besplatna dostava'}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 pt-1 font-semibold"><dt>Ukupno</dt><dd className="text-base">{money(order.finalTotal)}</dd></div>
        </dl>
      </section>

      <div className="min-w-0 space-y-3 border-t border-neutral-200 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <section className="min-w-0">
            <h4 className={heading}>Kupac</h4>
            <address className="mt-1 space-y-1 break-words text-sm not-italic text-neutral-700">
              <p className="font-medium text-neutral-900">{customer.name} {customer.surname}</p>
              {!pickup && <p>{customer.address}<br />{customer.postalCode} {customer.city}</p>}
              {customer.phone && <p><a href={`tel:${customer.phone}`} className={textLink}>{customer.phone}</a></p>}
              {customer.email && <p><a href={`mailto:${customer.email}`} className={textLink}>{customer.email}</a></p>}
            </address>
          </section>
          <section>
            <h4 className={heading}>Logistika</h4>
            <dl className="mt-1 space-y-1.5 text-sm">
              <div><dt className="text-xs text-neutral-500">Isporuka</dt><dd>{pickup ? 'Lično preuzimanje' : 'Kurirska služba'}</dd></div>
              <div><dt className="text-xs text-neutral-500">Plaćanje</dt><dd>{order.paymentMethod === 'cod' ? 'Pouzećem' : 'Pri preuzimanju'}</dd></div>
            </dl>
          </section>
        </div>
        {order.statusChangedAt && new Date(order.statusChangedAt).getTime() !== new Date(order.createdAt).getTime() && (
          <p className="text-xs text-neutral-600"><span className="mr-2 font-medium">Poslednja promena statusa</span><OrderTime value={order.statusChangedAt} /></p>
        )}
        <OrderEmailStatus order={order} />
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [pendingChange, setPendingChange] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    return ordersService.subscribe(
      data => { setOrders(data); setLoading(false); setLoadError(''); },
      error => { setLoadError(error.message || 'Porudžbine nisu učitane.'); setLoading(false); },
    );
  }, [revision]);

  const confirmStatusChange = async () => {
    if (!pendingChange) return;
    const { orderId, newStatus, oldStatus } = pendingChange;
    setOrders(current => current.map(order => order.docId === orderId ? { ...order, status: newStatus } : order));
    try {
      await ordersService.updateStatus(orderId, newStatus);
    } catch {
      setOrders(current => current.map(order => order.docId === orderId && order.status === newStatus ? { ...order, status: oldStatus } : order));
      alert('Greška pri promeni statusa.');
    }
  };

  const toggleDetails = async order => {
    const isExpanding = expandedOrderId !== order.id;
    setExpandedOrderId(isExpanding ? order.id : null);
    if (isExpanding && !order.isRead) {
      setOrders(current => current.map(item => item.docId === order.docId ? { ...item, isRead: true } : item));
      try {
        await ordersService.markAsRead(order.docId);
      } catch {
        setOrders(current => current.map(item => item.docId === order.docId ? { ...item, isRead: false } : item));
      }
    }
  };

  return (
    <section aria-busy={loading} className="overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 px-4 py-3.5 sm:px-6">
        <h2 className="font-semibold">Upravljanje porudžbinama</h2>
        <p className="text-sm text-neutral-600">Ukupno {orders.length}</p>
      </header>

      {loadError && (
        <div role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-6">
          {loadError} <button type="button" className="ml-1 font-semibold underline" onClick={() => setRevision(value => value + 1)}>Pokušaj ponovo</button>
        </div>
      )}
      {loading && !orders.length && <AdminSkeleton rows={3} />}
      {!loading && !orders.length && !loadError && <p className="px-4 py-6 text-sm text-neutral-600 sm:px-6">Još nema porudžbina.</p>}

      <ul className="divide-y divide-neutral-200">
        {orders.map(order => {
          const expanded = expandedOrderId === order.id;
          const detailsId = `order-details-${order.docId}`;
          const status = order.status || 'Na čekanju';
          return (
            <li key={order.id}>
              <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:gap-x-5 sm:px-6 ${expanded ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={expanded ? detailsId : undefined}
                  onClick={() => toggleDetails(order)}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_auto_auto] md:gap-x-4 md:py-4"
                >
                  <span className="min-w-0 font-semibold tabular-nums">
                    <span className="mr-1.5 inline-block w-1.5 align-middle">
                      {!order.isRead && <span className="block h-1.5 w-1.5 rounded-full bg-blue-600" aria-label="Nepročitano" />}
                    </span>
                    {order.id}
                  </span>
                  <span className="col-span-2 row-start-2 min-w-0 break-words text-neutral-700 md:col-auto md:row-auto">
                    {order.customer.name} {order.customer.surname}
                  </span>
                  <span className="row-start-3 text-xs text-neutral-600 md:col-auto md:row-auto">
                    <OrderTime value={order.createdAt} fallback={order.date} />
                  </span>
                  <span className="col-start-2 row-start-3 whitespace-nowrap text-right font-semibold tabular-nums md:col-auto md:row-auto">
                    {money(order.finalTotal)}
                  </span>
                  <ChevronDown size={16} aria-hidden="true" className={`col-start-2 row-start-1 justify-self-end text-neutral-500 motion-safe:transition-transform md:col-auto md:row-auto ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <label className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 ${statusStyles[status] ?? statusStyles['Na čekanju']}`}>
                  <select
                    value={status}
                    aria-label={`Status porudžbine ${order.id}`}
                    onChange={event => setPendingChange({
                      orderId: order.docId,
                      newStatus: event.target.value,
                      oldStatus: status,
                      customerName: `${order.customer.name} ${order.customer.surname}`,
                    })}
                    className="cursor-pointer appearance-none bg-transparent outline-none"
                  >
                    {!Object.hasOwn(statusStyles, status) && <option value={status}>{status}</option>}
                    {Object.keys(statusStyles).map(option => <option key={option} value={option} className="bg-white text-neutral-900">{option}</option>)}
                  </select>
                  <ChevronDown size={12} aria-hidden="true" className="pointer-events-none" />
                </label>
              </div>
              {expanded && <OrderDetails order={order} id={detailsId} />}
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        isOpen={Boolean(pendingChange)}
        onClose={() => setPendingChange(null)}
        onConfirm={confirmStatusChange}
        title="Promena statusa porudžbine"
        description={pendingChange ? `Da li želite da promenite status porudžbine za ${pendingChange.customerName} u „${pendingChange.newStatus}“?` : ''}
        confirmText="Promeni status"
        cancelText="Odustani"
        isDanger={pendingChange?.newStatus === 'Otkazano'}
      />
    </section>
  );
}
