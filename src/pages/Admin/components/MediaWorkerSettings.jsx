import { useEffect, useState } from 'react';
import { mediaProcessingApi } from '../../../services/dajaPlatform.js';

const variants = [['avif', 'Veliki AVIF'], ['webp', 'Veliki WebP'], ['avifThumb', 'Mali AVIF'], ['webpThumb', 'Mali WebP']];
const field = 'w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm';
const button = 'rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold disabled:opacity-50';

export default function MediaWorkerSettings({ canManage }) {
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        if (document.visibilityState !== 'visible') return;
        const next = await mediaProcessingApi.worker();
        if (!active) return;
        setStatus(next);
        setOffline(false);
      } catch {
        if (active) setOffline(true);
      } finally {
        if (active) timer = setTimeout(refresh, 30_000);
      }
    }
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  const profile = draft ?? status?.profile;
  const update = (key, name, value) =>
    setDraft({ ...profile, [key]: { ...profile[key], [name]: value } });
  async function save(event) {
    event.preventDefault();
    if (!canManage || !draft || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const { profile: saved } = await mediaProcessingApi.saveWorker(draft);
      setStatus(current => ({ ...current, profile: saved }));
      setDraft(null);
      setMessage('Podešavanja su sačuvana i važe od sledeće slike.');
    } catch (error) { setMessage(error.message || 'Podešavanja nisu sačuvana.'); }
    finally { setSaving(false); }
  }

  const renderFailed = status?.renderErrorAt && (!status.renderCompletedAt ||
    new Date(status.renderErrorAt) > new Date(status.renderCompletedAt));
  return <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold" aria-live="polite">
      <span>DAJA računar · {offline || !status ? 'stanje nije dostupno' : !status.pcEnabled ? 'nije podešen' :
        status.profile.paused ? 'pauziran' : status.pcOnline ? 'povezan' : 'van mreže'}</span>
      <span>Render · {offline || !status ? 'stanje nije dostupno' : !status.renderOnline ? 'nema svežeg signala' :
        renderFailed ? 'poslednja obrada prijavila grešku' : 'rezerva 03:00–07:00 (posle 7 dana)'}</span>
    </div>
    {canManage && profile && <details className="mt-3 border-t border-neutral-200 pt-3">
      <summary className="cursor-pointer font-semibold">Podešavanja lokalne obrade</summary>
      <form onSubmit={save} className="mt-3 space-y-3">
        <fieldset disabled={saving}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {variants.map(([key, label], index) => {
              const value = profile[key];
              const avif = key.startsWith('avif');
              return <fieldset key={key} className="grid min-w-0 grid-cols-3 gap-2 rounded-lg border border-neutral-200 bg-white p-3">
                <legend className="px-1 text-sm font-semibold">{label}</legend>
                {[
                  ['quality', 'Kvalitet', 1, 100],
                  ['effort', 'Effort', 0, avif ? 9 : 6],
                  ['size', 'Max px', 1, index < 2 ? 2048 : 512]
                ].map(([name, title, min, max]) =>
                  <label key={name} className="text-xs">{title}
                    <input className={field} type="number" min={min} max={max} required
                      value={value[name]} onChange={event => update(key, name, event.target.value === '' ? '' : event.target.valueAsNumber)} />
                  </label>)}
                <label className="col-span-2 text-xs">Boja
                  <select className={field} disabled={value.lossless}
                    value={avif ? value.chromaSubsampling : value.smartSubsample ? 'smart' : 'regular'}
                    onChange={event => update(key, avif ? 'chromaSubsampling' : 'smartSubsample',
                      avif ? event.target.value : event.target.value === 'smart')}>
                    {avif ? <><option>4:4:4</option><option>4:2:0</option></>
                      : <><option value="smart">Smart</option><option value="regular">Obična</option></>}
                  </select>
                </label>
                <label className="flex items-end gap-1 pb-2 text-xs">
                  <input type="checkbox" checked={value.lossless} onChange={event => update(key, 'lossless', event.target.checked)} />Lossless
                </label>
              </fieldset>;
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.paused}
              onChange={event => setDraft({ ...profile, paused: event.target.checked })} />Pauziraj preuzimanje novih poslova na računaru</label>
            <button className={`${button} bg-neutral-900 text-white`} disabled={!draft || saving}>Sačuvaj profil</button>
            {draft && <button className={button} type="button" onClick={() => setDraft(null)}>Otkaži izmene</button>}
          </div>
        </fieldset>
        {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}
      </form>
    </details>}
  </div>;
}
