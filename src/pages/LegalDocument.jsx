import { useStorefront } from '../localization/StorefrontContext.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import { seoConfig } from '../config/seo.js';
import { LEGAL_DOCUMENTS, LEGAL_POLICY_VERSION } from '../data/legalDocuments.js';
import { useConsent } from '../context/ConsentContext.jsx';
import './LegalDocument.css';

const fallbackTitles = {
  privacy: 'Politika privatnosti',
  cookies: 'Politika kolačića',
  terms: 'Uslovi korišćenja',
  withdrawal: 'Obrazac za odustanak',
};

export default function LegalDocument({ kind }) {
  const { t: translateText, localizePath } = useStorefront();
  const { openSettings } = useConsent();

  const document = LEGAL_DOCUMENTS.find(item => item.kind === kind);

  const title = document?.title || fallbackTitles[kind];
  return (
    <article className="legal-document container">
      <SEOHead title={translateText(title)} noIndex={true} />
      <header>
        <h1>{translateText(title)}</h1>
        <p>{seoConfig.business.name}</p>
        <address>{translateText(seoConfig.business.street)}<br />{seoConfig.business.postalCode} {seoConfig.business.city}</address>
        {document?.updatedAt && <p>{translateText("Verzija / datum: ")}{document.updatedAt} · {LEGAL_POLICY_VERSION}</p>}
      </header>
      <nav className="legal-document__actions" aria-label={translateText('Pravni dokumenti')}>
        <a href={localizePath('/privacy')}>{translateText('Politika privatnosti')}</a>
        <a href={localizePath('/cookies')}>{translateText('Politika kolačića')}</a>
        <a href={localizePath('/terms')}>{translateText('Uslovi kupovine i korišćenja')}</a>
        <a href={localizePath('/withdrawal')}>{translateText('Obrazac za odustanak')}</a>
        <button type="button" onClick={() => window.print()}>{translateText('Odštampaj ili sačuvaj PDF')}</button>
        {kind === 'cookies' && <button type="button" onClick={openSettings}>{translateText('Podesi kolačiće')}</button>}
      </nav>
      {document?.sections?.map((section) => (
        <section key={section.title}>
          <h2>{translateText(section.title)}</h2>
          {section.body?.map((paragraph) => <p key={paragraph}>{translateText(paragraph)}</p>)}
        </section>
      ))}
      <p><a href="mailto:info@dajashop.rs">info@dajashop.rs</a> · <a href="https://www.poverenik.rs/" target="_blank" rel="noopener noreferrer">Poverenik</a> · <a href="https://vansudsko.must.gov.rs/" target="_blank" rel="noopener noreferrer">{translateText('Vansudsko rešavanje sporova')}</a></p>
    </article>
  );
}
