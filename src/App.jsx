import AppRoutes from './router.jsx';
import EngravingSync from './components/engraving/EngravingSync';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AuthModal from './components/AuthModal.jsx';
import { useLocation, useNavigationType } from 'react-router-dom';
import NewsletterModal from './components/modals/NewsletterModal.jsx';
import { useEffect } from 'react';
import OrganizationJsonLd from './components/seo/OrganizationJsonLd.jsx';
import WebSiteJsonLd from './components/seo/WebSiteJsonLd.jsx';
import PageStatus from './pages/PageStatus.jsx';
import { usePageData } from './ssr/PageData.jsx';

export default function App() {
  const { pathname } = useLocation(); // Hvatamo trenutnu putanju
  const navType = useNavigationType();
  const pageData = usePageData()?.data;
  const pageStatus = pageData?.errorPath === pathname ? pageData.errorStatus : null;

  const isWidePage =
    pathname.startsWith('/catalog') ||
    pathname === '/search' ||
    pathname === '/muski-satovi' ||
    pathname === '/zenski-satovi' ||
    pathname === '/daljinski' ||
    pathname === '/baterije' ||
    pathname === '/naocare' ||
    pathname === '/logout' ||
    pathname === '/verify-email' ||
    pathname === '/reset-password' || Boolean(pageStatus);
  const isFullBleedPage =
    pathname === '/logout' || pathname === '/verify-email' || pathname === '/reset-password' || Boolean(pageStatus);

  // Resetovanje skrola na vrh pri promeni stranice (samo za PUSH/REPLACE)
  useEffect(() => {
    if (navType === 'POP') return; // Back/Forward zadrži native scroll restore
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, navType]);

  return (
    <div
      className={
        isFullBleedPage ? 'app-root app-root--seamless-footer' : 'app-root'
      }
    >
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <Header />
      <EngravingSync />
      <main
        className={isWidePage ? 'w-full' : 'container'}
        style={isFullBleedPage ? undefined : { padding: '20px 0 48px' }}
      >
        <AuthModal />
        <NewsletterModal />
        {pageStatus ? <PageStatus status={pageStatus} /> : <AppRoutes />}
      </main>
      <Footer />
    </div>
  );
}
