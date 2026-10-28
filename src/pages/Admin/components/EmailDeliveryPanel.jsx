import { useEffect, useRef, useState } from 'react';
import { emailAdminApi } from '../../../services/dajaPlatform.js';

const labels = { pending: 'Čeka slanje', sending: 'Slanje u toku', sent: 'Prihvaćeno u SES', failed: 'Greška', expired: 'Isteklo', suppressed: 'Blokirano' };
const feedbackLabels = {
  Delivery: 'Isporučeno serveru primaoca', DeliveryDelay: 'Dostava kasni', Bounce: 'Odbijeno pri dostavi',
  Complaint: 'Prijavljeno kao spam', Reject: 'SES odbio poruku',
  'Rendering Failure': 'Greška šablona', RenderingFailure: 'Greška šablona',
};
const date = value => value ? new Date(value).toLocaleString('sr-RS') : '—';
const age = value => value ? Date.now() - new Date(value).getTime() : 0;
const problem = type => ['Bounce', 'Complaint', 'Reject', 'Rendering Failure', 'RenderingFailure'].includes(type);

export default function EmailDeliveryPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  async function load() {
    const request = ++latest.current;
    setLoading(true);
    setError('');
    try {
      const result = await emailAdminApi.health();
      if (latest.current === request) setData(result);
    } catch (requestError) {
      if (latest.current === request) setError(requestError.message || 'Pregled email poruka nije dostupan.');
    } finally {
      if (latest.current === request) setLoading(false);
    }
  }
  useEffect(() => { void load(); return () => { latest.current += 1; }; }, []);

  async function retry(id) {
    if (busy) return;
    setBusy(id);
    setNotice('');
    setError('');
    try {
      await emailAdminApi.retry(id);
      setNotice('Novi pokušaj je stavljen u red. Ograničenje slanja i zaštite primaoca i dalje važe.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ponovno slanje nije zakazano.');
    } finally { setBusy(''); }
  }

  const worker = data?.worker;
  const stale = !worker?.heartbeat_at || age(worker.heartbeat_at) > 180000;
  const feedbackStale = !worker?.feedback_checked_at || age(worker.feedback_checked_at) > 120000;
  const delayed = data?.counts?.some(row => ['pending', 'sending'].includes(row.status) && age(row.oldest_at) > 900000);
  const securityDelayed = data?.counts?.some(row => ['pending', 'sending'].includes(row.status) && age(row.oldest_security_at) > 60000);

  return <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 mb-6" aria-busy={loading}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-bold text-lg">Email poruke</h2>
      <button type="button" className="underline text-sm disabled:opacity-50" disabled={loading || Boolean(busy)} onClick={load}>{loading ? 'Osvežavamo…' : 'Osveži pregled'}</button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-emerald-700">{notice}</p>}
    {!data && !error && <p>Učitavamo pregled…</p>}
    {data && <>
      <p className={stale || !worker?.sender_configured ? 'text-amber-800' : 'text-emerald-700'}>
        {stale ? 'Worker se nije skoro javio.' : worker.sender_configured ? 'Worker je aktivan i slanje je podešeno.' : 'Worker je aktivan, ali nedostaju podešavanja za slanje.'} Poslednje javljanje: {date(worker?.heartbeat_at)}.
      </p>
      {(!worker?.feedback_configured || feedbackStale) && <p className="text-amber-800">Obrada povratnih informacija nije podešena ili se nije skoro javila. Proverite worker i SQS.</p>}
      {worker && !worker.product_alerts_configured && <p className="text-amber-800">Workeru nedostaje podešavanje za potpisivanje linkova za obaveštenja o artiklima. Proverite podešavanja servisa.</p>}
      {worker?.feedback_error_at && <p className={age(worker.feedback_error_at) < 3600000 ? 'text-amber-800' : 'text-neutral-500'}>Poslednja zabeležena greška povratne poruke: {date(worker.feedback_error_at)}. Detalji su u logovima; neuspele poruke odlaze u SQS red za greške posle pet pokušaja.</p>}
      {securityDelayed && <p className="text-amber-800">Poruke sa linkovima čekaju duže od jednog minuta. Proverite greške i ograničenje slanja.</p>}
      {delayed && <p className="text-amber-800">Neke poruke čekaju duže od 15 minuta.</p>}
      <div className="flex flex-wrap gap-3">{data.counts.map(row => <span className="rounded-lg bg-neutral-100 px-3 py-2 text-sm" key={row.status}>{labels[row.status] || row.status}: <strong>{row.count}</strong></span>)}</div>
      <div className="flex flex-wrap gap-3">{(data.outcomes || []).map(row => <span key={row.feedback_type || 'waiting'} className={`text-sm ${problem(row.feedback_type) ? 'text-red-700' : row.feedback_type === 'Delivery' ? 'text-emerald-700' : 'text-neutral-600'}`}>{feedbackLabels[row.feedback_type] || 'Čeka potvrdu dostave'}: <strong>{row.count}</strong></span>)}</div>
      <p className="text-xs text-neutral-500">Prihvatanje u SES i dostava su odvojeni koraci. Potvrda dostave znači da je server primaoca prihvatio poruku; ne potvrđuje da je poruka u prijemnom sandučetu. Istekle linkove treba ponovo zatražiti.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <caption className="sr-only">Najnovije poruke koje čekaju ili imaju problem pri slanju ili dostavi</caption>
          <thead><tr><th scope="col" className="p-2">Primalac / vrsta</th><th scope="col" className="p-2">Slanje / dostava</th><th scope="col" className="p-2">Vreme / greška</th><th scope="col" className="p-2">Radnja</th></tr></thead>
          <tbody>{data.deliveries.map(row => <tr key={row.id} className="border-t border-neutral-100">
            <td className="p-2">{row.recipient}<br /><span className="text-xs text-neutral-500">{row.tag}</span></td>
            <td className="p-2">{labels[row.status] || row.status} · pokušaji: {row.attempts}<br /><span className={problem(row.feedback_type) ? 'text-red-700' : 'text-neutral-500'}>{feedbackLabels[row.feedback_type] || (row.status === 'sent' ? 'Čeka potvrdu dostave' : 'Još nije poslato')}</span></td>
            <td className="p-2"><span>{date(row.created_at)}</span>{row.last_error && <p className="max-w-lg break-words text-xs text-red-700">{row.last_error}</p>}{row.feedback_at && <p className="text-xs text-neutral-500">Povratna informacija: {date(row.feedback_at)}</p>}</td>
            <td className="p-2">{row.can_retry ? <button type="button" className="underline disabled:opacity-50" disabled={Boolean(busy) || loading} onClick={() => retry(row.id)}>{busy === row.id ? 'Zakazujemo…' : 'Pokušaj ponovo'}</button> : '—'}</td>
          </tr>)}</tbody>
        </table>
        {!data.deliveries.length && <p className="p-2 text-neutral-500">Nema poruka koje čekaju ili zahtevaju pažnju.</p>}
      </div>
    </>}
  </section>;
}
