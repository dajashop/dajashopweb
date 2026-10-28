import { useEffect, useState } from 'react';
import { useEmailLinkRequest } from '../hooks/useEmailLinkRequest.js';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { novostiApi, productAlertsApi, productAlertSubscriptions } from '../services/dajaPlatform.js';
import { isEmailLinkToken, isInvalidEmailLink } from '../utils/emailErrors.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import './ResetPassword.css';

export default function NewsletterConfirm({ productAlert = false }) {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const validToken = isEmailLinkToken(token);
  const scope = `${productAlert ? 'product' : 'newsletter'}:${token}`;
  const beginRequest = useEmailLinkRequest(scope);
  const [status, setStatus] = useState(validToken ? 'ready' : 'error');
  const [error, setError] = useState('Link za potvrdu nije potpun. Zatražite novu prijavu.');
  const [active, setActive] = useState(true);
  useEffect(() => {
    setStatus(isEmailLinkToken(token) ? 'ready' : 'error');
    setError('Link za potvrdu nije potpun ili nije važeći. Zatražite novu prijavu.');
    setActive(true);
  }, [token, productAlert]);
  async function confirm() {
    if (!['ready', 'retry'].includes(status)) return;
    const request = beginRequest();
    if (!request) return;
    setStatus('saving');
    try {
      if (productAlert) {
        const result = await productAlertsApi.confirm(token);
        if (!request.isCurrent()) return;
        productAlertSubscriptions.saveContact({ managementToken: result.managementToken, maskedEmail: result.maskedEmail });
        setActive(result.active !== false);
        if (result.active !== false) productAlertSubscriptions.markSubscribed(result.productId, result.variantId, result.type);
        else productAlertSubscriptions.markUnsubscribed(result.productId, result.variantId, result.type);
      } else {
        await novostiApi.confirm(token, { isCurrent: request.isCurrent });
        if (!request.isCurrent()) return;
      }
      setStatus('success');
    } catch (requestError) {
      if (!request.isCurrent()) return;
      setError(requestError.message || 'Potvrda trenutno nije uspela. Pokušajte ponovo.');
      setStatus(isInvalidEmailLink(requestError) ? 'error' : 'retry');
    } finally { request.finish(); }
  }
  const label = productAlert ? 'obaveštenje za artikal' : 'prijavu na novosti';
  return <section className="reset-password-page" aria-live="polite" aria-busy={status === 'saving'}>
    <SEOHead title={productAlert ? 'Potvrda obaveštenja' : 'Potvrda prijave na novosti'} noIndex={true} />
    <div className="reset-password-page__card">
      <div className="reset-password-page__icon" aria-hidden="true">{status === 'success' ? <CheckCircle2 size={28} /> : <Mail size={28} />}</div>
      <p className="reset-password-page__eyebrow">DajaShop {productAlert ? 'obaveštenja' : 'novosti'}</p>
      <h1>{status === 'success' ? 'Vaša potvrda je sačuvana.' : status === 'error' ? 'Link nije važeći.' : `Potvrdite ${label}.`}</h1>
      <p className="reset-password-page__copy">{status === 'success'
        ? productAlert ? active ? 'Obaveštenje je uključeno. Odjava je dostupna u svakoj poruci.' : 'Obaveštenje je već isključeno ili više nije potrebno. Nova prijava je dostupna na stranici artikla.'
          : 'Dobro došli! Sada možete da primate naše novosti i ponude. Odjava je dostupna u svakoj poruci.'
        : ['error', 'retry'].includes(status) ? error : productAlert ? 'Klikom na dugme aktivirate traženo obaveštenje za artikal na ovoj email adresi.' : 'Klikom na dugme potvrđujete da želite da primate naše novosti i ponude na ovoj email adresi.'}</p>
      {['ready', 'retry', 'saving'].includes(status) && <button className="reset-password-page__button" onClick={confirm} disabled={status === 'saving'}>{status === 'saving' ? <><Loader2 size={18} /> Potvrđujemo…</> : status === 'retry' ? 'Pokušaj ponovo' : 'Potvrdi prijavu'}</button>}
      <Link className="reset-password-page__secondary" to="/">Nazad na DajaShop</Link>
    </div>
  </section>;
}
