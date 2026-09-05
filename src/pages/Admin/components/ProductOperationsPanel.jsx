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
  return {
    amount: '',
    costAmount: '',
    type: 'sale',
    from: formatBelgradeDateTime(new Date()),
    until: '',
  };
}

function isCurrentOrScheduledSale(price) {
  if (price.priceType !== 'sale') return false;
  if (price.cancelledAt) return false;
  const validUntil = price.validUntil ? new Date(price.validUntil).getTime() : null;
  return validUntil === null || validUntil > Date.now();
}

export default function ProductOperationsPanel({
  productId,
  basePrice = '',
  onBasePriceChange,
  onPendingPrice,
}) {
  const [price, setPrice] = useState(defaultPrice);
  const [saleChanged, setSaleChanged] = useState(false);
  const [costChanged, setCostChanged] = useState(false);
  const [hasCurrentSale, setHasCurrentSale] = useState(false);

  useEffect(() => {
    if (!productId) {
      setPrice(defaultPrice());
      setSaleChanged(false);
      setCostChanged(false);
      setHasCurrentSale(false);
      return undefined;
    }

    let cancelled = false;
    adminCatalogApi.listVariants(productId)
      .then((items) => items[0]?.id ? adminCatalogApi.listVariantPrices(items[0].id) : [])
      .then((prices) => {
        if (cancelled) return;
        const activeSale = prices.find((item) => {
          if (!isCurrentOrScheduledSale(item)) return false;
          const validFrom = item.validFrom ? new Date(item.validFrom).getTime() : 0;
          return validFrom <= Date.now();
        });
        const currentOrScheduledSale = activeSale || prices.find(isCurrentOrScheduledSale);
        const latestCost = prices.find((item) => item.priceType === 'cost');

        setPrice({
          amount: currentOrScheduledSale
            ? String(Number(currentOrScheduledSale.amountMinor) / 100)
            : '',
          costAmount: latestCost ? String(Number(latestCost.amountMinor) / 100) : '',
          type: 'sale',
          from: formatBelgradeDateTime(currentOrScheduledSale?.validFrom) || defaultPrice().from,
          until: formatBelgradeDateTime(currentOrScheduledSale?.validUntil),
        });
        setHasCurrentSale(Boolean(currentOrScheduledSale));
        setSaleChanged(false);
        setCostChanged(false);
      })
      .catch((error) => console.error('Učitavanje akcijske cene nije uspelo:', error));

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    const changed = saleChanged || costChanged;
    onPendingPrice?.(
      changed
        ? {
            ...price,
            saleChanged,
            costChanged,
          }
        : null,
    );
  }, [price, saleChanged, costChanged, onPendingPrice]);

  const inputClass =
    'mt-1 w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200';

  const changeSale = (field, value) => {
    setSaleChanged(true);
    setPrice((current) => ({ ...current, [field]: value, type: 'sale' }));
  };

  const cancelSale = () => {
    setSaleChanged(true);
    setHasCurrentSale(false);
    setPrice((current) => ({
      ...current,
      amount: '',
      from: defaultPrice().from,
      until: '',
      type: 'sale',
    }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-neutral-100 space-y-3">
        <div>
          <h3 className="font-bold text-neutral-900">Cene i inventar</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Vreme akcije je po vremenskoj zoni Srbije.
          </p>
        </div>

        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Cena (RSD)
          <input
            type="number"
            value={basePrice}
            onChange={(event) => onBasePriceChange?.(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Akcijska cena (RSD)
          <input
            type="number"
            value={price.amount}
            onChange={(event) => changeSale('amount', event.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
            Početak akcije
            <input
              type="datetime-local"
              value={price.from}
              onChange={(event) => changeSale('from', event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
            Kraj akcije
            <input
              type="datetime-local"
              value={price.until}
              onChange={(event) => changeSale('until', event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {hasCurrentSale && (
          <button
            type="button"
            onClick={cancelSale}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            Poništi akciju
          </button>
        )}

        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Nabavna cena (RSD)
          <input
            type="number"
            min="0"
            value={price.costAmount}
            onChange={(event) => {
              setCostChanged(true);
              setPrice((current) => ({ ...current, costAmount: event.target.value }));
            }}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}
