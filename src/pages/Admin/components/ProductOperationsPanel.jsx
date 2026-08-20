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
  useEffect(() => { if (!productId && basePrice !== '' && !price.amount) setPrice((v) => ({ ...v, amount: String(basePrice) })); }, [productId, basePrice, price.amount]);
  useEffect(() => { loadLocations(); }, []);
  const savePrice = async () => {
    if (!productId) return onPendingPrice?.(price);
    await adminCatalogApi.addVariantPrice(variantId, { amountMinor: Math.round(Number(price.amount) * 100), currency: variants[0]?.currency || 'RSD', priceType: price.type, validFrom: price.from ? new Date(price.from).toISOString() : undefined, validUntil: price.until ? new Date(price.until).toISOString() : null });
  };
  const adjust = () => inventoryApi.adjust({ variantId, locationId: stock.locationId, quantityDelta: Number(stock.delta), sourceType: 'admin_modal' });
  return <div className="space-y-6"><div className="bg-white p-6 rounded-2xl border border-neutral-100 space-y-3"><h3 className="font-bold">Cene i inventar</h3><label>Cena (RSD)<input type="number" value={basePrice} onChange={(e)=>onBasePriceChange?.(e.target.value)} className="w-full border rounded-lg p-2"/></label><label>Akcijska cena (RSD)<input type="number" value={price.amount} onChange={(e)=>setPrice({...price,amount:e.target.value,type:'sale'})} className="w-full border rounded-lg p-2"/></label><label>Početak akcije<input type="datetime-local" value={price.from} onChange={(e)=>setPrice({...price,from:e.target.value})} className="w-full border rounded-lg p-2"/></label><label>Kraj akcije<input type="datetime-local" value={price.until} onChange={(e)=>setPrice({...price,until:e.target.value})} className="w-full border rounded-lg p-2"/></label><button onClick={savePrice} disabled={!price.amount} className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm">Dodaj cenu</button></div></div>;
}
