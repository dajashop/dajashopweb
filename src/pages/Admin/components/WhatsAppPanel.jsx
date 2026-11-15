import { useEffect, useState } from 'react';
import { apiRequest } from '../../../services/apiClient.js';
import { useStorefront } from '../../../localization/StorefrontContext.jsx';

const states = { queued: 'U redu za slanje', sending: 'Slanje...', accepted: 'Meta je prihvatila poruku',
  sent: 'Poslato', delivered: 'Isporučeno', read: 'Pročitano', failed: 'Neuspešno', unknown: 'Ishod slanja nije potvrđen', cancelled: 'Otkazano' };
export default function WhatsAppPanel() {
  const { t } = useStorefront();
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [language, setLanguage] = useState('sr');
  const [preview, setPreview] = useState(false);
  const [campaignId, setCampaignId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [optOutPhone, setOptOutPhone] = useState('');
  const [optOutScope, setOptOutScope] = useState('all');
  const embeddedLink = text.match(/https?:\/\/[^\s<>"']+/gi)?.map(value => value.replace(/[.,!;:)\]]+$/, ''))
    .find(value => /^https:\/\/dajashop\.rs\//i.test(value));
  const campaignLink = link.trim() || embeddedLink || 'https://dajashop.rs/catalog';
  const validLink = /^https:\/\/dajashop\.rs\/[\S]+$/i.test(campaignLink);
  const refresh = async () => { try { setData(await apiRequest('/admin/whatsapp', { staff: true })); }
    catch (e) { setError(e.message); } };
  useEffect(() => { void refresh(); }, []);
  const send = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest('/admin/whatsapp/campaigns', { method: 'POST', staff: true, retry: false,
        body: { campaignId, text, language, ...(language === 'sr' && link.trim() ? { link: link.trim() } : {}) } });
      setNotice(t('Poruke dodate u red: ') + result.queued);
      setCampaignId(crypto.randomUUID()); setText(''); setLink(''); setPreview(false); await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const recordOptOut = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest('/admin/whatsapp/unsubscribe', { method: 'POST', staff: true, retry: false,
        body: { phone: optOutPhone.trim(), scope: optOutScope } });
      setOptOutPhone('');
      setNotice(t('WhatsApp odjava je evidentirana.'));
      await refresh();
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
    <label className="block">{t('Tekst novosti')}<textarea className="mt-2 block w-full border rounded-lg p-3" rows={5} maxLength={800}
      disabled={busy} value={text} onChange={e => { setText(e.target.value); setCampaignId(crypto.randomUUID()); setPreview(false); }} /></label>
    <p>{text.length}/800</p>
    <label>{t('Jezik primaoca')} <select disabled={busy} value={language} onChange={e => { setLanguage(e.target.value); setCampaignId(crypto.randomUUID()); setPreview(false); }}><option value="sr">Srpski</option><option value="en">English</option></select></label>
    {language === 'sr' && <label className="block">{t('Link za dugme')}
      <input type="url" className="mt-2 block w-full border rounded-lg p-3" disabled={busy} value={link}
        placeholder={embeddedLink || 'https://dajashop.rs/catalog'}
        onChange={e => { setLink(e.target.value); setCampaignId(crypto.randomUUID()); setPreview(false); }} />
      <span>{t('Možeš da nalepiš link ovde ili u tekst poruke. Bez linka, dugme otvara katalog.')}</span>
      {!validLink && <span role="alert">{t('Unesi pun link sa sajta https://dajashop.rs.')}</span>}
    </label>}
    {!preview ? <button type="button" disabled={!data?.available || !text.trim() || busy || (language === 'sr' && !validLink)} onClick={() => setPreview(true)}>{t('Pregled poruke')}</button>
      : <div className="border rounded-lg p-4 space-y-3">
        <p className="whitespace-pre-wrap">{language === 'en' ? `DajaShop commercial message · News and offers\n\n${text}\n\nSend STOP for the newsletter or STOP ALL for all WhatsApp subscriptions.` : `DajaShop novosti i ponude\n\nMožda je baš ovo sat koji nedostaje u tvojoj kolekciji.\n\n${text}\n\nOtvori izdvojenu ponudu preko dugmeta ispod.\n\nSTOP za novosti · STOP SVE za sve WhatsApp pretplate`}</p>
        {language === 'sr' && <a href={campaignLink} target="_blank" rel="noopener noreferrer">Pogledaj ponudu</a>}
        {language === 'en' && <p>Unsubscribe from news · Unsubscribe from all</p>}
        <button type="button" disabled={busy} onClick={() => void send()}>{t(busy ? 'Slanje...' : 'Pošalji potvrđenim pretplatnicima')}</button>
        <button type="button" disabled={busy} onClick={() => setPreview(false)}>{t('Izmeni poruku')}</button>
      </div>}
    <form className="border rounded-lg p-4 space-y-3" onSubmit={recordOptOut}>
      <h3>{t('Evidentiraj zahtev kupca za WhatsApp odjavu')}</h3>
      <label className="block">{t('Broj telefona')} <input type="tel" required placeholder="+381" value={optOutPhone}
        onChange={event => setOptOutPhone(event.target.value)} /></label>
      <label className="block">{t('Obim odjave')} <select value={optOutScope} onChange={event => setOptOutScope(event.target.value)}>
        <option value="all">{t('Sve WhatsApp pretplate')}</option>
        <option value="prices">{t('Sva WhatsApp praćenja cena')}</option>
        <option value="newsletter">{t('Samo WhatsApp novosti')}</option>
      </select></label>
      <button type="submit" disabled={busy || !/^\+381[1-9]\d{6,11}$/.test(optOutPhone.trim())}>{t('Potvrdi odjavu')}</button>
    </form>
    <p>{t('Nepotvrđeni ishod se ne šalje automatski ponovo da ne bi stigla duplirana poruka.')}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>{t('Vreme')}</th><th>{t('Šablon')}</th><th>{t('Status')}</th><th>{t('Šifra greške')}</th></tr></thead>
      <tbody>{(data?.deliveries || []).map(d => <tr key={d.id}><td>{new Date(d.createdAt).toLocaleString()}</td><td>{d.templateName}</td><td>{t(states[d.state] || d.state)}</td><td>{d.errorCode || '—'}</td></tr>)}</tbody>
    </table></div>
  </section>;
}
