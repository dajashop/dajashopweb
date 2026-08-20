import { useEffect, useState } from 'react';
import { adminCatalogApi, inventoryApi } from '../../../services/dajaPlatform';
import { apiRequest } from '../../../services/apiClient';

export default function ProductOperationsPanel({ productId, variants = [], basePrice = '', onBasePriceChange, onPendingPrice }) {
  const [variantId, setVariantId] = useState(variants[0]?.id || '');
  const [price, setPrice] = useState({ amount: '', type: 'sale', from: '', until: '' });
  const [stock, setStock] = useState({ locationId: '', delta: '', serialNumber: '' });
  const [locations, setLocations] = useState([]);
  const loadLocations = () => apiRequest('/inventory/locations', { staff: true }).then(setLocations).catch(console.error);
  useEffect(() => setVariantId(variants[0]?.id || ''), [variants]);
  useEffect(() => { loadLocations(); }, []);
  useEffect(() => { onPendingPrice?.(price.amount ? price : null); }, [price, onPendingPrice]);
  const adjust = () => inventoryApi.adjust({ variantId, locationId: stock.locationId, quantityDelta: Number(stock.delta), sourceType: 'admin_modal' });
  const inputClass = 'mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200';
  return <div className="space-y-4"><div className="bg-white p-5 rounded-2xl border border-neutral-100 space-y-3"><h3 className="font-bold text-neutral-900">Cene i inventar</h3><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Cena (RSD)<input type="number" value={basePrice} onChange={(e)=>onBasePriceChange?.(e.target.value)} className={inputClass}/></label><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Akcijska cena (RSD)<input type="number" value={price.amount} onChange={(e)=>setPrice({...price,amount:e.target.value,type:'sale'})} className={inputClass}/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Početak akcije<input type="datetime-local" value={price.from} onChange={(e)=>setPrice({...price,from:e.target.value})} className={inputClass}/></label><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Kraj akcije<input type="datetime-local" value={price.until} onChange={(e)=>setPrice({...price,until:e.target.value})} className={inputClass}/></label></div></div></div>;
}
