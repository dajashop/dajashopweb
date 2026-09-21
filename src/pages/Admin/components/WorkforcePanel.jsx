import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CircleAlert,
  Edit3,
  Eye,
  Search,
  Users,
} from 'lucide-react';
import { adminCatalogApi, workforceApi } from '../../../services/dajaPlatform';
import AdminProductModal from './AdminProductModal';
import WorkforcePricing from './WorkforcePricing';
import { rsd } from '../utils/workforce';

const date = (value) =>
  value
    ? new Date(value).toLocaleString('sr-RS', {
        timeZone: 'Europe/Belgrade',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Još nema unosa';
const status = (p) =>
  p.deletedAt
    ? 'Obrisan'
    : {
        approved: 'Odobren',
        changes_requested: 'Vraćen na doradu',
        pending: 'Na proveri',
      }[p.qualityReviewStatus] || 'Na proveri';
const operations = {
  quality_approved: 'Odobreno za obračun',
  quality_changes_requested: 'Vraćeno na doradu',
  created: 'Kreiranje',
  updated: 'Izmena',
  deleted: 'Brisanje',
  create: 'Kreiranje',
  update: 'Izmena',
  delete: 'Brisanje',
};
function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">
        {value ?? 0}
      </p>
    </div>
  );
}
function Bars({ values, label }) {
  const max = Math.max(1, ...values.map((v) => Number(v.count)));
  return (
    <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5">
      <h3 className="text-sm font-bold">{label}</h3>
      <div
        className="mt-5 flex h-28 items-end gap-1"
        role="img"
        aria-label={values.map((v) => `${v.label}: ${v.count}`).join(', ')}
      >
        {values.map((v) => (
          <div
            key={v.label}
            title={`${v.label}: ${v.count} proizvoda`}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <div
              className={`w-full rounded-t ${v.count ? 'bg-emerald-600' : 'bg-neutral-200'}`}
              style={{
                height: `${Math.max(3, (Number(v.count) / max) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-neutral-400">
        <span>{values[0]?.label}</span>
        <span>{values.at(-1)?.label}</span>
      </div>
    </section>
  );
}

export default function WorkforcePanel({ departments = [], categories = [], brands = [] }) {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState('');
  const [revision, setRevision] = useState(0);
  const selection = useRef(0);
  const refresh = () => setRevision((value) => value + 1);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    workforceApi
      .list()
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setError('');
    workforceApi
      .member(selected.id)
      .then((value) => {
        if (!cancelled) setDetail(value);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, revision]);
  const edit = async (product) => {
    const request = ++selection.current;
    setBusy(product.id);
    setError('');
    try {
      const full = await adminCatalogApi.getProduct(product.id);
      if (selection.current === request) setEditing({ full, review: product });
    } catch (err) {
      setError(err.message || 'Artikal nije moguće otvoriti.');
    } finally {
      if (selection.current === request) setBusy('');
    }
  };
  const approve = async (product) => {
    setBusy(product.id);
    setError('');
    try {
      await workforceApi.reviewProduct(product.id, 'approved');
      refresh();
    } catch (err) {
      setError(err.message || 'Odobrenje nije uspelo.');
    } finally {
      setBusy('');
    }
  };
  const worker =
    detail?.summary || members.find((m) => m.id === selected?.id) || selected;
  const products = (detail?.products || [])
    .filter((p) => {
      const matches = `${p.name} ${p.sku || ''} ${p.brand || ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase());
      return (
        matches &&
        (filter === 'all' ||
          (filter === 'incomplete'
            ? !p.deletedAt && p.qualityMissing?.length
            : filter === 'deleted'
              ? p.deletedAt
              : !p.deletedAt && p.qualityReviewStatus === filter))
      );
    })
    .sort(
      (a, b) =>
        Number(b.qualityReviewStatus === 'changes_requested') -
          Number(a.qualityReviewStatus === 'changes_requested') ||
        new Date(b.createdAt) - new Date(a.createdAt),
    );
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          {selected && (
            <button
              className="mb-3 flex items-center gap-2 text-sm text-neutral-500"
              onClick={() => {
                selection.current++;
                setSelected(null);
                setDetail(null);
                setSearch('');
                setFilter('all');
                setError('');
                setBusy('');
              }}
            >
              <ArrowLeft size={16} /> Svi zaposleni
            </button>
          )}
          <h2 className="text-2xl font-bold">
            {selected ? worker.name : 'Učinak zaposlenih'}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {selected
              ? worker.email
              : 'Unosi, kvalitet artikala i naknade — sve na jednom mestu.'}
          </p>
        </div>
        <button
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold"
          disabled={loading}
          onClick={refresh}
        >
          Osveži podatke
        </button>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {!selected ? (
        <>
          <WorkforcePricing
            departments={departments}
            brands={brands}
            onSaved={refresh}
          />
          {loading ? (
            <p role="status" className="p-8 text-center text-neutral-500">
              Učitavanje zaposlenih…
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelected(member)}
                  className="group rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md focus-visible:outline-emerald-600"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-800">
                      {(member.name || '?')
                        .split(' ')
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold">{member.name}</h3>
                      <p className="break-all text-xs text-neutral-500">
                        {member.email}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="text-neutral-400 group-hover:text-emerald-700"
                      size={20}
                    />
                  </div>
                  <div className="my-5 grid grid-cols-3 gap-2">
                    <Metric label="Danas" value={member.createdToday} />
                    <Metric label="Juče" value={member.createdYesterday} />
                    <Metric label="Ukupno" value={member.createdTotal} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    <span className="text-emerald-700">
                      Odobreno: <b>{member.approvedCount}</b>
                    </span>
                    <span>
                      Na proveri: <b>{member.pendingCount}</b>
                    </span>
                    <span className="text-amber-700">
                      Na doradi: <b>{member.changesRequestedCount}</b>
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                    <Clock3 size={15} />
                    <span>
                      Poslednji dodat proizvod
                      <br />
                      <b className="font-medium text-neutral-700">
                        {date(member.lastProductAt)}
                      </b>
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-neutral-500">Obračunato ukupno</span>
                    <b>{rsd(member.approvedAmountMinor)}</b>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && !members.length && !error && (
            <div className="rounded-2xl bg-white p-12 text-center text-neutral-500">
              <Users className="mx-auto mb-3" />
              Još nema zaposlenih ili zabeleženih unosa.
            </div>
          )}
        </>
      ) : !detail ? (
        <p role="status" className="p-8 text-center text-neutral-500">
          {error
            ? 'Detalji nisu učitani. Pokušajte ponovo.'
            : 'Učitavanje statistike i artikala…'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Metric label="Danas" value={worker.createdToday} />
            <Metric label="Juče" value={worker.createdYesterday} />
            <Metric label="Ukupno dodatih" value={worker.createdTotal} />
            <Metric label="Poslednjih 30 dana" value={worker.createdInPeriod} />
            <Metric label="Odobrenih trenutno" value={worker.approvedCount} />
            <Metric label="Na proveri" value={worker.pendingCount} />
            <Metric
              label="Na doradi trenutno"
              value={worker.changesRequestedCount}
            />
            <Metric label="Ukupno vraćanja" value={worker.returnedTotal} />
            <Metric
              label="Različitih vraćenih artikala"
              value={worker.returnedProductsCount}
            />
            <Metric label="Nepotpunih" value={worker.incompleteCount} />
            <Metric label="Obrisanih" value={worker.deletedCount} />
            <Metric
              label="Obračunato ukupno"
              value={rsd(worker.approvedAmountMinor)}
            />
          </div>
          <p className="text-xs text-neutral-500">
            Poslednji unos: {date(worker.lastProductAt)} · Jednokratno
            obračunatih artikala: {worker.creditedCount || 0} · Vreme:
            Europe/Belgrade. Ukupni unosi i obračun uključuju kasnije obrisane
            artikle.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Bars
              label="Unosi po danima — poslednjih 30 dana"
              values={(worker.daily || []).map((d) => ({
                label: d.date.slice(5, 10),
                count: d.count,
              }))}
            />
            <Bars
              label="Današnji unosi po satima"
              values={Array.from({ length: 24 }, (_, h) => ({
                label: `${String(h).padStart(2, '0')}:00`,
                count: worker.hourly?.[String(h).padStart(2, '0')] || 0,
              }))}
            />
          </div>
          <WorkforcePricing
            key={selected.id}
            userId={selected.id}
            departments={departments}
            brands={brands}
            onSaved={refresh}
          />
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
              <h3 className="font-bold">
                Artikli zaposlenog{' '}
                <span className="text-neutral-400">({products.length})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-xl border px-3">
                  <Search size={16} />
                  <input
                    aria-label="Pretraga artikala zaposlenog"
                    className="w-40 py-2 text-sm outline-none"
                    placeholder="Naziv, šifra, brend…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Status artikala"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Svi statusi</option>
                  <option value="pending">Na proveri</option>
                  <option value="changes_requested">Na doradi</option>
                  <option value="approved">Odobreni</option>
                  <option value="incomplete">Nepotpuni</option>
                  <option value="deleted">Obrisani</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    {[
                      'Artikal',
                      'Naknada',
                      'Kontrola kvaliteta',
                      'Unos / izmena',
                      'Akcije',
                    ].map((h) => (
                      <th key={h} className="p-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={
                        product.deletedAt
                          ? 'bg-neutral-50 text-neutral-400'
                          : product.qualityReviewStatus === 'changes_requested'
                            ? 'bg-amber-50'
                            : ''
                      }
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            className="h-16 w-16 rounded-xl border border-neutral-100 bg-white object-contain"
                            src={
                              product.thumbnailUrl ||
                              product.primaryImageUrl ||
                              '/placeholder-watch.svg'
                            }
                            alt=""
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <p className="mt-1 text-xs text-neutral-500">
                              Šifra: {product.sku || '—'}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {[
                                product.department,
                                product.brand,
                                product.category,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap p-4">
                        <b>
                          {product.compensationApprovedAt
                            ? `Obračunato: ${rsd(product.compensationAmountMinor)}`
                            : `Naknada: ${rsd(product.effectiveRateMinor)}`}
                        </b>
                      </td>
                      <td className="max-w-md p-4">
                        <span className="font-semibold">{status(product)}</span>
                        {!product.deletedAt && (
                          <>
                            {product.qualityChecks?.length ? (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {product.qualityChecks.map((check) => (
                                  <span
                                    key={check.label}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                                      check.complete
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                        : 'border-red-200 bg-red-50 text-red-800'
                                    }`}
                                  >
                                    {check.complete ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                                    {check.label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                                {product.qualityMissing?.map((item) => (
                                  <li key={item}>Nedostaje: {item}</li>
                                ))}
                              </ul>
                            )}
                            {product.qualityChecks?.length > 0 && !product.qualityMissing?.length && (
                              <p className="mt-2 text-xs font-medium text-emerald-700">Kompletan artikal — spreman za odobrenje</p>
                            )}
                            {product.qualityReviewNote && (
                              <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-amber-200 bg-amber-100/50 p-2 text-xs text-amber-900">
                                <b>Vaša napomena:</b>{' '}
                                {product.qualityReviewNote}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-4 text-xs text-neutral-500">
                        <p>{date(product.createdAt)}</p>
                        <p className="mt-2">
                          Izmena: {date(product.updatedAt)}
                        </p>
                      </td>
                      <td className="p-4">
                        {!product.deletedAt && (
                          <div className="flex flex-col items-start gap-2">
                            <div className="flex gap-2">
                              <a
                                href={`/product/${product.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Pogledaj proizvod"
                                className="rounded-lg border p-2"
                              >
                                <Eye size={16} />
                              </a>
                              <button
                                disabled={!!busy}
                                title="Izmeni proizvod i napiši napomenu"
                                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                                onClick={() => void edit(product)}
                              >
                                <Edit3 size={14} /> Izmeni
                              </button>
                            </div>
                            {product.qualityReviewStatus !== 'approved' && (
                              <button
                                disabled={!!busy}
                                title="Odobri jednom za obračun"
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                                onClick={() => void approve(product)}
                              >
                                Odobri za obračun
                              </button>
                            )}
                            <button
                              disabled={!!busy}
                              className="text-xs font-semibold text-amber-800"
                              onClick={() => void edit(product)}
                            >
                              Napiši zadatak za doradu
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!products.length && (
              <p className="p-8 text-center text-neutral-500">
                Nema artikala za izabrani filter.
              </p>
            )}
          </section>
          <details className="rounded-2xl border border-neutral-200 bg-white p-5">
            <summary className="cursor-pointer font-bold">
              Istorija rada i kontrole · poslednjih 250 događaja
            </summary>
            <div className="mt-4 divide-y divide-neutral-100">
              {detail.activity.map((event) => (
                <details key={event.id} className="py-3 text-sm">
                  <summary className="cursor-pointer">
                    {operations[event.operation] || event.operation} ·{' '}
                    {detail.products.find((p) => p.id === event.aggregateId)
                      ?.name || event.productName}{' '}
                    <span className="ml-2 text-xs text-neutral-500">
                      {date(event.occurredAt)}
                    </span>
                  </summary>
                  {event.reason && (
                    <p className="mt-2 whitespace-pre-wrap text-amber-800">
                      {event.reason}
                    </p>
                  )}
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-neutral-50 p-3 text-xs">
                    {JSON.stringify(
                      { pre: event.beforePayload, posle: event.afterPayload },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              ))}
              {!detail.activity.length && (
                <p className="text-sm text-neutral-500">
                  Nema zabeleženih aktivnosti.
                </p>
              )}
            </div>
          </details>
        </>
      )}
      {editing && (
        <AdminProductModal
          key={editing.full.id}
          product={editing.full}
          onClose={() => setEditing(null)}
          onSuccess={refresh}
          reviewContext={{ product: editing.review, onReviewed: refresh }}
        />
      )}
    </div>
  );
}
