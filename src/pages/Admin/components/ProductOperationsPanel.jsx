import { useEffect, useState } from 'react';
import { adminCatalogApi, inventoryApi } from '../../../services/dajaPlatform';
import { apiRequest } from '../../../services/apiClient';

export default function ProductOperationsPanel({ productId, variants = [] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id || '');
  const [prices, setPrices] = useState([]); const [balances, setBalances] = useState([]);
  const [reviews, setReviews] = useState([]); const [locations, setLocations] = useState([]);
  const [price, setPrice] = useState({ amount: '', type: 'sale', from: '', until: '' });
  const [stock, setStock] = useState({ locationId: '', delta: '', serialNumber: '' });
  const load = async () => {
    if (variantId) { setPrices(await adminCatalogApi.listVariantPrices(variantId)); setBalances(await inventoryApi.balances(variantId)); }
    setReviews(await adminCatalogApi.listAdminReviews(productId));
    setLocations(await apiRequest('/inventory/locations', { staff: true }));
  };
  useEffect(() => { setVariantId(variants[0]?.id || ''); }, [variants]);
  useEffect(() => { if (productId) load().catch(console.error); }, [productId, variantId]);
  const savePrice = async () => { await adminCatalogApi.addVariantPrice(variantId, { amountMinor: Math.round(Number(price.amount) * 100), currency: variants.find(v => v.id === variantId)?.currency || 'RSD', priceType: price.type, validFrom: price.from ? new Date(price.from).toISOString() : undefined, validUntil: price.until ? new Date(price.until).toISOString() : null }); setPrice({ amount: '', type: 'sale', from: '', until: '' }); await load(); };
  const adjust = async () => { await inventoryApi.adjust({ variantId, locationId: stock.locationId, quantityDelta: Number(stock.delta), sourceType: 'admin_modal', metadata: { serialNumber: stock.serialNumber || undefined } }); setStock({ locationId: '', delta: '', serialNumber: '' }); await load(); };
  const updateReview = async (id, status) => { await adminCatalogApi.moderateReview(id, status); await load(); };
  if (!productId) return <div className="bg-white p-6 rounded-2xl border border-neutral-100 text-sm text-neutral-500">Sačuvaj proizvod da bi uneo cene, inventar i moderirao recenzije.</div>;
  return <div className="space-y-6">
    <div className="bg-white p-6 rounded-2xl border border-neutral-100 space-y-3"><h3 className="font-bold">Cene i inventar</h3><select value={variantId} onChange={e => setVariantId(e.target.value)} className="w-full border rounded-lg p-2">{variants.map(v => <option key={v.id} value={v.id}>{v.sku} — {v.name || 'Glavna varijanta'}</option>)}</select>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><input type="number" placeholder="Akcijska cena RSD" value={price.amount} onChange={e=>setPrice({...price,amount:e.target.value})} className="border rounded-lg p-2"/><select value={price.type} onChange={e=>setPrice({...price,type:e.target.value})} className="border rounded-lg p-2"><option value="sell">Redovna</option><option value="sale">Akcijska</option></select><input type="datetime-local" value={price.from} onChange={e=>setPrice({...price,from:e.target.value})} className="border rounded-lg p-2"/><input type="datetime-local" value={price.until} onChange={e=>setPrice({...price,until:e.target.value})} className="border rounded-lg p-2"/></div><button onClick={savePrice} disabled={!variantId || !price.amount} className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm">Dodaj cenu</button>
      <div className="text-xs text-neutral-600">{prices.map(p => <div key={p.id}>{p.priceType}: {p.amountMinor / 100} {p.currency} ({new Date(p.validFrom).toLocaleString('sr-RS')})</div>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><select value={stock.locationId} onChange={e=>setStock({...stock,locationId:e.target.value})} className="border rounded-lg p-2"><option value="">Lokacija</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><input type="number" placeholder="+/- količina" value={stock.delta} onChange={e=>setStock({...stock,delta:e.target.value})} className="border rounded-lg p-2"/><input placeholder="Serijski broj (opciono)" value={stock.serialNumber} onChange={e=>setStock({...stock,serialNumber:e.target.value})} className="border rounded-lg p-2"/><button onClick={adjust} disabled={!stock.locationId || !stock.delta} className="bg-neutral-900 text-white rounded-lg text-sm">Korekcija stanja</button></div><div className="text-xs text-neutral-600">{balances.map(b => <div key={b.locationId}>{b.locationName || b.locationId}: {b.quantity}</div>)}</div>
    </div>
    <div className="bg-white p-6 rounded-2xl border border-neutral-100"><h3 className="font-bold mb-3">Recenzije</h3><div className="space-y-2">{reviews.length ? reviews.map(r=><div key={r.id} className="border rounded-lg p-3 text-sm"><b>{r.userName}</b> · {r.rating}/5 — {r.comment}<div className="mt-2 flex gap-2"><select value={r.status} onChange={e=>updateReview(r.id,e.target.value)} className="border rounded p-1"><option value="pending">Čeka</option><option value="published">Objavljena</option><option value="rejected">Odbijena</option></select><button onClick={()=>adminCatalogApi.deleteReview(r.id).then(load)} className="text-red-600">Obriši</button></div></div>):<p className="text-sm text-neutral-500">Nema recenzija.</p>}</div></div>
  </div>;
}
