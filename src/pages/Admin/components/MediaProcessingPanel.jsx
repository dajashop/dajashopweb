import { useEffect, useRef, useState } from 'react';
import { BellRing, ImageIcon, Loader2, RefreshCw, Check, ExternalLink, X, Download, Search } from 'lucide-react';
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

export default function MediaProcessingPanel({ visible, canRetry, onOpenProduct, onActivate, onSummary }) {
  const { t } = useStorefront();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [phase, setPhase] = useState('all');
  const [unread, setUnread] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const lastToast = useRef('');
  const [toast, setToast] = useState(false);
  const [view, setView] = useState('all');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = () => setRefreshVersion(value => value + 1);

  const queryKey = JSON.stringify({ view,page,q,status,phase,unread,sort });
  useEffect(() => {
    const timer = window.setTimeout(() => { setQ(search.trim()); setPage(1); },350);
    return () => window.clearTimeout(timer);
  },[search]);
  useEffect(() => { setSelected([]); },[queryKey]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer;
    async function load() {
      if (cancelled || inFlight) return;
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') {
        if (!visible || autoRefresh) timer = window.setTimeout(load, 30_000);
        return;
      }
      inFlight = true;
      try {
        const next = await mediaProcessingApi.summary();
        if (cancelled) return;
        setSummary(next);
        onSummary?.(next);
        setUpdatedAt(Date.now());
        if (next.unread > 0 && next.latestEventKey !== lastToast.current) {
          lastToast.current = next.latestEventKey;
          if (!visible) setToast(true);
        }
        if (visible) {
          const details = await mediaProcessingApi.list(JSON.parse(queryKey));
          if (cancelled) return;
          setList({ ...details,queryKey });
        }
        setError('');
      } catch (caught) {
        if (!cancelled) setError(caught.message || t('Obaveštenja o slikama trenutno nisu dostupna.'));
      } finally {
        inFlight = false;
        if (!cancelled && (!visible || autoRefresh)) timer = window.setTimeout(load, 30_000);
      }
    }
    void load();
    const onVisibility = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('daja:media-status-changed', load);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('daja:media-status-changed', load);
    };
  }, [visible, queryKey, refreshVersion, t, onSummary, autoRefresh]);

  const items = list?.queryKey === queryKey ? list.items : [];
  const selectedItems = items.filter(item => selected.includes(item.id));
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
  const selectView = value => {
    setView(value); setPage(1); setStatus('all'); setPhase('all'); setUnread('all'); setNotice('');
  };
  const bulk = async kind => {
    const targets = selectedItems.filter(item => kind === 'retry' ? item.canRetry : item.phase === 'upload' && !item.resolvedAt);
    if (!targets.length) return;
    setBusy('bulk'); setError(''); setNotice('');
    let success = 0;
    const failures = [];
    for (const item of targets) {
      try {
        if (kind === 'retry') await mediaProcessingApi.retry(item.mediaId);
        else await mediaProcessingApi.closeAlert(item.id);
        if (view !== 'queue') await markRead([item]).catch(() => {});
        success += 1;
      } catch (caught) { failures.push(`${item.productName || item.filename || item.mediaId}: ${caught.message}`); }
    }
    setNotice(`${t(kind === 'retry' ? 'Zakazano:' : 'Zatvoreno:')} ${success}. ${t('Neuspešno:')} ${failures.length}.`);
    if (failures.length) setError(failures.slice(0,3).join(' · '));
    setBusy(''); setSelected([]); refresh();
  };
  const exportCsv = () => {
    const cell = value => {
      const raw = String(value ?? '');
      const safe = /^\s*[=+@-]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replaceAll('"','""') + '"';
    };
    const columns = ['Proizvod','Fajl','ID slike','Faza','Status','Pokusaji','Poslednja greska','Poruka'];
    const lines = [columns, ...items.map(item => [item.productName,item.filename,item.mediaId,item.phase,
      t(statusLabels[item.status]),item.attempts ?? item.occurrences ?? 0,date(item.lastFailureAt),t(item.message || '')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF'+lines.map(row => row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'slike-obavestenja.csv'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  const readVisible = async () => {
    setBusy('read'); setError('');
    try { await markRead(selectedItems.length ? selectedItems : items); refresh(); }
    catch (caught) { setError(caught.message || t('Označavanje poruka nije uspelo.')); }
    finally { setBusy(''); }
  };
  const closeAlert = async item => {
    setBusy(item.mediaId); setError('');
    try { await mediaProcessingApi.closeAlert(item.id); await markRead([item]).catch(() => {}); refresh(); }
    catch (caught) { setError(caught.message || t('Zatvaranje poruke nije uspelo.')); }
    finally { setBusy(''); }
  };
  const openProduct = async (item, addImage = false) => {
    setBusy(item.mediaId); setError('');
    try {
      const product = await adminCatalogApi.getProduct(item.productId);
      if (addImage) setNotice(t('U galeriji proizvoda dodajte sliku sa računara ili nalepite njen link, pa sačuvajte promene.'));
      onOpenProduct?.(product);
    }
    catch (caught) { setError(caught.message || t('Otvaranje proizvoda nije uspelo.')); }
    finally { setBusy(''); }
  };

  return <>{visible && <section className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" aria-label={t('Obaveštenja o slikama')}>
    <div className="border-b border-neutral-100 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold"><BellRing size={22} />{t('Slike')}</h2>
      <p className="mt-1 text-sm text-neutral-500">{t('Nove slike prvo obrađuje DAJA računar. Posle sedam dana dostupna je rezervna obrada od 03:00 do 07:00.')}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
        {[
          ['Novih poruka:',summary?.unread,() => { selectView('all'); setUnread('unread'); },'text-red-700'],
          ['Problemi:',summary?.openAlerts,() => selectView('problems'),'text-amber-700'],
          ['U redu:',summary?.pending,() => selectView('queue'),'text-neutral-900'],
          ['Obrađuje se:',summary?.processing,() => { selectView('queue'); setStatus('processing'); },'text-blue-700']
        ].map(([label,count,action,color]) => <button type="button" key={label} onClick={action}
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left hover:border-neutral-400">
          <span className="block text-xs text-neutral-500">{t(label)}</span>
          <span className={`mt-1 block text-2xl font-bold ${color}`}>{count ?? '—'}</span>
        </button>)}
      </div>
    </div>
    {error && <div className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <span>{error}</span><button type="button" className={button} onClick={refresh}>{t('Osveži')}</button>
    </div>}
    <div id="admin-media-notifications" className="space-y-4 border-t border-neutral-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-lg border border-neutral-200 bg-white p-2 text-sm" aria-label={t('Prikaz obaveštenja')}
          value={view} onChange={event => selectView(event.target.value)}>
          <option value="all">{t('Sve poruke')}</option>
          <option value="problems">{t('Problemi sa slikama')}</option>
          <option value="queue">{t('Red za obradu')}</option>
          <option value="history">{t('Rešene poruke')}</option>
        </select>
        <button type="button" className={button} onClick={refresh}><RefreshCw size={14} />{t('Osveži')}</button>
        {view !== 'queue' && items.some(item => !item.isRead) && <button type="button" className={button} disabled={Boolean(busy)} onClick={readVisible}>
          <Check size={14} />{t(selectedItems.length ? 'Označi izabrane kao pročitane' : 'Označi prikazane kao pročitane')}
        </button>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative sm:col-span-2 xl:col-span-1"><Search size={16} className="absolute left-3 top-3 text-neutral-400" />
          <input value={search} maxLength={160} onChange={event => setSearch(event.target.value)}
            aria-label={t('Pretraži proizvod, fajl ili ID slike')} placeholder={t('Pretraži proizvod, fajl ili ID slike')}
            className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm" /></label>
        <select className="rounded-lg border border-neutral-200 p-2 text-sm" aria-label={t('Status slike')} value={status}
          onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="all">{t('Svi statusi')}</option>
          {(view === 'all' ? ['queued','processing','failed','interrupted','upload_again','resolved','removed','dismissed'] : view === 'history' ? ['resolved','removed','dismissed'] : view === 'queue' ? ['queued','processing','failed','interrupted'] : ['queued','processing','failed','interrupted','upload_again'])
            .map(value => <option key={value} value={value}>{t(statusLabels[value])}</option>)}
        </select>
        <select className="rounded-lg border border-neutral-200 p-2 text-sm disabled:opacity-50" aria-label={t('Faza obrade')} value={phase} disabled={view === 'queue'}
          onChange={event => { setPhase(event.target.value); setPage(1); }}>
          <option value="all">{t('Sve faze')}</option><option value="upload">{t('Dodavanje slike')}</option><option value="overnight">{t('Noćna obrada')}</option>
        </select>
        <select className="rounded-lg border border-neutral-200 p-2 text-sm" aria-label={t('Redosled poruka')} value={sort}
          onChange={event => { setSort(event.target.value); setPage(1); }}>
          <option value="newest">{t('Najnovije prvo')}</option><option value="oldest">{t('Najstarije prvo')}</option><option value="attempts">{t('Najviše pokušaja')}</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {view !== 'queue' && <label className="flex items-center gap-2"><input type="checkbox" checked={unread === 'unread'}
          onChange={event => { setUnread(event.target.checked ? 'unread' : 'all'); setPage(1); }} />{t('Samo nepročitane')}</label>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />{t('Automatsko osvežavanje')}</label>
        <button type="button" className={button} onClick={exportCsv} disabled={!items.length}><Download size={14} />{t('Izvezi prikazane (CSV)')}</button>
        {updatedAt && <span className="text-neutral-500">{t('Poslednje osvežavanje:')} {date(updatedAt)}</span>}
      </div>
      {items.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-3 text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedItems.length === items.length} disabled={Boolean(busy)}
          onChange={event => setSelected(event.target.checked ? items.map(item => item.id) : [])} />{t('Izaberi prikazane slike')}</label>
        <span>{t('Izabrano:')} {selectedItems.length}</span>
        {canRetry && selectedItems.some(item => item.canRetry) && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => bulk('retry')}><RefreshCw size={14} />{t('Pokušaj ponovo za izabrane')}</button>}
        {canRetry && selectedItems.some(item => item.phase === 'upload' && !item.resolvedAt) &&
          <button type="button" className={button} disabled={Boolean(busy)} onClick={() => bulk('close')}>{t('Zatvori izabrane poruke')}</button>}
      </div>}
      <p className="text-xs text-neutral-500">{t('Ponovni pokušaj vraća sliku u red za obradu.')}</p>
      {notice && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
      {!list || list.queryKey !== queryKey ? <p className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={16} className="animate-spin" />{t('Učitavanje…')}</p>
        : items.length === 0 ? <p className="py-4 text-sm text-neutral-500">{t(q || status !== 'all' || phase !== 'all' || unread !== 'all' || view === 'all' ? 'Nema poruka za izabrane filtere.' : view === 'problems' ? 'Nema prijavljenih problema sa slikama.' : view === 'queue' ? 'Red za obradu je prazan.' : 'Još nema rešenih poruka.')}</p>
          : <ul className="space-y-3">{items.map(item => <li key={item.id} className={`rounded-xl border p-3 ${view !== 'queue' && !item.isRead ? 'border-amber-200 bg-amber-50/50' : 'border-neutral-200'}`}>
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-4" aria-label={`${t('Izaberi sliku')}: ${item.productName || item.filename || item.mediaId}`}
                checked={selected.includes(item.id)} disabled={Boolean(busy)} onChange={event => setSelected(current => event.target.checked ? [...current,item.id] : current.filter(id => id !== item.id))} />
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                {item.previewUrl ? <img src={item.previewUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" onError={event => { event.currentTarget.hidden = true; }} /> : <ImageIcon size={23} className="text-neutral-400" />}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="break-words font-semibold">{item.productName || item.filename || t('Slika bez povezanog proizvoda')}</p>
                {item.filename && item.productName && <p className="break-words text-xs text-neutral-500">{item.filename}</p>}
                {item.imageIndex && <p className="text-xs text-neutral-500">{t('Slika:')} {item.imageIndex}</p>}
                <p className={`mt-1 text-xs font-semibold ${['failed','interrupted','upload_again'].includes(item.status) ? 'text-red-700' : 'text-blue-700'}`}>
                  {t(item.localWorker && item.status === 'queued' ? 'Čeka DAJA računar' : statusLabels[item.status] || 'Čeka noćnu obradu')}{item.localWorker ? ` · ${t('Lokalna obrada')}` : item.phase === 'overnight' ? ` · ${t('Noćna obrada')}` : ` · ${t('Dodavanje slike')}`}
                </p>
                {item.message && <p className="mt-1 break-words text-neutral-700">{item.resolvedAt && item.phase === 'upload'
                  ? t('Prethodni pokušaj dodavanja nije uspeo. Ova poruka je sačuvana u istoriji.') : t(item.message)}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                  {item.lastFailureAt && <span>{t('Poslednja greška:')} {date(item.lastFailureAt)}</span>}
                  <span>{t('Broj pokušaja:')} {item.attempts ?? item.occurrences ?? 0}</span>
                  {item.retryRequestedAt && !item.resolvedAt && <span>{t('Ponovo zakazano:')} {date(item.retryRequestedAt)}</span>}
                  {item.resolvedAt && <span>{t('Zatvoreno:')} {date(item.resolvedAt)}</span>}
                </div>
                {item.phase === 'upload' && !item.canRetry && <p className="mt-2 text-xs text-neutral-500">{t('Automatsko ponavljanje ovog dodavanja nije dostupno. Dodajte izvorni fajl ili link ponovo u galeriji proizvoda. Postojeće slike ostaju sačuvane.')}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {/^https?:\/\//i.test(item.previewUrl || '') && <a className={button} href={item.previewUrl} target="_blank" rel="noopener noreferrer">{t('Otvori sliku')}</a>}
              {item.productId && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => openProduct(item)}><ExternalLink size={14} />{t('Otvori proizvod')}</button>}
              {canRetry && item.productId && item.phase === 'upload' && !item.canRetry && <button type="button" className={`${button} text-blue-700`} disabled={Boolean(busy)} onClick={() => openProduct(item, true)}>
                {busy === item.mediaId ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}{t('Dodaj sliku ponovo')}
              </button>}
              {view !== 'queue' && !item.isRead && item.eventKey && <button type="button" className={button} disabled={Boolean(busy)} onClick={async () => {
                setBusy(item.mediaId); setError('');
                try { await markRead([item]); refresh(); }
                catch (caught) { setError(caught.message || t('Označavanje poruka nije uspelo.')); }
                finally { setBusy(''); }
              }}><Check size={14} />{t('Označi kao pročitano')}</button>}
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
    </div>
  </section>}
    {toast && summary?.unread > 0 && typeof document !== 'undefined' && createPortal(
      <div role="alert" className="fixed bottom-5 right-4 z-[80] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <BellRing className="shrink-0 text-amber-600" size={21} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t('Nova obaveštenja o slikama')}</p>
            <p className="mt-1 text-xs text-neutral-600">{t('Nepročitanih poruka:')} {summary.unread}</p>
            <button type="button" className={`${button} mt-3 text-blue-700`} onClick={() => {
              selectView('all'); setUnread('unread'); setToast(false); onActivate?.();
            }}>{t('Pogledaj poruke')}</button>
          </div>
          <button type="button" className="rounded p-1 text-neutral-500 hover:bg-neutral-100" aria-label={t('Zatvori obaveštenje')}
            onClick={() => setToast(false)}><X size={16} /></button>
        </div>
      </div>, document.body)}
  </>;
}
