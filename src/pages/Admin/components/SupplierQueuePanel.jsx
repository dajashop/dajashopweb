import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Truck,
  Pause,
  Play,
  RefreshCw,
  ExternalLink,
  Download,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { adminCatalogApi } from '../../../services/dajaPlatform';

const NAMES = {
  ekka: 'Ekka',
  bultime: 'Bultime',
  timezone: 'Timezone',
  qandq: 'Stilius',
  linkel: 'Linkel',
  milano: 'Milano',
};
const CODES = Object.keys(NAMES);
const STATUS = {
  available: 'Dostupna stranica',
  missing: 'Stranica ne postoji',
  unverified: 'Nije provereno',
  disabled: 'Isključen',
  checking: 'Proverava se / čeka',
  paused: 'Pauza',
  waiting_confirmation: 'Čeka potvrdu',
};
const date = (value) =>
  value
    ? new Date(value).toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' })
    : '—';
const number = (value) => Number(value || 0).toLocaleString('sr-RS');
const button =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40';
const input =
  'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800';
const panel = 'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm';
function countdown(value, now) {
  if (!value) return '—';
  const delta = Date.parse(value) - now;
  if (!Number.isFinite(delta)) return '—';
  if (delta <= 0) return 'Na čekanju';
  const sec = Math.ceil(delta / 1000);
  return sec >= 86400
    ? `${Math.floor(sec / 86400)}d`
    : sec >= 3600
      ? `${Math.floor(sec / 3600)}h`
      : sec >= 60
        ? `${Math.floor(sec / 60)}m`
        : `${sec}s`;
}
function ProviderSelect({ value, onChange, all = true }) {
  return (
    <select
      className={input}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {all && <option value="all">Svi dobavljači</option>}
      {CODES.map((code) => (
        <option key={code} value={code}>
          {NAMES[code]}
        </option>
      ))}
    </select>
  );
}
function Stat({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
    </div>
  );
}
function Chart({ rows, hours }) {
  const groups = new Map();
  for (const row of rows) {
    const at = new Date(row.hourAt);
    const key =
      hours > 24
        ? at.toLocaleDateString('sr-RS', { timeZone: 'Europe/Belgrade' })
        : at.toLocaleString('sr-RS', {
            timeZone: 'Europe/Belgrade',
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'numeric',
          });
    const old = groups.get(key) || {
      label: key,
      available: 0,
      missing: 0,
      outOfStock: 0,
      errors: 0,
    };
    for (const field of ['available', 'missing', 'outOfStock', 'errors'])
      old[field] += Number(row[field] || 0);
    groups.set(key, old);
  }
  const points = [...groups.values()];
  const max = Math.max(
    1,
    ...points.map((p) => p.available + p.missing + p.outOfStock + p.errors),
  );
  const colors = {
    available: '#10b981',
    missing: '#f59e0b',
    outOfStock: '#a78bfa',
    errors: '#ef4444',
  };
  if (!points.length)
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-neutral-50 text-sm text-neutral-500">
        Još nema završenih provera u ovom periodu.
      </div>
    );
  return (
    <>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${Math.max(600, points.length * 28)} 200`}
          className="min-w-[600px] w-full"
          role="img"
          aria-label="Završene provere po rezultatu"
        >
          <line
            x1="0"
            y1="172"
            x2={Math.max(600, points.length * 28)}
            y2="172"
            stroke="#d4d4d4"
          />
          {points.map((p, i) => {
            const width = Math.max(600, points.length * 28) / points.length;
            let y = 172;
            return (
              <g key={p.label}>
                {Object.entries(colors).map(([key, color]) => {
                  const h = (p[key] / max) * 150;
                  y -= h;
                  return (
                    <rect
                      key={key}
                      x={i * width + 4}
                      y={y}
                      width={width - 8}
                      height={h}
                      fill={color}
                    >
                      <title>
                        {p.label}:{' '}
                        {STATUS[key] ||
                          { outOfStock: 'Nema na stanju', errors: 'Greške' }[
                            key
                          ]}{' '}
                        — {p[key]}
                      </title>
                    </rect>
                  );
                })}
                {(i % Math.ceil(points.length / 8) === 0 ||
                  i === points.length - 1) && (
                  <text
                    x={i * width + width / 2}
                    y="192"
                    textAnchor="middle"
                    fontSize="9"
                    fill="#737373"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-600">
        {Object.entries(colors).map(([key, color]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <i
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: color }}
            />
            {
              {
                available: 'Dostupna stranica',
                missing: 'Nestala stranica',
                outOfStock: 'Nema na stanju',
                errors: 'Greška pristupa / parsiranja',
              }[key]
            }
          </span>
        ))}
      </div>
    </>
  );
}
export default function SupplierQueuePanel({ canWrite, onOpenProduct }) {
  const [providers, setProviders] = useState([]),
    [links, setLinks] = useState({ items: [], total: 0 }),
    [statistics, setStatistics] = useState({ items: [], health: {} }),
    [timeline, setTimeline] = useState({ items: [] });
  const [provider, setProvider] = useState('all'),
    [status, setStatus] = useState(''),
    [search, setSearch] = useState(''),
    [searchValue, setSearchValue] = useState(''),
    [attention, setAttention] = useState(false),
    [sort, setSort] = useState('next'),
    [direction, setDirection] = useState('asc'),
    [page, setPage] = useState(1),
    [period, setPeriod] = useState('24h');
  const [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(''),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false),
    [now, setNow] = useState(Date.now());
  const [pause, setPause] = useState(null),
    [pauseMode, setPauseMode] = useState('schedule'),
    [duration, setDuration] = useState('24'),
    [until, setUntil] = useState(''),
    [reason, setReason] = useState(''),
    [disableIds, setDisableIds] = useState(null);
  const serial = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue]);
  const filters = useMemo(
    () => ({
      ...(provider === 'all' ? {} : { provider }),
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      attention: String(attention),
      sort,
      direction,
      page,
    }),
    [provider, status, search, attention, sort, direction, page],
  );
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [provider, status, search, attention, sort, direction]);
  const load = useCallback(async () => {
    const request = ++serial.current;
    try {
      const [p, l, s, t] = await Promise.all([
        adminCatalogApi.supplierProviders(),
        adminCatalogApi.supplierLinks(filters),
        adminCatalogApi.supplierStatistics(provider, period),
        adminCatalogApi.supplierTimeline(),
      ]);
      if (request !== serial.current) return;
      setProviders(p.items);
      setLinks(l);
      setStatistics(s);
      setTimeline(t);
      setLoaded(true);
      setError('');
    } catch (e) {
      if (request === serial.current)
        setError(e.message || 'Pregled dobavljača nije dostupan.');
    }
  }, [filters, provider, period]);
  const pending =
    providers.some((p) => p.probeRequestedAt) ||
    links.items.some((l) => l.status === 'checking');
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = setInterval(refresh, busy || pending ? 2000 : 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      ++serial.current;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load, busy, pending]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const run = async (key, fn) => {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
      window.dispatchEvent(new Event('daja:supplier-refresh'));
    } catch (e) {
      setError(e.message || 'Akcija nije uspela.');
    } finally {
      setBusy('');
    }
  };
  const act = (action, ids) =>
    run(action, async () => {
      const result = await adminCatalogApi.supplierActions(
        action,
        ids,
        reason || undefined,
      );
      const accepted = result.items.filter(
        (item) => item.status === 'accepted',
      ).length;
      setMessage(
        `${accepted} prihvaćeno od ${result.items.length}. ${result.items
          .filter((item) => item.status !== 'accepted')
          .map((item) => item.reason)
          .filter(Boolean)
          .join(' · ')}`,
      );
      setSelected([]);
    });
  const openPause = (codes) => {
    setPause(codes);
    setPauseMode('schedule');
    setDuration('24');
    setUntil('');
    setReason('');
  };
  const savePause = () =>
    run('pause', async () => {
      let end = null;
      if (duration === 'date') {
        if (!until || Date.parse(until) <= Date.now())
          throw new Error('Izaberi datum i vreme u budućnosti.');
        end = new Date(until).toISOString();
      } else if (duration !== 'manual')
        end = new Date(Date.now() + Number(duration) * 3600000).toISOString();
      await adminCatalogApi.pauseSuppliers({
        providers: pause,
        mode: pauseMode,
        until: end,
        reason,
      });
      setPause(null);
      setMessage('Ručna pauza je postavljena za ceo backend.');
    });
  const exportCsv = () =>
    run('export', async () => {
      const csv = await adminCatalogApi.supplierLinks(filters, true);
      const url = URL.createObjectURL(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `dobavljaci-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Izvezeni su svi linkovi trenutnog filtera.');
    });
  const totals = providers.reduce(
    (a, p) => ({
      active: a.active + Number(p.ownActive || 0),
      disabled: a.disabled + Number(p.ownDisabled || 0),
      problems: a.problems + Number(p.problems || 0),
      initial: a.initial + Number(p.initialPending || 0),
    }),
    { active: 0, disabled: 0, problems: 0, initial: 0 },
  );
  const sums = statistics.items.reduce((a, row) => {
    for (const field of [
      'completed',
      'available',
      'missing',
      'outOfStock',
      'errors',
      'durationMs',
      'skipped',
      'disabled',
    ])
      a[field] = (a[field] || 0) + Number(row[field] || 0);
    a.maxDurationMs = Math.max(
      a.maxDurationMs || 0,
      Number(row.maxDurationMs || 0),
    );
    return a;
  }, {});
  const toggle = (id) =>
    setSelected((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 50
          ? [...old, id]
          : old,
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Truck />
            Dobavljači
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Provere, redovi čekanja i zdravlje sajtova.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={!!busy}
            onClick={() => void run('refresh', load)}
          >
            <RefreshCw size={14} />
            Osveži
          </button>
          {canWrite && (
            <>
              <button
                className={button}
                disabled={!!busy}
                onClick={() => openPause(CODES)}
              >
                <Pause size={14} />
                Pauziraj sve
              </button>
              <button
                className={button}
                disabled={!!busy || !providers.some((p) => p.manualPaused)}
                onClick={() =>
                  void run('resume', async () => {
                    await adminCatalogApi.resumeSuppliers(CODES);
                    setMessage(
                      'Ručne pauze su ukinute. Automatska zaštita ostaje ako je aktivna.',
                    );
                  })
                }
              >
                <Play size={14} />
                Ukini ručne pauze
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"
        >
          {message}
        </p>
      )}
      {!loaded && !error && (
        <p className="text-sm text-neutral-500">Učitavanje dobavljača…</p>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Stat label="Aktivni linkovi firme" value={number(totals.active)} />
        <Stat label="Isključeni linkovi" value={number(totals.disabled)} />
        <Stat
          label="Linkovi sa problemom"
          value={number(totals.problems)}
          tone="text-amber-700"
        />
        <Stat
          label="Početne provere na čekanju"
          value={number(totals.initial)}
        />
        <Stat
          label="Aktivne provere na celom backendu"
          value={`${providers[0]?.systemActive || 0} / 20`}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => {
          const automatic =
              !!p.pausedUntil &&
              (p.intervalSeconds || Date.parse(p.pausedUntil) > now),
            manual = !!p.manualPaused;
          const paused = manual || automatic;
          return (
            <section key={p.providerCode} className={panel}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{NAMES[p.providerCode]}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${paused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
                >
                  {manual && automatic
                    ? 'Obe pauze'
                    : manual
                      ? 'Ručna pauza'
                      : automatic
                        ? 'Automatska zaštita'
                        : 'Radi'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                {[
                  ['Aktivni', p.ownActive],
                  ['Isključeni', p.ownDisabled],
                  ['Neprovereni', p.unverified],
                  ['Problemi', p.problems],
                  ['Čeka potvrdu', p.confirmations],
                  ['Proverava se', p.running],
                ].map(([label, value]) => (
                  <div key={label}>
                    <strong className="block text-lg">{number(value)}</strong>
                    <span className="text-neutral-500">{label}</span>
                  </div>
                ))}
              </div>
              {p.capacity ? (
                <div className="mt-4 text-xs">
                  <div className="flex justify-between">
                    <span>
                      Red: {p.occupied} / {p.capacity}
                    </span>
                    <span>
                      Slobodno: {Math.max(0, p.capacity - p.occupied)} ·{' '}
                      {Math.round((p.occupied / p.capacity) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded bg-neutral-100">
                    <div
                      className="h-full rounded bg-neutral-800"
                      style={{
                        width: `${Math.min(100, (p.occupied / p.capacity) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-neutral-500">
                    Interval {(p.regularIntervalSeconds || p.intervalSeconds) / 60} min · ciklus {p.cycleDays || 10} dana
                  </p>
                  <p className="text-neutral-500">
                    Početak prvog ciklusa: {date(p.cycleEpoch)}
                  </p>
                  <p className="text-neutral-500">
                    Sledeći ciklus: {date(p.nextCycleAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-xs text-neutral-500">
                  Postojeći nedeljni raspored · razmak zahteva najmanje 60s
                </p>
              )}
              <div className="mt-3 space-y-1 text-xs text-neutral-600">
                <p>Poslednja provera: {date(p.lastCheckedAt)}</p>
                <p>
                  {paused ? 'Planirani termin (pauza)' : 'Naredna provera'}:{' '}
                  {date(p.nextCheckAt)}
                </p>
                <p>Početne na čekanju: {number(p.initialPending)}</p>
                <p>
                  Problemi u 2h: {p.badCount}/{p.sampleCount} (
                  {p.sampleCount
                    ? Math.round((p.badCount / p.sampleCount) * 100)
                    : 0}
                  %)
                </p>
                <p>
                  Proba sajta:{' '}
                  {p.healthCheckedAt
                    ? `${p.healthOk ? 'uspešna' : 'neuspešna'} · ${date(p.healthCheckedAt)}`
                    : 'Nije provereno'}
                </p>
              </div>
              {manual && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                  <strong>
                    {p.manualPauseMode === 'all'
                      ? 'Sve provere'
                      : 'Samo raspored'}
                  </strong>
                  <p>
                    {p.manualPauseUntil
                      ? `Do ${date(p.manualPauseUntil)}`
                      : 'Do ručnog nastavka'}
                  </p>
                  <p>{p.manualPauseReason || 'Bez navedenog razloga'}</p>
                  <p className="mt-1 break-all">
                    Postavio: {p.manualPauseBy} · {date(p.manualPauseAt)}
                  </p>
                </div>
              )}
              {automatic && (
                <p className="mt-2 rounded-lg bg-orange-50 p-3 text-xs text-orange-800">
                  {p.pauseReason || 'Zaštita sajta'} · sledeća proba{' '}
                  {date(p.pausedUntil)}
                </p>
              )}
              {canWrite && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={!!busy}
                    onClick={() => openPause([p.providerCode])}
                  >
                    <Pause size={12} />
                    Pauziraj
                  </button>
                  {manual && (
                    <button
                      className={button}
                      disabled={!!busy}
                      onClick={() =>
                        void run('resume', () =>
                          adminCatalogApi.resumeSuppliers([p.providerCode]),
                        )
                      }
                    >
                      <Play size={12} />
                      Ukini pauzu
                    </button>
                  )}
                  <button
                    className={button}
                    disabled={!!busy || !!p.probeRequestedAt}
                    onClick={() =>
                      void run('probe', async () => {
                        await adminCatalogApi.probeSupplier(p.providerCode);
                        setMessage(
                          'Proba sajta je zakazana. Ručna pauza ostaje.',
                        );
                      })
                    }
                  >
                    <RefreshCw size={12} />
                    {p.probeRequestedAt ? 'Proba zakazana…' : 'Proveri sajt'}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Statistika provera</h3>
          <div className="flex gap-2">
            <ProviderSelect value={provider} onChange={setProvider} />
            <select
              className={input}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="24h">24 sata</option>
              <option value="7d">7 dana</option>
              <option value="30d">30 dana</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Prikupljanje od {date(statistics.startedAt)} · čuvanje 30 dana ·
          rezultati artikala tvoje firme
        </p>
        <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label="Završene provere" value={number(sums.completed)} />
          <Stat
            label="Greške pristupa"
            value={`${sums.completed ? Math.round((sums.errors / sums.completed) * 100) : 0}%`}
          />
          <Stat
            label="Prosečno trajanje"
            value={`${((sums.durationMs || 0) / Math.max(1, sums.completed || 0) / 1000).toFixed(1)}s`}
          />
          <Stat
            label="Najduža provera"
            value={`${((sums.maxDurationMs || 0) / 1000).toFixed(1)}s`}
          />
          <Stat label="Propušteni termini" value={number(sums.skipped)} />
          <Stat label="Automatska isključenja" value={number(sums.disabled)} />
        </div>
        <Chart rows={statistics.items} hours={statistics.hours || 24} />
        <p className="mt-4 text-xs text-neutral-500">
          Zajedničke zdravstvene probe: {number(statistics.health?.completed)} ·
          uspešne {number(statistics.health?.available)} · neuspešne{' '}
          {number(statistics.health?.errors)}
        </p>
        <details className="mt-3 text-xs text-neutral-500">
          <summary className="cursor-pointer">
            Kako se tumači stanje kod dobavljača?
          </summary>
          <p className="mt-2">
            Kod Ekke i Stiliusa „Na stanju” može značiti da je proizvodna
            stranica dostupna kada sajt ne objavljuje stanje zaliha. Eksplicitna
            oznaka odsustva zaliha ima prednost. Greška pristupa znači nepoznato
            stanje. Ove provere ne menjaju lokalne zalihe ili cenu firme.
          </p>
        </details>
      </section>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Linkovi dobavljača</h3>
          <button
            className={button}
            disabled={!!busy}
            onClick={() => void exportCsv()}
          >
            <Download size={14} />
            Izvezi CSV
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            className={`${input} min-w-52 flex-1`}
            aria-label="Pretraga linkova"
            placeholder="Pretraži artikal ili URL…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <ProviderSelect value={provider} onChange={setProvider} />
          <select
            className={input}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Svi statusi</option>
            {Object.entries(STATUS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={attention}
              onChange={(e) => setAttention(e.target.checked)}
            />
            Treba pažnju
          </label>
          <select
            aria-label="Sortiranje"
            className={input}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="next">Naredna provera</option>
            <option value="last">Poslednja provera</option>
            <option value="number">Broj u redu</option>
            <option value="name">Naziv artikla</option>
          </select>
          <button
            className={button}
            onClick={() =>
              setDirection((old) => (old === 'asc' ? 'desc' : 'asc'))
            }
          >
            {direction === 'asc' ? 'Rastuće ↑' : 'Opadajuće ↓'}
          </button>
        </div>
        {canWrite && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs text-neutral-500">
              Izabrano {selected.length}/50
            </span>
            <button
              className={button}
              disabled={!!busy || !selected.length}
              onClick={() => void act('check', selected)}
            >
              Proveri izabrane
            </button>
            <button
              className={button}
              disabled={!!busy || !selected.length}
              onClick={() => {
                setReason('');
                setDisableIds(selected);
              }}
            >
              Isključi izabrane
            </button>
            <button
              className={button}
              disabled={!!busy || !selected.length}
              onClick={() => void act('reactivate', selected)}
            >
              Vrati izabrane
            </button>
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="border-b bg-neutral-50 text-neutral-500">
              <tr>
                {canWrite && (
                  <th className="p-3">
                    <input
                      aria-label="Izaberi ovu stranu"
                      type="checkbox"
                      checked={
                        links.items.length > 0 &&
                        links.items.every((l) => selected.includes(l.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? links.items.map((l) => l.id) : [],
                        )
                      }
                    />
                  </th>
                )}
                <th className="p-3">ARTIKAL / DOBAVLJAČ</th>
                <th className="p-3">STANJE</th>
                <th className="p-3">PROVERE</th>
                <th className="p-3">PROBLEM / PAUZA</th>
                <th className="p-3">AKCIJE</th>
              </tr>
            </thead>
            <tbody>
              {links.items.map((link) => (
                <tr
                  key={link.id}
                  className="border-b border-neutral-100 align-top"
                >
                  {canWrite && (
                    <td className="p-3">
                      <input
                        aria-label={`Izaberi ${link.productName}`}
                        type="checkbox"
                        checked={selected.includes(link.id)}
                        onChange={() => toggle(link.id)}
                      />
                    </td>
                  )}
                  <td className="max-w-64 p-3">
                    <button
                      className="text-left font-semibold hover:underline"
                      onClick={() =>
                        void run('open', async () =>
                          onOpenProduct(
                            await adminCatalogApi.getProduct(link.productId),
                          ),
                        )
                      }
                    >
                      {link.productName}
                    </button>
                    <p className="mt-1">
                      {NAMES[link.providerCode]}{' '}
                      {link.queuePosition ? `#${link.queuePosition}` : ''}
                    </p>
                    <a
                      className="mt-1 block truncate text-blue-700"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        [
                          'disabled',
                          'missing',
                          'waiting_confirmation',
                          'paused',
                        ].includes(link.status)
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }
                    >
                      {STATUS[link.status] || link.status}
                    </span>
                    <p className="mt-1 text-neutral-500">
                      {link.stockStatus === 'in_stock'
                        ? 'Na stanju'
                        : link.stockStatus === 'out_of_stock'
                          ? 'Nema na stanju'
                          : 'Stanje zaliha nepoznato'}
                    </p>
                    {link.manualRequestedAt && (
                      <p className="mt-1 text-blue-700">
                        Vanredna provera čeka
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-neutral-500">
                    <p>{date(link.lastCheckedAt)}</p>
                    <p title={date(link.nextCheckAt)} className="mt-1">
                      Naredna: {countdown(link.nextCheckAt, now)}
                    </p>
                    {link.confirmationDueAt && (
                      <p className="mt-1 text-amber-700">
                        Potvrda: {date(link.confirmationDueAt)}
                      </p>
                    )}
                  </td>
                  <td className="max-w-60 p-3 text-neutral-500">
                    {link.disabledReason ||
                      link.firstProblemReason ||
                      link.lastError ||
                      '—'}
                    {link.firstProblemAt && (
                      <p className="mt-1">
                        Prvi problem: {date(link.firstProblemAt)}
                      </p>
                    )}
                    {link.manualPaused && (
                      <p className="mt-1 text-amber-700">
                        Ručna pauza:{' '}
                        {link.manualPauseMode === 'all'
                          ? 'sve provere'
                          : 'raspored'}
                      </p>
                    )}
                    {link.pauseReason && (
                      <p className="mt-1 text-amber-700">{link.pauseReason}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex max-w-44 flex-wrap gap-1">
                      <a
                        className={button}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Otvori stranicu"
                      >
                        <ExternalLink size={12} />
                      </a>
                      <button
                        className={button}
                        disabled={!!busy}
                        onClick={() =>
                          void run('open', async () =>
                            onOpenProduct(
                              await adminCatalogApi.getProduct(link.productId),
                            ),
                          )
                        }
                      >
                        Artikal
                      </button>
                      {canWrite &&
                        (link.checksEnabled ? (
                          <>
                            <button
                              className={button}
                              disabled={!!busy || link.status === 'checking'}
                              onClick={() => void act('check', [link.id])}
                            >
                              Proveri sada
                            </button>
                            <button
                              className={button}
                              disabled={!!busy}
                              onClick={() => {
                                setReason('');
                                setDisableIds([link.id]);
                              }}
                            >
                              Isključi
                            </button>
                          </>
                        ) : (
                          <button
                            className={button}
                            disabled={!!busy}
                            onClick={() => void act('reactivate', [link.id])}
                          >
                            Vrati u proveru
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loaded && !links.items.length && (
            <p className="p-8 text-center text-sm text-neutral-500">
              Nema linkova za izabrane filtere.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>
            {number(links.total)} linkova · strana {page} /{' '}
            {Math.max(1, Math.ceil((links.total || 0) / 50))}
          </span>
          <div className="flex gap-2">
            <button
              className={button}
              disabled={page <= 1}
              onClick={() => {
                setSelected([]);
                setPage(page - 1);
              }}
            >
              Prethodna
            </button>
            <button
              className={button}
              disabled={page * 50 >= links.total}
              onClick={() => {
                setSelected([]);
                setPage(page + 1);
              }}
            >
              Sledeća
            </button>
          </div>
        </div>
      </section>
      <section className={panel}>
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Clock size={18} />
          Narednih 60 minuta
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Zakazani poslovi firme; prazni minuti ne pokreću zahteve.
          Termini tokom blokirajuće pauze nisu prikazani. Zauzetost sistema može odložiti početak.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {Array.from({ length: 60 }, (_, i) => {
            const base =
              Math.floor(
                Date.parse(timeline.now || new Date(now).toISOString()) / 60000,
              ) * 60000;
            const at = base + i * 60000;
            const tasks = timeline.items.filter(
              (t) =>
                Math.max(
                  base,
                  Math.floor(Date.parse(t.nextCheckAt) / 60000) * 60000,
                ) === at,
            );
            return (
              <div
                key={i}
                className={`min-h-16 rounded-lg border p-2 text-xs ${tasks.length ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-100 bg-neutral-50 text-neutral-400'}`}
              >
                <strong>
                  {new Date(at).toLocaleTimeString('sr-RS', {
                    timeZone: 'Europe/Belgrade',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
                {tasks.length ? (
                  tasks.map((t) => (
                    <p key={t.id} className="mt-1 text-[10px] text-emerald-800">
                      {new Date(t.nextCheckAt).toLocaleTimeString('sr-RS', {
                        timeZone: 'Europe/Belgrade',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      {NAMES[t.providerCode]}{' '}
                      {t.queuePosition ? `#${t.queuePosition}` : '· provera'}
                    </p>
                  ))
                ) : (
                  <p className="mt-1">—</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {pause && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-pause-title"
          >
            <div className="flex items-center justify-between">
              <h3 id="supplier-pause-title" className="text-xl font-bold">
                Pauziraj{' '}
                {pause.length === 6 ? 'sve dobavljače' : NAMES[pause[0]]}
              </h3>
              <button
                aria-label="Zatvori"
                className={button}
                disabled={!!busy}
                onClick={() => setPause(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="shrink-0" size={18} />
              Pauza važi za ceo backend i sve firme koje koriste ove dobavljače.
            </p>
            <label className="mt-4 block text-sm">
              Režim
              <select
                className={`${input} mt-1 w-full`}
                value={pauseMode}
                onChange={(e) => setPauseMode(e.target.value)}
              >
                <option value="schedule">Samo raspored</option>
                <option value="all">Sve provere</option>
              </select>
            </label>
            <p className="mt-1 text-xs text-neutral-500">
              {pauseMode === 'schedule'
                ? 'Novi i promenjeni linkovi se i dalje proveravaju. Redovne, potvrdne i vanredne provere čekaju.'
                : 'Čekaju i novi linkovi, provera URL-a i automatske zdravstvene probe. Ručna proba sajta ostaje dostupna.'}
            </p>
            <label className="mt-4 block text-sm">
              Trajanje
              <select
                className={`${input} mt-1 w-full`}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="1">1 sat</option>
                <option value="6">6 sati</option>
                <option value="24">24 sata</option>
                <option value="date">Do izabranog datuma</option>
                <option value="manual">Do ručnog nastavka</option>
              </select>
            </label>
            {duration === 'date' && (
              <input
                aria-label="Kraj pauze"
                className={`${input} mt-2 w-full`}
                type="datetime-local"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            )}
            <label className="mt-4 block text-sm">
              Razlog (opciono)
              <input
                className={`${input} mt-1 w-full`}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="mt-3 text-xs text-neutral-500">
              Već započete provere se završavaju. Propušteni redovni termini se
              ne nadoknađuju.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className={button}
                disabled={!!busy}
                onClick={() => setPause(null)}
              >
                Otkaži
              </button>
              <button
                className={`${button} !bg-neutral-900 !text-white`}
                disabled={!!busy}
                onClick={() => void savePause()}
              >
                Postavi pauzu
              </button>
            </div>
          </div>
        </div>
      )}
      {disableIds && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-disable-title"
          >
            <h3 id="supplier-disable-title" className="text-xl font-bold">
              Isključi {disableIds.length} linkova?
            </h3>
            <p className="mt-3 text-sm text-neutral-600">
              URL-ovi ostaju sačuvani. Mesta u numerisanim redovima se
              oslobađaju.
            </p>
            <input
              aria-label="Razlog isključenja"
              className={`${input} mt-4 w-full`}
              placeholder="Razlog (opciono)"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button className={button} onClick={() => setDisableIds(null)}>
                Otkaži
              </button>
              <button
                className={`${button} !bg-red-600 !text-white`}
                disabled={!!busy}
                onClick={() => {
                  const ids = disableIds;
                  setDisableIds(null);
                  void act('disable', ids);
                }}
              >
                Isključi linkove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
