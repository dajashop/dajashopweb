import { Link } from 'react-router-dom';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './CatalogDepartments.css';

const departments = [
  { path: '/naocare', title: 'Naočare za sunce', image: '/images/departments/sunglasses.webp' },
  { path: '/daljinski', title: 'Daljinski upravljači', image: '/images/departments/remote.avif' },
  { path: '/baterije', title: 'Baterije', image: '/images/departments/battery.avif' },
];

export default function CatalogDepartments() {
  const { t } = useStorefront();
  return <nav className="other-categories" aria-label={t('Izaberite kategoriju')}>
    {departments.map(({ path, title, image }) => <Link key={path} to={path} className="other-categories__item">
      <div className="other-categories__image"><img src={image} width="512" height="512" alt="" decoding="async" /></div>
      <h2>{t(title)}</h2>
    </Link>)}
  </nav>;
}
