import './AdminSkeleton.css';

export default function AdminSkeleton({ rows = 5, cards = false, variant = 'list', label = 'Učitavanje podataka' }) {
  return <div className={`admin-skeleton admin-skeleton--${cards ? 'cards' : variant}`} role="status" aria-label={label} aria-busy="true">
    {Array.from({ length: rows }, (_, index) => <div className="admin-skeleton__item" key={index} aria-hidden="true">
      {variant === 'employees' ? <>
        <div className="admin-skeleton__employee-heading"><div className="admin-skeleton__block admin-skeleton__avatar" /><div><div className="admin-skeleton__block admin-skeleton__title" /><div className="admin-skeleton__block admin-skeleton__short" /></div></div>
        <div className="admin-skeleton__metrics">{Array.from({ length: 4 }, (_, i) => <div key={i}><div className="admin-skeleton__block admin-skeleton__short" /><div className="admin-skeleton__block admin-skeleton__number" /></div>)}</div>
        <div className="admin-skeleton__block admin-skeleton__line" /><div className="admin-skeleton__employee-footer"><div className="admin-skeleton__block admin-skeleton__line" /><div className="admin-skeleton__block admin-skeleton__short" /></div>
      </> : variant === 'synonyms' ? <><div className="admin-skeleton__block admin-skeleton__input" /><span>→</span><div className="admin-skeleton__block admin-skeleton__input" /><div className="admin-skeleton__block admin-skeleton__action" /></> : <>
        <div className="admin-skeleton__copy"><div className="admin-skeleton__block admin-skeleton__title" />{variant !== 'taxonomy' && <div className="admin-skeleton__block admin-skeleton__short" />}</div>
        {!cards && <div className="admin-skeleton__actions"><div className="admin-skeleton__block admin-skeleton__action" /><div className="admin-skeleton__block admin-skeleton__action" /></div>}
      </>}
    </div>)}
  </div>;
}

export function AdminDashboardSkeleton() {
  return <div className="container py-8"><div className="admin-skeleton__block admin-skeleton__heading" />
    <div className="admin-skeleton__tabs" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div className="admin-skeleton__block" key={i} />)}</div>
    <div className="flex flex-wrap gap-3 mb-6" aria-hidden="true"><div className="admin-skeleton__block h-11 w-80" /><div className="admin-skeleton__block h-11 w-28" /><div className="admin-skeleton__block h-11 w-36 ml-auto" /></div>
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr>{['Slika', 'Naziv', 'Odeljenje', 'Brend', 'Cena', 'Kolekcija', 'Dobavljač', 'Akcije'].map(label => <th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100"><AdminTableSkeleton columns={8} variant="products" /></tbody></table></div>
  </div>;
}

export function AdminTableSkeleton({ columns = 7, rows = 6, variant = 'text' }) {
  if (variant === 'workforce') return Array.from({ length: rows }, (_, i) => <tr key={`loading-${i}`} aria-hidden="true">
    <td className="p-4"><div className="flex items-center gap-3"><div className="admin-skeleton__block h-16 w-16 shrink-0 rounded-xl" /><div className="w-40"><div className="admin-skeleton__block admin-skeleton__line" /><div className="admin-skeleton__block admin-skeleton__short" /></div></div></td>
    <td className="p-4"><div className="admin-skeleton__block h-4 w-32" /></td>
    <td className="p-4"><div className="admin-skeleton__block h-4 w-24 mb-3" /><div className="flex flex-wrap gap-1 w-80">{Array.from({length:13}, (_, j) => <div className="admin-skeleton__block h-6 w-20 rounded-full" key={j} />)}</div></td>
    <td className="p-4"><div className="admin-skeleton__block admin-skeleton__line" /><div className="admin-skeleton__block admin-skeleton__short" /></td>
    <td className="p-4"><div className="admin-skeleton__block h-8 w-28 mb-2 rounded-full" /><div className="admin-skeleton__block h-8 w-36 rounded-full" /></td>
  </tr>);
  return Array.from({ length: rows }, (_, i) => <tr key={`loading-${i}`} aria-hidden="true">
    {Array.from({ length: columns }, (_, j) => <td key={j} className="p-4">{variant === 'products' && j === 0 ? <div className="admin-skeleton__block admin-skeleton__avatar" /> : variant === 'products' && j === columns - 1 ? <div className="admin-skeleton__actions"><div className="admin-skeleton__block admin-skeleton__action" /><div className="admin-skeleton__block admin-skeleton__action" /></div> : <div className={`admin-skeleton__cell${variant === 'products' && [1, 6].includes(j) ? ' admin-skeleton__cell--wide' : ''}`}><div className="admin-skeleton__block admin-skeleton__line" />{variant === 'products' && [1, 6].includes(j) && <div className="admin-skeleton__block admin-skeleton__short" />}</div>}</td>)}
  </tr>);
}

export function AdminModalSkeleton() {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Učitavanje obrasca">
    <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-[#f5f5f7] border border-white"><div className="border-b bg-white p-6"><div className="admin-skeleton__block admin-skeleton__heading" /></div><div className="grid gap-8 p-6 lg:grid-cols-12"><div className="lg:col-span-7 rounded-xl border bg-white p-5"><div className="grid grid-cols-2 gap-4">{Array.from({length: 8}, (_, i) => <div key={i}><div className="admin-skeleton__block admin-skeleton__short" /><div className="admin-skeleton__block admin-skeleton__input mt-2" /></div>)}</div></div><div className="lg:col-span-5 rounded-xl border bg-white p-5"><div className="admin-skeleton__block admin-skeleton__title" /><div className="admin-skeleton__block aspect-square" /></div></div><div className="border-t bg-white p-5 flex justify-end"><div className="admin-skeleton__block h-11 w-36" /></div></div>
  </div>;
}
