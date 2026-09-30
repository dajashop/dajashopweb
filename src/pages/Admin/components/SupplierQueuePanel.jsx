import React, { useEffect, useRef, useState } from 'react';
import { adminCatalogApi } from '../../../services/dajaPlatform';

const names = {
  ekka: 'Ekka',
  bultime: 'Bultime',
  timezone: 'Timezone',
  qandq: 'Stilius',
};
const date = (value) =>
  value
    ? new Date(value).toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' })
    : '—';
export default function SupplierQueuePanel({ canWrite }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const requestedAt = useRef(0);
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const result = await adminCatalogApi.supplierProviders();
        if (!stopped) {
          setItems(result.items);
          const provider = result.items.find(
            (item) => item.providerCode === busy,
          );
          if (
            provider &&
            !provider.probeRequestedAt &&
            Date.parse(provider.healthCheckedAt || '') >= requestedAt.current
          )
            setBusy('');
        }
      } catch (error) {
        if (!stopped) setMessage(error.message || 'Pregled nije dostupan.');
      }
    };
    void load();
    const timer = window.setInterval(load, busy ? 2_000 : 30_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [busy]);
  const probe = async (code) => {
    requestedAt.current = Date.now();
    setBusy(code);
    setMessage('');
    try {
      await adminCatalogApi.probeSupplier(code);
      setMessage(
        'Zdravstvena proba je zakazana. Pauza se završava samo ako proba uspe.',
      );
    } catch (error) {
      setBusy('');
      setMessage(error.message || 'Proba nije pokrenuta.');
    }
  };
  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-4 text-neutral-800">
      <summary className="cursor-pointer font-semibold">
        Redovi provera dobavljača · ciklus 10 dana
      </summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.providerCode}
            className="rounded border border-neutral-200 p-3 text-xs"
          >
            <strong className="text-sm">{names[item.providerCode]}</strong>
            <p>
              Interval: {item.intervalSeconds / 60} min · zauzeto:{' '}
              {item.occupied}/{item.capacity}
            </p>
            <p>
              Problematični URL-ovi:{' '}
              {item.sampleCount
                ? Math.round((item.badCount / item.sampleCount) * 100)
                : 0}
              % ({item.badCount}/{item.sampleCount}, poslednja 2 sata)
            </p>
            <p>Sledeći ciklus: {date(item.nextCycleAt)}</p>
            {item.pausedUntil && (
              <p className="mt-1 text-amber-700">
                Pauza i sledeća proba: {date(item.pausedUntil)} ·{' '}
                {item.pauseReason}
              </p>
            )}
            {item.healthCheckedAt && (
              <p>
                Proba sajta: {item.healthOk ? 'uspešna' : 'neuspešna'} ·{' '}
                {date(item.healthCheckedAt)}
              </p>
            )}
            {canWrite && (
              <button
                type="button"
                disabled={Boolean(busy) || Boolean(item.probeRequestedAt)}
                onClick={() => void probe(item.providerCode)}
                className="mt-2 text-blue-700 hover:underline disabled:opacity-50"
              >
                {busy === item.providerCode || item.probeRequestedAt
                  ? 'Proverava se…'
                  : 'Proveri sajt i nastavi'}
              </button>
            )}
          </div>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 text-xs">
          {message}
        </p>
      )}
    </details>
  );
}
