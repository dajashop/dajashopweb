import { useEffect, useState } from 'react';
import { adminCatalogApi } from '../../../services/dajaPlatform';

function formatBelgradeDateTime(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

function defaultPrice() {
  return { amount: '', costAmount: '', type: 'sale', from: formatBelgradeDateTime(new Date()), until: '' };
}

export default function ProductOperationsPanel({ productId, variants = [], basePrice = '', onBasePriceChange, onPendingPrice }) {
  const [price, setPrice] = useState(defaultPrice);
  const [priceChanged, setPriceChanged] = useState(false);
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    adminCatalogApi.listVariants(productId)
      .then((items) => items[0]?.id ? adminCatalogApi.listVariantPrices(items[0].id) : [])
      .then((prices) => {
        if (cancelled) return;
        const latestSale = prices.find((item) => item.priceType === 'sale');
        const latestCost = prices.find((item) => item.priceType === 'cost');
        if (!latestSale && !latestCost) {
          setPrice(defaultPrice());
          setPriceChanged(false);
          return;
        }
        setPrice({
          amount: latestSale ? String(Number(latestSale.amountMinor) / 100) : '',
          costAmount: latestCost ? String(Number(latestCost.amountMinor) / 100) : '',
          type: 'sale',
          from: formatBelgradeDateTime(latestSale?.validFrom) || defaultPrice().from,
          until: formatBelgradeDateTime(latestSale?.validUntil),
        });
      })
      .catch((error) => console.error('Učitavanje akcijske cene nije uspelo:', error));
    return () => { cancelled = true; };
  }, [productId]);
  useEffect(() => { onPendingPrice?.(priceChanged && (price.amount || price.costAmount) ? price : null); }, [price, priceChanged, onPendingPrice]);
  const inputClass = 'mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200';
  const changeSale = (field, value) => {
    setPriceChanged(true);
    setPrice((current) => ({ ...current, [field]: value, type: 'sale' }));
  };
  return <div className="space-y-4"><div className="bg-white p-5 rounded-2xl border border-neutral-100 space-y-3"><div><h3 className="font-bold text-neutral-900">Cene i inventar</h3><p className="text-xs text-neutral-500 mt-1">Vreme akcije je po vremenskoj zoni Srbije.</p></div><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Cena (RSD)<input type="number" value={basePrice} onChange={(e)=>onBasePriceChange?.(e.target.value)} className={inputClass}/></label><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Akcijska cena (RSD)<input type="number" value={price.amount} onChange={(e)=>changeSale('amount',e.target.value)} className={inputClass}/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Početak akcije<input type="datetime-local" value={price.from} onChange={(e)=>changeSale('from',e.target.value)} className={inputClass}/></label><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Kraj akcije<input type="datetime-local" value={price.until} onChange={(e)=>changeSale('until',e.target.value)} className={inputClass}/></label></div><label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Nabavna cena (RSD)<input type="number" min="0" value={price.costAmount} onChange={(e)=>{setPriceChanged(true);setPrice((current)=>({...current,costAmount:e.target.value}));}} className={inputClass}/></label></div></div>;
}
