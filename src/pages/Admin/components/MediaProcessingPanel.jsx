import { useEffect, useRef, useState } from 'react';
import { BellRing, ChevronDown, ChevronUp, ImageIcon, Loader2, RefreshCw, Check, ExternalLink, X } from 'lucide-react';
import { mediaProcessingApi, adminCatalogApi } from '../../../services/dajaPlatform.js';
import { useStorefront } from '../../../localization/StorefrontContext.jsx';
import { createPortal } from 'react-dom';

const date = value => value ? new Date(value).toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' }) : '—';
const statusLabels = {
  queued: 'Čeka noćnu obradu', processing: 'Obrada je u toku', failed: 'Obrada nije uspela',
  interrupted: 'Obrada je prekinuta', resolved: 'Uspešno završeno', removed: 'Slika je uklonjena',
  upload_again: 'Dodajte sliku ponovo', dismissed: 'Poruka je zatvorena'
};
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed';

export default function MediaProcessingPanel({ canRetry, onOpenProduct }) {
  const { t } = useStorefront();
  const [open, setOpen] = useState(false);
  const section = useRef(null);
  const lastToast = useRef('');
  const [toast, setToast] = useState(false);
  const [view, setView] = useState('problems');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = () => setRefreshVersion(value => value + 1);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer;
    async function load() {
      if (cancelled || inFlight) return;
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') {
        timer = window.setTimeout(load, 30_000);
        return;
      }
      inFlight = true;
      try {
        const next = await mediaProcessingApi.summary();
        if (cancelled) return;
        setSummary(next);
        if (next.unread > 0 && next.latestEventKey !== lastToast.current) {
          lastToast.current = next.latestEventKey;
          setToast(true);
        }
        if (open) {
          const details = await mediaProcessingApi.list({ view, page });
          if (cancelled) return;
          setList(details);
        }
        setError('');
      } catch (caught) {
        if (!cancelled) setError(caught.message || t('Obaveštenja o slikama trenutno nisu dostupna.'));
      } finally {
        inFlight = false;
        if (!cancelled) timer = window.setTimeout(load, 30_000);
      }
    }
    void load();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('daja:media-status-changed', load);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('daja:media-status-changed', load);
    };
  }, [open, view, page, refreshVersion, t]);

  const items = list?.view === view && list?.page === page ? list.items : [];
  const markRead = async rows => {
    const unread = rows.filter(item => !item.isRead && item.eventKey);
    if (!unread.length) return;
    await mediaProcessingApi.markRead(unread.map(item => ({ id: item.id, eventKey: item.eventKey })));
  };
  const retry = async item => {
    setBusy(item.mediaId); setError(''); setNotice('');
    try {
      const result = await mediaProcessingApi.retry(item.mediaId);
      setNotice(t(result.message));
      if (view !== 'queue') await markRead([item]).catch(() => {});
      refresh();
    } catch (caught) { setError(caught.message || t('Ponovni pokušaj nije zakazan.')); refresh(); }
    finally { setBusy(''); }
  };
  const readVisible = async () => {
    setBusy('read'); setError('');
    try { await markRead(items); refresh(); }
    catch (caught) { setError(caught.message || t('Označavanje poruka nije uspelo.')); }
    finally { setBusy(''); }
  };
  const closeAlert = async item => {
    setBusy(item.mediaId); setError('');
    try { await mediaProcessingApi.closeAlert(item.id); await markRead([item]).catch(() => {}); refresh(); }
    catch (caught) { setError(caught.message || t('Zatvaranje poruke nije uspelo.')); }
    finally { setBusy(''); }
  };
  const openProduct = async item => {
    setBusy(item.mediaId); setError('');
    try { onOpenProduct?.(await adminCatalogApi.getProduct(item.productId)); }
    catch (caught) { setError(caught.message || t('Otvaranje proizvoda nije uspelo.')); }
    finally { setBusy(''); }
  };

  return <><section ref={section} className={`mb-6 scroll-mt-64 overflow-hidden rounded-2xl border bg-white shadow-sm ${(summary?.openAlerts || summary?.unread) ? 'border-amber-300' : 'border-neutral-200'}`} aria-label={t('Obaveštenja o slikama')}>
    <button type="button" className="flex w-full items-center gap-3 p-4 text-left" onClick={() => {
      if (!open && summary?.openAlerts === 0 && summary?.unread > 0) { setView('history'); setPage(1); }
      setOpen(value => !value);
    }}
      aria-expanded={open} aria-controls="admin-media-notifications">
      <BellRing size={21} className={(summary?.openAlerts || summary?.unread) ? 'text-amber-600' : 'text-neutral-500'} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{t('Slike i obaveštenja')}</span>
        <span className="block text-xs text-neutral-500">{t('Noćna obrada: 03:00–07:00, vreme u Srbiji.')}</span>
      </span>
      <span className="flex flex-wrap justify-end gap-2 text-xs" aria-live="polite">
        {summary ? <>
          {summary.unread > 0 && <span className="rounded-full bg-red-600 px-2 py-1 font-bold text-white">{t('Novih poruka:')} {summary.unread}</span>}
          <span className={summary.openAlerts ? 'font-semibold text-amber-800' : 'text-neutral-600'}>{t('Problemi:')} {summary.openAlerts}</span>
          <span className="text-neutral-600">{t('U redu:')} {summary.pending}</span>
          {summary.processing > 0 && <span className="text-blue-700">{t('Obrađuje se:')} {summary.processing}</span>}
        </> : <span>{t('Učitavanje obaveštenja…')}</span>}
      </span>
      {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
    </button>
    {error && <div className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <span>{error}</span><button type="button" className={button} onClick={refresh}>{t('Osveži')}</button>
    </div>}
    {open && <div id="admin-media-notifications" className="space-y-4 border-t border-neutral-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-lg border border-neutral-200 bg-white p-2 text-sm" aria-label={t('Prikaz obaveštenja')}
          value={view} onChange={event => { setView(event.target.value); setPage(1); setNotice(''); }}>
          <option value="problems">{t('Problemi sa slikama')}</option>
          <option value="queue">{t('Noćni red')}</option>
          <option value="history">{t('Rešene poruke')}</option>
        </select>
        <button type="button" className={button} onClick={refresh}><RefreshCw size={14} />{t('Osveži')}</button>
        {view !== 'queue' && items.some(item => !item.isRead) && <button type="button" className={button} disabled={Boolean(busy)} onClick={readVisible}>
          <Check size={14} />{t('Označi prikazane kao pročitane')}
        </button>}
      </div>
      <p className="text-xs text-neutral-500">{t('Ponovni pokušaj vraća sliku u noćni red. Istovremeno se obrađuje samo jedna slika.')}</p>
      {notice && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
      {!list || list.view !== view || list.page !== page ? <p className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={16} className="animate-spin" />{t('Učitavanje…')}</p>
        : items.length === 0 ? <p className="py-4 text-sm text-neutral-500">{t(view === 'problems' ? 'Nema prijavljenih problema sa slikama.' : view === 'queue' ? 'Noćni red je prazan.' : 'Još nema rešenih poruka.')}</p>
          : <ul className="space-y-3">{items.map(item => <li key={item.id} className={`rounded-xl border p-3 ${view !== 'queue' && !item.isRead ? 'border-amber-200 bg-amber-50/50' : 'border-neutral-200'}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                {item.previewUrl ? <img src={item.previewUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" onError={event => { event.currentTarget.hidden = true; }} /> : <ImageIcon size={23} className="text-neutral-400" />}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="break-words font-semibold">{item.productName || item.filename || t('Slika bez povezanog proizvoda')}</p>
                {item.filename && item.productName && <p className="break-words text-xs text-neutral-500">{item.filename}</p>}
                {item.imageIndex && <p className="text-xs text-neutral-500">{t('Slika:')} {item.imageIndex}</p>}
                <p className={`mt-1 text-xs font-semibold ${['failed','interrupted','upload_again'].includes(item.status) ? 'text-red-700' : 'text-blue-700'}`}>
                  {t(statusLabels[item.status] || 'Čeka noćnu obradu')}{item.phase === 'overnight' ? ` · ${t('Noćna obrada')}` : ` · ${t('Dodavanje slike')}`}
                </p>
                {item.message && <p className="mt-1 break-words text-neutral-700">{t(item.message)}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                  {item.lastFailureAt && <span>{t('Poslednja greška:')} {date(item.lastFailureAt)}</span>}
                  <span>{t('Broj pokušaja:')} {item.attempts ?? item.occurrences ?? 0}</span>
                  {item.retryRequestedAt && !item.resolvedAt && <span>{t('Ponovo zakazano:')} {date(item.retryRequestedAt)}</span>}
                  {item.resolvedAt && <span>{t('Zatvoreno:')} {date(item.resolvedAt)}</span>}
                </div>
                {item.phase === 'upload' && !item.resolvedAt && <p className="mt-2 text-xs text-neutral-500">{t('Za neuspešno dodavanje otvorite proizvod i ponovo dodajte izvorni fajl.')}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {item.productId && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => openProduct(item)}><ExternalLink size={14} />{t('Otvori proizvod')}</button>}
              {canRetry && item.phase === 'upload' && !item.resolvedAt && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => closeAlert(item)}>{t('Zatvori poruku')}</button>}
              {canRetry && item.canRetry && <button type="button" className={`${button} text-blue-700`} disabled={Boolean(busy)} onClick={() => retry(item)}>
                {busy === item.mediaId ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}{t('Pokušaj ponovo')}
              </button>}
            </div>
          </li>)}</ul>}
      {(page > 1 || list?.hasMore) && <div className="flex justify-end gap-2">
        <button type="button" className={button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>{t('Prethodna')}</button>
        <span className="self-center text-xs text-neutral-500">{page}</span>
        <button type="button" className={button} disabled={!list?.hasMore} onClick={() => setPage(value => value + 1)}>{t('Sledeća')}</button>
      </div>}
    </div>}
  </section>
    {toast && summary?.unread > 0 && typeof document !== 'undefined' && createPortal(
      <div role="alert" className="fixed bottom-5 right-4 z-[80] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <BellRing className="shrink-0 text-amber-600" size={21} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t('Nova obaveštenja o slikama')}</p>
            <p className="mt-1 text-xs text-neutral-600">{t('Nepročitanih poruka:')} {summary.unread}</p>
            <button type="button" className={`${button} mt-3 text-blue-700`} onClick={() => {
              setView(summary.openAlerts ? 'problems' : 'history'); setPage(1); setOpen(true); setToast(false);
              window.requestAnimationFrame(() => section.current?.scrollIntoView({ block: 'start' }));
            }}>{t('Pogledaj poruke')}</button>
          </div>
          <button type="button" className="rounded p-1 text-neutral-500 hover:bg-neutral-100" aria-label={t('Zatvori obaveštenje')}
            onClick={() => setToast(false)}><X size={16} /></button>
        </div>
      </div>, document.body)}
  </>;
}
