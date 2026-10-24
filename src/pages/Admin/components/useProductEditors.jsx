import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { AdminModalSkeleton } from '../../../components/AdminSkeleton.jsx';
import LoadErrorBoundary from '../../../components/LoadErrorBoundary.jsx';

const loadEditor = () => import('./AdminProductModal.jsx');
const ProductEditor = lazy(loadEditor);
export const prepareProductEditor = () => { void loadEditor().catch(() => {}); };

function SaveNotice({ notice, onDismiss, onRestore }) {
  useEffect(() => {
    if (notice.status !== 'success') return;
    const timer = window.setTimeout(() => onDismiss(notice.id), 5000);
    return () => window.clearTimeout(timer);
  }, [notice.id, notice.status, onDismiss]);
  const pending = notice.status === 'pending';
  const failed = notice.status === 'error';
  const Icon = pending ? LoaderCircle : failed ? CircleAlert : CheckCircle2;
  return (
    <div role="status" aria-live="polite" className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-xl">
      <Icon size={20} className={`mt-0.5 shrink-0 ${pending ? 'animate-spin text-neutral-500' : failed ? 'text-red-600' : 'text-emerald-700'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{pending ? 'Čuvanje…' : failed ? 'Čuvanje nije uspelo' : 'Uspešno sačuvano'}</p>
        <p className="mt-1 truncate text-xs text-neutral-500">{notice.name || 'Novi artikal'}</p>
        {failed && <button type="button" onClick={() => onRestore(notice.id)} className="mt-2 text-xs font-semibold underline">Vrati se na unos</button>}
      </div>
      {!pending && <button type="button" onClick={() => onDismiss(notice.id)} aria-label="Zatvori obaveštenje" className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><X size={16} /></button>}
    </div>
  );
}

// Keep each form mounted until its own request finishes, even when another
// product is opened or the administrator switches dashboard sections.
export default function useProductEditors(sharedProps) {
  const [sessions, setSessions] = useState([]);
  const [notices, setNotices] = useState([]);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const dismissNotice = useCallback(id => setNotices(current => current.filter(item => item.id !== id)), []);
  const restore = useCallback(id => setSessions(current => {
    const session = current.find(item => item.id === id);
    return session ? [...current.filter(item => item.id !== id), session] : current;
  }), []);
  const openEditor = useCallback(props => {
    const duplicate = sessionsRef.current.find(item =>
      (props.product?.id && item.props.product?.id === props.product.id) ||
      (props.draft && item.props.onDraftChange),
    );
    if (duplicate) { restore(duplicate.id); return; }
    const session = { id: crypto.randomUUID(), props };
    sessionsRef.current = [...sessionsRef.current, session];
    setSessions(current => [...current, session]);
    void loadEditor().catch(() => {});
  }, [restore]);
  const updateNotice = (id, patch) => setNotices(current => {
    const previous = current.find(item => item.id === id);
    return [...current.filter(item => item.id !== id), { ...previous, id, ...patch }];
  });
  const close = id => setSessions(current => current.filter(item => item.id !== id));
  const pending = notices.some(item => item.status === 'pending');
  useEffect(() => {
    if (!pending) return;
    const preventUnload = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [pending]);

  const editors = <>
    {sessions.map((session, index) => (
      <LoadErrorBoundary key={session.id}><Suspense fallback={<AdminModalSkeleton />}>
        <ProductEditor
          {...sharedProps}
          {...session.props}
          stackOrder={index}
          onClose={() => { close(session.id); dismissNotice(session.id); session.props.onClose?.(); }}
          onSaveStart={({ name }) => updateNotice(session.id, { status: 'pending', name })}
          onSaveError={() => { updateNotice(session.id, { status: 'error' }); restore(session.id); }}
          onSuccess={async result => {
            updateNotice(session.id, { status: 'success' });
            close(session.id);
            // A refresh failure must not turn a confirmed save into a failed save.
            try { await session.props.onSuccess?.(result); }
            catch (error) { console.error('Osvežavanje prikaza posle čuvanja nije uspelo:', error); }
          }}
        />
      </Suspense></LoadErrorBoundary>
    ))}
    {createPortal(<div className="pointer-events-none fixed bottom-5 left-5 z-[4100] flex max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-3 overflow-y-auto">
      {notices.map(notice => <SaveNotice key={notice.id} notice={notice} onDismiss={dismissNotice} onRestore={restore} />)}
    </div>, document.body)}
  </>;
  return { openEditor, editors, hasEditors: sessions.length > 0, hasDraftEditor: sessions.some(item => Boolean(item.props.onDraftChange)) };
}
