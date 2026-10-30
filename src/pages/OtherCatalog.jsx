import { Link } from 'react-router-dom';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import CatalogDepartments from '../components/CatalogDepartments.jsx';

export default function OtherCatalog() {
  const { t } = useStorefront();
  const description = 'Naočare za sunce, daljinski upravljači i baterije. Izaberite kategoriju za pregled ponude.';
  return <main className="other-catalog">
    <SEOHead title={t('Ostalo')} description={t(description)} />
    <nav className="other-catalog__breadcrumb" aria-label={t('Putanja stranice')}>
      <Link to="/">{t('Početna')}</Link><span aria-hidden="true">/</span><span aria-current="page">{t('Ostalo')}</span>
    </nav>
    <h1>{t('Ostalo')}</h1>
    <p className="other-catalog__description">{t(description)}</p>
    <CatalogDepartments />
  </main>;
}
