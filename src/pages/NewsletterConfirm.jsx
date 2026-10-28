import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { novostiApi } from '../services/dajaPlatform.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import './ResetPassword.css';

export default function NewsletterConfirm() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState(token ? 'ready' : 'error');
  const [error, setError] = useState('Link za potvrdu nije potpun. Prijavite se ponovo na novosti.');
  async function confirm() {
    if (status !== 'ready') return;
    setStatus('saving');
    try {
      await novostiApi.confirm(token);
      setStatus('success');
    } catch (requestError) {
      setError(requestError.message || 'Potvrda nije uspela. Pokušajte ponovo.');
      setStatus('error');
    }
  }
  return <section className="reset-password-page" aria-live="polite">
    <SEOHead title="Potvrda prijave na novosti" noIndex={true} />
    <div className="reset-password-page__card">
      <div className="reset-password-page__icon" aria-hidden="true">{status === 'success' ? <CheckCircle2 size={28} /> : <Mail size={28} />}</div>
      <p className="reset-password-page__eyebrow">DajaShop novosti</p>
      <h1>{status === 'success' ? 'Vaša prijava je potvrđena.' : status === 'error' ? 'Potvrda nije uspela.' : 'Potvrdite prijavu na novosti.'}</h1>
      <p className="reset-password-page__copy">{status === 'success' ? 'Dobro došli! Sada možete da primate naše novosti i ponude. Odjava je moguća u svakoj poruci.' : status === 'error' ? error : 'Klikom na dugme potvrđujete da želite da dobijate DajaShop novosti i ponude na ovu email adresu.'}</p>
      {(status === 'ready' || status === 'saving') && <button className="reset-password-page__button" onClick={confirm} disabled={status === 'saving'}>{status === 'saving' ? <><Loader2 size={18} /> Potvrđujemo…</> : 'Potvrdi prijavu'}</button>}
      <Link className="reset-password-page__secondary" to="/">Nazad na DajaShop</Link>
    </div>
  </section>;
}
