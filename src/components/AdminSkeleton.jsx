import './AdminSkeleton.css';

export default function AdminSkeleton({ rows = 5, cards = false, label = 'Učitavanje podataka' }) {
  return <div className={`admin-skeleton${cards ? ' admin-skeleton--cards' : ''}`} role="status" aria-label={label}>
    {Array.from({ length: rows }, (_, index) => <div className="admin-skeleton__item" key={index} aria-hidden="true">
      <div className="admin-skeleton__block admin-skeleton__title" />
      <div className="admin-skeleton__block admin-skeleton__line" />
      <div className="admin-skeleton__block admin-skeleton__short" />
    </div>)}
  </div>;
}

export function AdminDashboardSkeleton() {
  return <div className="container py-8"><div className="admin-skeleton__block admin-skeleton__heading" />
    <div className="admin-skeleton__tabs" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div className="admin-skeleton__block" key={i} />)}</div>
    <AdminSkeleton rows={6} />
  </div>;
}

export function AdminTableSkeleton({ columns = 7, rows = 6 }) {
  return Array.from({ length: rows }, (_, i) => <tr key={`loading-${i}`} aria-hidden="true">
    {Array.from({ length: columns }, (_, j) => <td key={j} className="p-4"><div className="admin-skeleton__block admin-skeleton__line" /></td>)}
  </tr>);
}

export function AdminModalSkeleton() {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Učitavanje obrasca">
    <div className="w-full max-w-4xl rounded-2xl bg-white p-6"><AdminSkeleton rows={4} /></div>
  </div>;
}
