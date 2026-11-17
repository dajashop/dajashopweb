import { Link } from 'react-router-dom';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { seoConfig } from '../../config/seo.js';
import brandLogo from '../../assets/dajashop-logo.svg';

export default function CheckoutFooter() {
  const { t } = useStorefront();
  const { openSettings } = useConsent();
  const business = seoConfig.business;
  return <footer className="checkout-footer">
    <div className="container">
      <div className="checkout-footer__grid">
        <div><Link to="/" aria-label="DajaShop"><img src={brandLogo} alt="DajaShop" width="100" /></Link>
          <p>{t('Originalni satovi i podrška pri kupovini.')}</p><small>{t('PIB')}: 104852069</small></div>
        <div><h2>{t('Pomoć pri kupovini')}</h2>
          <a href={`tel:${business.phone}`}>{business.phone}</a>
          <a href={`mailto:${business.email}`}>{business.email}</a>
          <Link to="/contact">{business.street}, {business.postalCode} {business.city}</Link></div>
        <div><h2>{t('Radno vreme')}</h2><p>{t('Pon – Pet:')} 10:00 – 20:00<br/>{t('Subota:')} 10:00 – 15:00<br/>{t('Nedelja: Zatvoreno')}</p></div>
      </div>
      <div className="checkout-footer__bottom"><small>© {new Date().getFullYear()} Daja Shop. {t('Sva prava zadržana.')}</small>
        <nav aria-label={t('Informacije o kupovini')}><Link to="/cart">{t('Povratak u korpu')}</Link><Link to="/terms">{t('Uslovi korišćenja')}</Link><Link to="/privacy">{t('Politika privatnosti')}</Link><button type="button" onClick={openSettings}>{t('Podešavanja privatnosti')}</button></nav>
      </div>
    </div>
  </footer>;
}
