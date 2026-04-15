import React, { Suspense, lazy, useEffect } from 'react';
import AppRoutes from './router.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { useLocation, useNavigationType } from 'react-router-dom';

const AuthModal = lazy(() => import('./components/AuthModal.jsx'));
const NewsletterModal = lazy(
  () => import('./components/modals/NewsletterModal.jsx'),
);

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
        <Suspense fallback={null}>
          <AuthModal />
          <NewsletterModal />
        </Suspense>
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}
