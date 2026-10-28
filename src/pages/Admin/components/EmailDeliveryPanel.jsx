import { useEffect, useState } from 'react';
import { emailAdminApi } from '../../../services/dajaPlatform.js';

const labels = { pending: 'Čeka slanje', sending: 'Slanje u toku', sent: 'Prihvaćeno u SES', failed: 'Greška', expired: 'Isteklo', suppressed: 'Blokirano' };
const date = value => value ? new Date(value).toLocaleString('sr-RS') : '—';

export default function EmailDeliveryPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  async function load() {
    setError('');
    try { setData(await emailAdminApi.health()); }
    catch (requestError) { setError(requestError.message || 'Pregled email poruka nije dostupan.'); }
  }
  useEffect(() => { void load(); }, []);
  async function retry(id) {
    setBusy(id);
    try { await emailAdminApi.retry(id); await load(); }
    catch (requestError) { setError(requestError.message || 'Ponovno slanje nije zakazano.'); }
    finally { setBusy(''); }
  }
  const worker = data?.worker;
  const stale = !worker?.heartbeat_at || Date.now() - new Date(worker.heartbeat_at).getTime() > 180000;
  const feedbackStale = !worker?.feedback_checked_at || Date.now() - new Date(worker.feedback_checked_at).getTime() > 120000;
  const delayed = data?.counts?.some(row => ['pending', 'sending'].includes(row.status) && Date.now() - new Date(row.oldest_at).getTime() > 900000);
  return <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 mb-6">
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-lg">Email poruke</h2><button type="button" className="underline text-sm" onClick={load}>Osveži pregled</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p>Učitavamo pregled…</p>}
    {data && <>
      <p className={stale || !worker?.sender_configured ? 'text-amber-800' : 'text-emerald-700'}>{stale ? 'Worker se nije skoro javio.' : worker.sender_configured ? 'Worker je aktivan i slanje je podešeno.' : 'Worker je aktivan, ali nedostaju podešavanja za slanje.'} Poslednje javljanje: {date(worker?.heartbeat_at)}.</p>
      {(!worker?.feedback_configured || feedbackStale) && <p className="text-amber-800">Obrada povratnih informacija nije podešena ili se nije skoro javila. Proverite worker i SQS.</p>}
      {worker && !worker.product_alerts_configured && <p className="text-amber-800">Workeru nedostaje podešavanje za potpisivanje linkova za obaveštenja o artiklima. Proverite podešavanja servisa.</p>}
      {worker?.feedback_error_at && <p className="text-amber-800">Poslednja greška povratne poruke: {date(worker.feedback_error_at)}. Detalji su u logovima; neuspele poruke odlaze u SQS red za greške posle pet pokušaja.</p>}
      {delayed && <p className="text-amber-800">Neke poruke čekaju duže od 15 minuta. Proverite greške i SES ograničenje slanja.</p>}
      <div className="flex flex-wrap gap-3">{data.counts.map(row => <span className="rounded-lg bg-neutral-100 px-3 py-2 text-sm" key={row.status}>{labels[row.status] || row.status}: <strong>{row.count}</strong></span>)}</div>
      <p className="text-xs text-neutral-500">„Prihvaćeno u SES” označava prihvatanje poruke za slanje. Dostava u sanduče se prati preko SES povratnih događaja. Istekle linkove treba ponovo zatražiti.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Primalac / vrsta</th><th className="p-2">Status / pokušaji</th><th className="p-2">Vreme / greška</th><th /></tr></thead><tbody>{data.deliveries.map(row => <tr key={row.id} className="border-t border-neutral-100">
        <td className="p-2">{row.recipient}<br /><span className="text-xs text-neutral-500">{row.tag}</span></td>
        <td className="p-2">{labels[row.status] || row.status} / {row.attempts}</td>
        <td className="p-2"><span>{date(row.created_at)}</span>{row.last_error && <p className="max-w-lg break-words text-xs text-red-700">{row.last_error}</p>}</td>
        <td className="p-2">{row.can_retry && <button type="button" className="underline disabled:opacity-50" disabled={Boolean(busy)} onClick={() => retry(row.id)}>{busy === row.id ? 'Zakazujemo…' : 'Pokušaj ponovo'}</button>}</td>
      </tr>)}</tbody></table>{!data.deliveries.length && <p className="p-2 text-neutral-500">Nema poruka koje čekaju ili zahtevaju pažnju.</p>}</div>
    </>}
  </section>;
}
