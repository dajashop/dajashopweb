import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import { privacyApi } from '../services/dajaPlatform.js';
import './LegalDocument.css';

const fallbackTitles = {
  privacy: 'Politika privatnosti',
  cookies: 'Politika kolačića',
  terms: 'Uslovi korišćenja',
};

export default function LegalDocument({ kind }) {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    privacyApi.document(kind)
      .then((value) => {
        if (!cancelled) setDocument(value);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Dokument trenutno nije dostupan.');
      });
    return () => { cancelled = true; };
  }, [kind]);

  const title = document?.title || fallbackTitles[kind];
  return (
    <article className="legal-document container">
      <SEOHead title={title} noIndex={true} />
      <header>
        <h1>{title}</h1>
        {document?.updatedAt && <p>Verzija / datum: {document.version || document.updatedAt}</p>}
      </header>
      {!document && !error && <div className="legal-document__loading"><Loader2 className="animate-spin" size={22} /> Učitavanje dokumenta…</div>}
      {error && <p className="legal-document__error">{error}</p>}
      {document?.ready === false && (
        <aside className="legal-document__draft">
          <AlertTriangle size={20} />
          <span>Ovaj pravni dokument je tehnički nacrt i ne sme biti objavljen kao konačna politika dok ga ne odobrite.</span>
        </aside>
      )}
      {document?.sections?.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
    </article>
  );
}
