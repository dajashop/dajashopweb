import { useParams } from 'react-router-dom';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import '../../pages/Account.css';
import './AccountNav.css';
import './ProfileSection.css';
import './AddressSection.css';
import './OrdersSection.css';
import './PrivacySection.css';
import './AccountSkeleton.css';

function Block({ width = '100%', height = 16, className = '' }) {
  return <span className={`account-skeleton-block ${className}`} style={{ width, height }} />;
}

function Card({ children, className = '' }) {
  return <div className={`card glass account-skeleton-card ${className}`}>{children}</div>;
}

export function AccountSectionSkeleton({ section = 'profile', contentOnly = false }) {
  const { t } = useStorefront();
  let content;
  if (section === 'profile') {
    content = <>
      <div className="profile-header card glass">
        <Block width={72} height={72} className="account-skeleton-avatar" />
        <div className="profile-info"><Block width="55%" height={27} /><Block width="75%" /></div>
      </div>
      <div className="info-grid">{Array.from({ length: 3 }, (_, i) => <div className="card glass info-card" key={i}><Block width="45%" height={13} /><Block width="70%" height={22} /></div>)}</div>
    </>;
  } else if (section === 'addresses') {
    content = <div className="addresses-grid">{Array.from({ length: 2 }, (_, i) => <Card className="address-card" key={i}><Block width="40%" height={26} /><Block width="65%" height={22} /><Block width="85%" /><Block width="55%" /><Block width="45%" /></Card>)}</div>;
  } else if (section === 'orders') {
    content = <div className="orders-list">{Array.from({ length: 3 }, (_, i) => <div className="order-item card glass" key={i}><Block width={56} height={56} className="account-skeleton-icon" /><div className="order-details"><Block width="55%" height={21} /><Block width="75%" height={14} /></div><Block width={70} height={24} /></div>)}</div>;
  } else if (section === 'privacy') {
    content = <>
      <Card><Block width="55%" height={24} /><div className="privacy-section__choices">{Array.from({ length: 5 }, (_, i) => <div key={i}><Block width="70%" height={13} /><Block width="80%" height={17} /></div>)}</div></Card>
      <div className="privacy-section__grid">{Array.from({ length: 2 }, (_, i) => <Card key={i}><Block width="65%" height={24} /><Block /><Block width="70%" /><Block width={120} height={32} /></Card>)}</div>
    </>;
  } else if (section === 'wishlist') {
    content = <div className="account-skeleton-products">{Array.from({ length: 3 }, (_, i) => <Card key={i}><Block height="auto" className="account-skeleton-product-image" /><Block width="65%" /><Block /><Block width="40%" height={22} /></Card>)}</div>;
  } else {
    content = <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }, (_, i) => <Card key={i}><Block width={44} height={44} /><Block width="60%" height={22} /><Block /><Block width="75%" /><Block width={120} height={32} /></Card>)}</div>;
  }
  return <div className={`section-content account-skeleton${contentOnly ? ' account-skeleton--content-only' : ''}`} role="status" aria-busy="true" aria-label={t('Učitavanje naloga…')}>
    <span className="sr-only">{t('Učitavanje naloga…')}</span>
    <div aria-hidden="true" className="section-content">
      {section !== 'profile' && !contentOnly && <div className="section-header-row"><Block width="min(240px, 65%)" height={29} />{section === 'addresses' && <Block width={130} height={36} />}</div>}
      {content}
    </div>
  </div>;
}

export default function AccountSkeleton({ section: requestedSection }) {
  const { section } = useParams();
  const selected = requestedSection || section;
  const activeSection = ['profile', 'orders', 'addresses', 'privacy', 'wishlist', 'security'].includes(selected) ? selected : 'profile';
  return <div className="container account-dashboard account-skeleton">
    <div className="account-nav desktop-nav card glass" aria-hidden="true">
      <div className="nav-header"><Block width="60%" height={16} /></div>
      <div className="nav-list">{Array.from({ length: 7 }, (_, i) => <div className={i === 6 ? 'nav-item-logout' : 'nav-item'} key={i}><div className="nav-btn"><Block width={20} height={20} /><Block width={i % 2 ? '55%' : '40%'} height={16} /></div></div>)}</div>
    </div>
    <div className="account-mobile-nav" aria-hidden="true"><div className="mobile-dropdown-trigger"><Block width={20} height={20} /><Block width="45%" /><Block width={20} height={20} /></div></div>
    <div className="account-main"><AccountSectionSkeleton section={activeSection} /></div>
  </div>;
}
