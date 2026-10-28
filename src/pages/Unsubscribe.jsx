import { useEffect, useState } from 'react';
import { useEmailLinkRequest } from '../hooks/useEmailLinkRequest.js';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, MailX } from 'lucide-react';
import { privacyApi } from '../services/dajaPlatform.js';
import { isInvalidEmailLink } from '../utils/emailErrors.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import './ResetPassword.css';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const kind = params.get('kind') === 'product-alert' ? 'product-alert' : 'newsletter';
  const token = params.get('token') || '';
  const legacySuccess = ['success', 'already_unsubscribed'].includes(params.get('status'));
  const beginRequest = useEmailLinkRequest(kind + ':' + token);
  const [status, setStatus] = useState(token ? 'ready' : legacySuccess ? 'success' : 'invalid');
  const [error, setError] = useState('');
  const label = kind === 'product-alert' ? 'obaveštenja za ovaj artikal' : 'novosti i ponude';
  useEffect(() => {
    setStatus(token ? 'ready' : legacySuccess ? 'success' : 'invalid');
    setError('');
  }, [token, kind, legacySuccess]);
  async function unsubscribe() {
    if (!token || status !== 'ready') return;
    const request = beginRequest();
    if (!request) return;
    setStatus('saving');
    setError('');
    try {
      await privacyApi.unsubscribe(kind, token);
      if (!request.isCurrent()) return;
      setStatus('success');
    } catch (requestError) {
      if (!request.isCurrent()) return;
      setError(requestError.message || 'Odjava trenutno nije uspela. Pokušajte ponovo.');
      setStatus(isInvalidEmailLink(requestError) ? 'invalid' : 'ready');
    } finally { request.finish(); }
  }
  return <section className="reset-password-page" aria-live="polite">
    <SEOHead title="Odjava" noIndex={true} />
    <div className="reset-password-page__card">
      <div className="reset-password-page__icon">{status === 'success' ? <CheckCircle2 size={28} /> : <MailX size={28} />}</div>
      <h1>{status === 'success' ? 'Odjava je potvrđena.' : 'Potvrdite odjavu.'}</h1>
      <p className="reset-password-page__copy">{status === 'success' ? `Više nećete primati ${label}.` : status === 'invalid' ? 'Link za odjavu nije potpun ili nije važeći. Otvorite link iz email poruke.' : `Klikom na dugme isključujete ${label}.`}</p>
      {['ready', 'saving'].includes(status) && <button className="reset-password-page__button" onClick={unsubscribe} disabled={status === 'saving'}>{status === 'saving' ? 'Čuvamo odjavu…' : 'Potvrdi odjavu'}</button>}
      {error && <p className="reset-password-page__error">{error}</p>}
      <Link to="/" className="reset-password-page__secondary">Nazad na DajaShop</Link>
    </div>
  </section>;
}
