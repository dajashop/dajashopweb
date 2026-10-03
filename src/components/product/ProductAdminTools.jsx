import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { Edit3, Eye, EyeOff, Star, Trash2, ExternalLink } from 'lucide-react';
import { adminCatalogApi, isAdminEmail } from '../../services/dajaPlatform.js';
import { deleteProduct, saveProduct } from '../../services/products.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFlash } from '../../hooks/useFlash.js';
import AdminProductModal from '../../pages/Admin/components/AdminProductModal.jsx';
import ConfirmModal from '../modals/ConfirmModal.jsx';

const flags = { new: 'Novo', popular: 'Popularno', recommended: 'Preporučeno' };
const suppliers = [['supplierUrl', 'Ekka'], ['bultimeUrl', 'Bultime'], ['linkelUrl', 'Linkel'], ['milanoUrl', 'Milano'], ['timezoneUrl', 'Timezone'], ['qandqUrl', 'Q&Q']];

function SupplierCountdown({ nextCheckAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const target = Date.parse(nextCheckAt || '');
  if (!Number.isFinite(target)) return null;
  const remaining = Math.max(0, target - now);
  const [unit, divisor] = remaining >= 86400000 ? ['d', 86400000] : remaining >= 3600000 ? ['h', 3600000] : remaining >= 60000 ? ['m', 60000] : ['s', 1000];
  return <span title="Do sledeće provere">{unit === 's' ? Math.ceil(remaining / divisor) : Math.floor(remaining / divisor)}{unit}</span>;
}

function supplierPrice(amount, currency, rate) {
  if (amount == null || !Number.isFinite(Number(amount))) return 'Cena nije potvrđena';
  const value = Number(amount);
  const code = String(currency || '').toUpperCase();
  const format = (number) => number.toLocaleString('sr-RS', { maximumFractionDigits: 2 });
  if (rate > 0 && ['RSD', 'EUR'].includes(code)) {
    const rsd = code === 'RSD' ? value : value * rate;
    const eur = code === 'EUR' ? value : value / rate;
    return `${format(rsd)} RSD · ${format(eur)} EUR`;
  }
  return `${format(value)} ${code}`;
}

export default function ProductAdminTools({ product, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const { flash } = useFlash();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFlags, setShowFlags] = useState(false);
  const [eurRsdRate, setEurRsdRate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    adminCatalogApi.getSupplierExchangeRate().then((data) => {
      if (!cancelled) setEurRsdRate(Number(data.middleRate));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRecord(null); setError(''); setEditing(false); setShowFlags(false); setConfirmDelete(false);
    adminCatalogApi.getProduct(product.id).then((data) => {
      if (!cancelled) setRecord(data);
    }).catch((caught) => { if (!cancelled) setError(caught.message || 'Admin podaci nisu dostupni.'); });
    return () => { cancelled = true; };
  }, [product.id]);

  const update = async (patch) => {
    if (busy || !record) return;
    setBusy(true);
    try {
      await saveProduct({ id: product.id, ...patch });
      setRecord((previous) => ({ ...previous, ...patch }));
      onUpdated(patch);
      flash('Sačuvano', 'Proizvod je ažuriran.', 'success');
    } catch (caught) { flash('Greška', caught.message || 'Izmena nije uspela.', 'error'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteProduct(product.id);
      onDeleted();
      flash('Obrisano', 'Proizvod je obrisan.', 'success');
    } catch (caught) { flash('Greška', caught.message || 'Brisanje nije uspelo.', 'error'); }
    finally { setBusy(false); setConfirmDelete(false); }
  };

  const afterEdit = async () => {
    setEditing(false);
    try {
      const fresh = await adminCatalogApi.getProduct(product.id);
      setRecord(fresh); onUpdated(fresh);
    } catch (caught) { setError(caught.message || 'Osvežavanje nije uspelo.'); }
  };

  const selectedFlags = record?.marketingFlags || [];
  const variant = record?.variants?.find((item) => item.id === product.variantId) || record?.variants?.[0];
  const quantity = record?.availability?.availableQuantity ?? record?.availableQuantity;
  const inStock = record?.availability?.inStock ?? record?.inStock;

  return <div className="product-admin-tools" aria-label="Administracija proizvoda">
    {error && <p className="product-admin-error" role="alert">{error}</p>}
    {!record && !error && <p className="product-admin-loading">Učitavanje admin podataka…</p>}
    {record && <>
      <p className={`product-stock ${inStock ? 'is-in-stock' : 'is-out-of-stock'}`}>{inStock ? `Na stanju: ${quantity ?? 0} kom` : 'Trenutno nije na stanju'}</p>
      <dl className="product-identifiers product-admin-identifiers">
        <dt>SKU</dt><dd>{variant?.sku || record.sku || '—'}</dd>
        {record.mpn && <><dt>MPN</dt><dd>{record.mpn}</dd></>}
        <dt>Naziv u kasi</dt><dd>{variant?.name || record.variantName || '—'}</dd>
      </dl>
      <div className="product-admin-links">{suppliers.filter(([field]) => record[field]).map(([field, label]) => {
        const prefix = field.replace(/Url$/, '');
        const status = record[`${prefix}Status`];
        const stock = record[`${prefix}StockStatus`];
        const amount = record[`${prefix}PriceAmount`];
        const currency = record[`${prefix}PriceCurrency`];
        const statusText = status === 'available'
          ? stock === 'in_stock' ? 'Na stanju' : stock === 'out_of_stock' ? 'Nema na stanju' : 'Stranica dostupna'
          : ({ missing: 'Link nedostupan', checking: 'Proverava se', disabled: 'Provera isključena', paused: 'Provera pauzirana', deferred: 'Provera odložena', waiting_confirmation: 'Čeka potvrdu' }[status] || 'Dostupnost nije potvrđena');
        return <div className="product-admin-supplier" key={field}>
          <div className="product-admin-supplier-heading"><a href={record[field]} target="_blank" rel="noopener noreferrer">{label}<ExternalLink size={12} /></a>
            <SupplierCountdown nextCheckAt={record[`${prefix}NextCheckAt`]} />
          </div>
          <span className="product-admin-supplier-price">{supplierPrice(amount, currency, eurRsdRate)}</span>
          <span className={`product-admin-supplier-status ${status === 'available' && stock !== 'out_of_stock' ? 'is-available' : stock === 'out_of_stock' || status === 'missing' ? 'is-unavailable' : ''}`}>{statusText}</span>
        </div>;
      })}</div>
    </>}
    <div className="product-admin-commands">
      <button type="button" disabled={!record || busy} onClick={() => setShowFlags((previous) => !previous)} title="Oznake proizvoda" aria-label="Oznake proizvoda" aria-expanded={showFlags} className={selectedFlags.length ? 'is-tagged' : ''}><Star size={16} fill={selectedFlags.length ? 'currentColor' : 'none'} /></button>
      <button type="button" disabled={!record || busy} onClick={() => update({ isVisible: record.isVisible === false })} title={record?.isVisible === false ? 'Prikaži proizvod' : 'Sakrij proizvod'} aria-label={record?.isVisible === false ? 'Prikaži proizvod' : 'Sakrij proizvod'} className="is-visibility">{record?.isVisible === false ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      <button type="button" disabled={!record || busy} onClick={() => setEditing(true)} title="Izmeni proizvod i linkove" aria-label="Izmeni proizvod i linkove" className="is-edit"><Edit3 size={16} /></button>
      {isAdminEmail(user?.email) && <button type="button" disabled={!record || busy} onClick={() => setConfirmDelete(true)} title="Obriši proizvod" aria-label="Obriši proizvod" className="is-delete"><Trash2 size={16} /></button>}
    </div>
    {showFlags && <div className="product-admin-flags">{Object.entries(flags).map(([key, label]) => <button key={key} type="button" disabled={busy} aria-pressed={selectedFlags.includes(key)} onClick={() => update({ marketingFlags: selectedFlags.includes(key) ? selectedFlags.filter((flag) => flag !== key) : [...selectedFlags, key] })}>{label}</button>)}</div>}
    <AnimatePresence>{editing && record && <AdminProductModal product={record} onClose={() => setEditing(false)} onSuccess={afterEdit} />}</AnimatePresence>
    {createPortal(<div style={{ position: 'relative', zIndex: 3000 }}><ConfirmModal isOpen={confirmDelete} onClose={() => { if (!busy) setConfirmDelete(false); }} onConfirm={remove} title="Obriši proizvod?" description="Ova akcija je nepovratna." confirmText="Obriši" isDanger /></div>, document.body)}
  </div>;
}
