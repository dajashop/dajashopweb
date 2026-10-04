import { Link } from 'react-router-dom';
import { ArrowRight, House, SearchX, RefreshCw } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';
import './Logout.css';
import './PageStatus.css';

export default function PageStatus({ status = 404 }) {
  const unavailable = status === 503;
  const title = unavailable ? 'Stranica je privremeno nedostupna' : 'Stranica nije pronađena';
  return <section className="logout-page page-status">
    <SEOHead title={title} description={unavailable ? 'Pokušajte ponovo za nekoliko trenutaka.' : 'Proverite adresu ili otvorite katalog.'} noIndex />
    <div className="logout-page__waves" aria-hidden="true" />
    <div className="logout-page__dots logout-page__dots--left" aria-hidden="true" />
    <div className="logout-page__dots logout-page__dots--right" aria-hidden="true" />
    <div className="logout-page__content">
      <div className="logout-page__visual page-status__visual" aria-hidden="true">
        <span className="page-status__code">{status}</span>
        <span className="page-status__symbol">{unavailable ? <RefreshCw size={48} /> : <SearchX size={48} />}</span>
      </div>
      <div className="logout-page__message">
        <p className="logout-page__eyebrow">{unavailable ? 'Samo trenutak' : 'Ova adresa nije dostupna'}</p>
        <h1>{title}</h1>
        <p className="logout-page__description">{unavailable ? 'Pokušajte ponovo za nekoliko trenutaka.' : 'Proverite adresu ili otvorite katalog.'}</p>
        <div className="logout-page__actions">
          <Link to="/catalog" className="logout-page__login">Otvori katalog <ArrowRight size={18} /></Link>
          <Link to="/" className="logout-page__guest"><House size={18} />Vrati se na početnu</Link>
        </div>
      </div>
    </div>
  </section>;
}
