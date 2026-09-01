import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Send } from 'lucide-react';
import { privacyAdminApi } from '../../../services/dajaPlatform.js';
import { useConsent } from '../../../context/ConsentContext.jsx';

export default function PolicyPublicationPanel() {
  const { policy } = useConsent();
  const [publications, setPublications] = useState([]);
  const [summary, setSummary] = useState('');
  const [material, setMaterial] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setPublications(await privacyAdminApi.listPublications());
    } catch (requestError) {
      setError(requestError.message || 'Objave politike nisu dostupne.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const publish = async (event) => {
    event.preventDefault();
    if (!summary.trim()) {
      setError('Upišite sažetak izmene.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await privacyAdminApi.publish({
        version: policy.version,
        material,
        changeSummary: summary.trim(),
      });
      setSummary('');
      setNotice(material
        ? `Objava je sačuvana; ${result.recipientCount} poruka je stavljeno u red.`
        : 'Nematerijalna izmena je sačuvana bez slanja emaila.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Objava nije uspela.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="font-bold text-lg text-neutral-900">Objava politike privatnosti</h2>
        <p className="text-sm text-neutral-500 mt-1">Samo administratori sa dozvolom <code>privacy.manage</code> mogu objaviti verziju iz deployovanog koda.</p>
      </div>
      {!policy.ready && (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm">
          <AlertTriangle size={20} className="shrink-0" />
          <span>Pravni tekst je i dalje nacrt. Objavljivanje i slanje emaila su namerno blokirani dok se ne unese i ne odobri konačan tekst.</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      <form onSubmit={publish} className="grid gap-4 max-w-2xl">
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
          Verzija iz koda
          <input value={policy.version || ''} readOnly className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
          Sažetak izmene za korisnike
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={4000} rows={4} className="rounded-lg border border-neutral-300 px-3 py-2 font-normal" disabled={saving || !policy.ready} />
        </label>
        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={material} onChange={(event) => setMaterial(event.target.checked)} disabled={saving || !policy.ready} className="mt-1" />
          <span><strong>Materijalna izmena</strong><br />Pita korisnike ponovo za pristanak i šalje email verifikovanim nalozima i aktivnim newsletter pretplatnicima.</span>
        </label>
        <button type="submit" disabled={saving || !policy.ready} className="inline-flex w-fit items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Objavi verziju
        </button>
      </form>
      <div>
        <h3 className="font-semibold text-neutral-900">Prethodne objave</h3>
        {loading ? <p className="mt-3 text-sm text-neutral-500">Učitavanje…</p> : publications.length === 0 ? <p className="mt-3 text-sm text-neutral-500">Još nema objavljenih verzija.</p> : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {publications.map((publication) => (
              <li key={publication.id} className="p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2 font-semibold"><span>{publication.version}</span><span>{publication.material ? 'Materijalna' : 'Nematerijalna'} · {publication.sentCount}/{publication.recipientCount} poslato</span></div>
                <p className="mt-1 text-neutral-500">{publication.changeSummary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
