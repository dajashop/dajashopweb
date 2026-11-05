import { useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient.js';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useConsent } from '../context/ConsentContext.jsx';

export default function WhatsAppSubscription({ contact = '', purpose = 'newsletter', productId, variantId }) {
  const { t, localizePath, language } = useStorefront();
  const { policy } = useConsent();
  const [phone, setPhone] = useState(contact);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!url || !token || confirmed) return undefined;
    let stopped = false;
    let timer;
    const started = Date.now();
    const poll = async () => {
      if (stopped || Date.now() - started > 30 * 60_000) return;
      try {
        const result = await apiRequest('/whatsapp/subscriptions/status', { method: 'POST', auth: false, body: { token } });
        if (stopped) return;
        if (result?.confirmed) { setConfirmed(true); return; }
        if (result?.expired) { setError('Link je istekao. Zatražite novu WhatsApp prijavu.'); setUrl(''); return; }
      } catch { /* Keep the confirmation link usable during a temporary outage. */ }
      if (!stopped) timer = setTimeout(() => void poll(), 5000);
    };
    timer = setTimeout(() => void poll(), 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [url, token, confirmed]);
  const label = purpose === 'newsletter'
    ? 'Želim da primam novosti i ponude putem WhatsApp-a.'
    : purpose === 'price_change' ? 'Želim WhatsApp obaveštenja o promeni cene ovog artikla.'
      : 'Želim WhatsApp obaveštenje kada se ovaj artikal vrati na stanje.';
  const request = async () => {
    setBusy(true); setError('');
    try {
      const result = await apiRequest('/whatsapp/subscriptions/request', { method: 'POST', auth: false,
        body: { phone, purpose, language, ...(productId ? { productId, variantId } : {}), acceptedMarketing: true,
          ...(policy?.version ? { policyVersion: policy.version } : {}), source: 'site_whatsapp' } });
      if (!/^https:\/\/wa\.me\/\d+\?text=/.test(result?.whatsappUrl || '')) throw new Error('Prijava za obaveštenje nije uspela.');
      setUrl(result.whatsappUrl); setToken(result.confirmationToken); setConfirmed(false);
    } catch (e) { setError(e.message || 'Prijava za obaveštenje nije uspela.'); }
    finally { setBusy(false); }
  };
  return <div className="whatsapp-subscription">
    <p>{t('Potvrdite prijavu slanjem pripremljene poruke u WhatsApp-u. Link važi 30 minuta. Prijava postaje aktivna tek kada pošaljete poruku sa unetog broja.')}</p>
    <label>{t('Broj telefona')}<input type="tel" autoComplete="tel" inputMode="tel" placeholder="+381641234567" value={phone}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (accepted && phone.trim() && !busy && !url) void request(); } }}
      disabled={busy} onChange={e => { setPhone(e.target.value); setUrl(''); setConfirmed(false); }} /></label>
    <label className="whatsapp-subscription__consent"><input type="checkbox" checked={accepted} disabled={busy}
      onChange={e => { setAccepted(e.target.checked); setUrl(''); setConfirmed(false); }} />{t(label)}</label>
    <p>{t('Odjava u svakom trenutku: pošaljite STOP u WhatsApp razgovoru. Time isključujete WhatsApp novosti i obaveštenja.')} <a href={localizePath('/whatsapp-privacy')}>{t('Politika privatnosti')}</a></p>
    {error && <p role="alert">{t(error)}</p>}
    {confirmed ? <p role="status">{t('WhatsApp prijava je potvrđena.')}</p> : url ? <a className="whatsapp-subscription__continue" href={url} target="_blank" rel="noopener noreferrer">{t('Otvori WhatsApp i potvrdi prijavu')}</a>
      : <button type="button" disabled={!accepted || !phone.trim() || busy} onClick={() => void request()}>{t(busy ? 'Čuvamo…' : 'Nastavi u WhatsApp-u')}</button>}
  </div>;
}
