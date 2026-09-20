import { useEffect, useState } from 'react';
import { workforceApi } from '../../../services/dajaPlatform';
import { rsd } from '../utils/workforce';

const field =
  'rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm min-w-0';

export default function WorkforcePricing({
  userId,
  departments,
  categories,
  onSaved,
}) {
  const [data, setData] = useState(null);
  const [departmentId, setDepartment] = useState('');
  const [categoryId, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    workforceApi
      .pricing(userId)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const save = async (rule) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await workforceApi.savePricing({
        ...(userId ? { userId } : {}),
        ...rule,
      });
      setData(await workforceApi.pricing(userId));
      setNotice('Cenovnik je sačuvan.');
      setAmount('');
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Čuvanje nije uspelo.');
    } finally {
      setBusy(false);
    }
  };
  const ownRules =
    data?.rules?.filter((rule) => (rule.userId || '') === (userId || '')) || [];
  const label = (rule) =>
    `${departments.find((d) => d.id === rule.departmentId)?.name || 'Odeljenje'} / ${rule.categoryId ? categories.find((c) => c.id === rule.categoryId)?.name || 'Kategorija' : 'Sve kategorije'}`;
  return (
    <details className="rounded-2xl border border-neutral-200 bg-white p-5">
      <summary className="cursor-pointer font-bold">
        {userId
          ? 'Poseban cenovnik zaposlenog'
          : 'Podrazumevani cenovnik unosa'}{' '}
        <span className="ml-2 text-sm font-normal text-neutral-500">
          RSD po odobrenom proizvodu
        </span>
      </summary>
      <p className="mt-3 text-sm text-neutral-500">
        Naknada zaposlenom, ne prodajna cena artikla. Izmena važi za buduća prva
        odobrenja; postojeći obračun se ne menja.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {!data ? (
        <p className="mt-3 text-sm">Učitavanje cenovnika…</p>
      ) : (
        <>
          <p className="mt-3 text-sm">
            Opšta cena: <b>{rsd(data.defaultRateMinor)}</b>
            {userId && (
              <>
                {' '}
                · Lična opšta cena:{' '}
                <b>
                  {data.personalRateMinor === null
                    ? 'Nasleđuje podrazumevani cenovnik'
                    : rsd(data.personalRateMinor)}
                </b>
              </>
            )}
          </p>
          <form
            className="mt-4 grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                amount.trim() === '' ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) < 0
              )
                return;
              void save({
                ...(departmentId ? { departmentId } : {}),
                ...(categoryId ? { categoryId } : {}),
                rateMinor: Math.round(Number(amount) * 100),
              });
            }}
          >
            <select
              aria-label="Odeljenje za obračun"
              className={field}
              value={departmentId}
              onChange={(event) => {
                setDepartment(event.target.value);
                setCategory('');
              }}
            >
              <option value="">Opšta cena — sva odeljenja</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Kategorija za obračun"
              className={field}
              disabled={!departmentId}
              value={categoryId}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Sve kategorije</option>
              {categories
                .filter((c) => c.departmentId === departmentId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <input
              aria-label="Naknada po proizvodu u RSD"
              className={field}
              required
              type="number"
              min="0"
              max="100000"
              step="0.01"
              placeholder="Iznos u RSD"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <button
              disabled={busy}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Čuvanje…' : 'Sačuvaj cenu'}
            </button>
          </form>
          <p className="mt-3 text-xs text-neutral-500">
            Prioritet: lična kategorija → lično odeljenje → lična opšta cena →
            podrazumevana kategorija → odeljenje → opšta cena. Nula znači
            naknadu od 0 RSD.
          </p>
          <div className="mt-4 divide-y divide-neutral-100 text-sm">
            {userId && data.personalRateMinor !== null && (
              <div className="flex items-center justify-between gap-3 py-3">
                <span>
                  Lična opšta cena · <b>{rsd(data.personalRateMinor)}</b>
                </span>
                <button
                  disabled={busy}
                  className="text-amber-700"
                  onClick={() => void save({ rateMinor: null })}
                >
                  Vrati na podrazumevano
                </button>
              </div>
            )}
            {ownRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <span>
                  {label(rule)} · <b>{rsd(rule.rateMinor)}</b>
                </span>
                <button
                  disabled={busy}
                  className="text-amber-700"
                  onClick={() =>
                    void save({
                      departmentId: rule.departmentId,
                      ...(rule.categoryId
                        ? { categoryId: rule.categoryId }
                        : {}),
                      rateMinor: null,
                    })
                  }
                >
                  Ukloni pravilo
                </button>
              </div>
            ))}
          </div>
          {userId && data.rules.some((r) => !r.userId) && (
            <details className="mt-3 text-sm text-neutral-500">
              <summary className="cursor-pointer">
                Podrazumevana pravila
              </summary>
              {data.rules
                .filter((r) => !r.userId)
                .map((r) => (
                  <p key={r.id} className="mt-2">
                    {label(r)} · {rsd(r.rateMinor)}
                  </p>
                ))}
            </details>
          )}
          {notice && (
            <p role="status" className="mt-3 text-sm text-emerald-700">
              {notice}
            </p>
          )}
        </>
      )}
    </details>
  );
}
