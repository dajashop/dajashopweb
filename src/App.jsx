import AppRoutes from './router.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AuthModal from './components/AuthModal.jsx';
import { useLocation, useNavigationType } from 'react-router-dom';
import NewsletterModal from './components/modals/NewsletterModal.jsx';
import { useEffect } from 'react';

export default function App() {
  const { pathname } = useLocation(); // Hvatamo trenutnu putanju
  const navType = useNavigationType();

  const isWidePage =
    pathname.startsWith('/catalog') ||
    pathname === '/daljinski' ||
    pathname === '/baterije' ||
    pathname === '/naocare';

  // Resetovanje skrola na vrh pri promeni stranice (samo za PUSH/REPLACE)
  useEffect(() => {
    if (navType === 'POP') return; // Back/Forward zadrži native scroll restore
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, navType]);

  return (
    <div className="app-root">
      <Header />
      <main
        className={isWidePage ? 'w-full' : 'container'}
        style={{ padding: '20px 0 48px' }}
      >
        <AuthModal />
        <NewsletterModal />
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}
