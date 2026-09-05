import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailX } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import './LegalDocument.css';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const success = params.get('status') === 'success';
  const productAlert = params.get('kind') === 'product-alert';
  const title = productAlert
    ? success
      ? 'Obaveštenje za artikal je isključeno'
      : 'Obaveštenje je već isključeno'
    : success
      ? 'Odjava je potvrđena'
      : 'Ovaj link je već iskorišćen';
  const message = productAlert
    ? success
      ? 'Više nećete dobijati obaveštenja za ovaj artikal. Ostala obaveštenja koja pratite ostaju uključena.'
      : 'Nema aktivnog obaveštenja za ovaj artikal ili je već isključeno.'
    : success
      ? 'Više nećete primati novosti emailom.'
      : 'Nema aktivne prijave za novosti emailom, ili je odjava već izvršena.';
  return (
    <main className="legal-document legal-document--unsubscribe container">
      <SEOHead title="Odjava" noIndex={true} />
      {success ? <CheckCircle2 size={42} /> : <MailX size={42} />}
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  );
}
