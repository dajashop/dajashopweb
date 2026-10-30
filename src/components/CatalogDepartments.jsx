import { Link } from 'react-router-dom';
import { Watch, Battery, Radio, Glasses } from 'lucide-react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './CatalogDepartments.css';

const departments = [
  { id: 'satovi', path: '/catalog', title: 'Satovi', detail: 'Pronađite svoj model', Icon: Watch },
  { id: 'baterije', path: '/baterije', title: 'Baterije', detail: 'Za satove i uređaje', Icon: Battery },
  { id: 'daljinski', path: '/daljinski', title: 'Daljinski upravljači', detail: 'Izaberite prema uređaju', Icon: Radio },
  { id: 'naocare', path: '/naocare', title: 'Naočare za sunce', detail: 'Izaberite svoj stil', Icon: Glasses },
];

export default function CatalogDepartments({ department }) {
  const { t } = useStorefront();
  return <nav className="catalog-departments" aria-label={t('Izaberite odeljenje')}>
    <p className="catalog-departments__heading">{t('Šta tražite?')}</p>
    <div className="catalog-departments__choices">
      {departments.map(({ id, path, title, detail, Icon }) => <Link key={id} to={path}
        className={`catalog-departments__choice${department === id ? ' is-current' : ''}`}
        aria-current={department === id ? 'location' : undefined}>
        <Icon size={25} strokeWidth={1.5} aria-hidden="true" />
        <span><strong>{t(title)}</strong><small>{t(detail)}</small></span>
      </Link>)}
    </div>
  </nav>;
}
