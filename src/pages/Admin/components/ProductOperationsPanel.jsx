import { useEffect, useState } from 'react';
import { adminCatalogApi } from '../../../services/dajaPlatform';

export default function ProductOperationsPanel({ productId, variants = [], basePrice = '', onBasePriceChange, onPendingPrice }) {
  const [price, setPrice] = useState({ amount: '', type: 'sale', from: '', until: '' });
  const [priceChanged, setPriceChanged] = useState(false);
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    adminCatalogApi.listVariants(productId)
      .then((items) => items[0]?.id ? adminCatalogApi.listVariantPrices(items[0].id) : [])
      .then((prices) => {
        if (cancelled) return;
        const latestSale = prices.find((item) => item.priceType === 'sale');
        if (!latestSale) return;
        setPrice({
          amount: String(Number(latestSale.amountMinor) / 100),
          type: 'sale',
          from: latestSale.validFrom ? new Date(latestSale.validFrom).toISOString().slice(0, 16) : '',
          until: latestSale.validUntil ? new Date(latestSale.validUntil).toISOString().slice(0, 16) : '',
        });
      })
      .catch((error) => console.error('Učitavanje akcijske cene nije uspelo:', error));
    return () => { cancelled = true; };
  }, [productId]);
  useEffect(() => { onPendingPrice?.(priceChanged && price.amount ? price : null); }, [price, priceChanged, onPendingPrice]);
  const inputClass = 'mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200';
  const changeSale = (field, value) => {
    setPriceChanged(true);
    setPrice((current) => ({ ...current, [field]: value, type: 'sale' }));
  };
  return <div className="space-y-4"><div className="bg-white p-5 rounded-2xl border border-neutral-100 space-y-3"><h3 className="font-bold text-neutral-900">Cene i inventar</h3><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Cena (RSD)<input type="number" value={basePrice} onChange={(e)=>onBasePriceChange?.(e.target.value)} className={inputClass}/></label><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Akcijska cena (RSD)<input type="number" value={price.amount} onChange={(e)=>changeSale('amount',e.target.value)} className={inputClass}/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Početak akcije<input type="datetime-local" value={price.from} onChange={(e)=>changeSale('from',e.target.value)} className={inputClass}/></label><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Kraj akcije<input type="datetime-local" value={price.until} onChange={(e)=>changeSale('until',e.target.value)} className={inputClass}/></label></div></div></div>;
}
