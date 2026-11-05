import { useEffect, useState } from 'react';
import { apiRequest } from '../../../services/apiClient.js';
import { useStorefront } from '../../../localization/StorefrontContext.jsx';

const states = { queued: 'U redu za slanje', sending: 'Slanje...', accepted: 'Meta je prihvatila poruku',
  sent: 'Poslato', delivered: 'Isporučeno', read: 'Pročitano', failed: 'Neuspešno', unknown: 'Ishod slanja nije potvrđen', cancelled: 'Otkazano' };
export default function WhatsAppPanel() {
  const { t } = useStorefront();
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('sr');
  const [preview, setPreview] = useState(false);
  const [campaignId, setCampaignId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = async () => { try { setData(await apiRequest('/admin/whatsapp', { staff: true })); }
    catch (e) { setError(e.message); } };
  useEffect(() => { void refresh(); }, []);
  const send = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest('/admin/whatsapp/campaigns', { method: 'POST', staff: true, retry: false, body: { campaignId, text, language } });
      setNotice(t('Poruke dodate u red: ') + result.queued);
      setCampaignId(crypto.randomUUID()); setText(''); setPreview(false); await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
    <h2 className="text-2xl font-bold">WhatsApp</h2>
    {error && <p role="alert">{t(error)}</p>}{notice && <p role="status">{notice}</p>}
    <p>{t(data?.available ? 'WhatsApp slanje je uključeno.' : 'WhatsApp slanje čeka Meta podešavanja i aktivaciju.')}</p>
    <button type="button" onClick={() => void refresh()}>{t('Osveži')}</button>
    <ul>{(data?.subscriptions || []).map(s => <li key={s.purpose}>{t(s.purpose === 'newsletter' ? 'Novosti' : s.purpose === 'price_change' ? 'Promena cene' : 'Ponovo na stanju')}: {s.count}</li>)}</ul>
    <p>{t('Kampanja ide samo potvrđenim WhatsApp pretplatnicima na novosti. Odjava: STOP. Poruke se šalju redom do dnevnog limita.')}</p>
    <label className="block">{t('Tekst novosti')}<textarea className="mt-2 block w-full border rounded-lg p-3" rows={5} maxLength={900}
      disabled={busy} value={text} onChange={e => { setText(e.target.value); setCampaignId(crypto.randomUUID()); setPreview(false); }} /></label>
    <p>{text.length}/900</p>
    <label>{t('Jezik primaoca')} <select disabled={busy} value={language} onChange={e => { setLanguage(e.target.value); setCampaignId(crypto.randomUUID()); setPreview(false); }}><option value="sr">Srpski</option><option value="en">English</option></select></label>
    {!preview ? <button type="button" disabled={!data?.available || !text.trim() || busy} onClick={() => setPreview(true)}>{t('Pregled poruke')}</button>
      : <div className="border rounded-lg p-4 space-y-3">
        <p className="whitespace-pre-wrap">{language === 'en' ? `DajaShop news: ${text}. Reply STOP to unsubscribe.` : `DajaShop novosti: ${text}. Za odjavu odgovorite STOP.`}</p>
        <button type="button" disabled={busy} onClick={() => void send()}>{t(busy ? 'Slanje...' : 'Pošalji potvrđenim pretplatnicima')}</button>
        <button type="button" disabled={busy} onClick={() => setPreview(false)}>{t('Izmeni poruku')}</button>
      </div>}
    <p>{t('Nepotvrđeni ishod se ne šalje automatski ponovo da ne bi stigla duplirana poruka.')}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>{t('Vreme')}</th><th>{t('Šablon')}</th><th>{t('Status')}</th><th>{t('Šifra greške')}</th></tr></thead>
      <tbody>{(data?.deliveries || []).map(d => <tr key={d.id}><td>{new Date(d.createdAt).toLocaleString()}</td><td>{d.templateName}</td><td>{t(states[d.state] || d.state)}</td><td>{d.errorCode || '—'}</td></tr>)}</tbody>
    </table></div>
  </section>;
}
