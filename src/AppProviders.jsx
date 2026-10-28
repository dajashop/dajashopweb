import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './context/ThemeProvider.jsx';
import { CartProvider } from './context/CarProvider.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { FlashProvider } from './context/FlashContext.jsx';
import { UndoProvider } from './context/UndoProvider.jsx';
import { WishlistProvider } from './context/WishlistProvider.jsx';
import { ConsentProvider } from './context/ConsentProvider.jsx';
import { PageDataProvider } from './ssr/PageData.jsx';
import { StorefrontProvider } from './localization/StorefrontContext.jsx';

export default function AppProviders({ children, pageData = null, helmetContext, language = 'sr' }) {
  return (
    <PageDataProvider data={pageData}>
      <StorefrontProvider initialLanguage={language}>
      <ConsentProvider><AuthProvider><ThemeProvider><CartProvider>
        <FlashProvider><UndoProvider><WishlistProvider>
          <HelmetProvider context={helmetContext}>{children}</HelmetProvider>
        </WishlistProvider></UndoProvider></FlashProvider>
      </CartProvider></ThemeProvider></AuthProvider></ConsentProvider>
      </StorefrontProvider>
    </PageDataProvider>
  );
}
