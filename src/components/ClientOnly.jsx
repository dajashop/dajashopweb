import { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadErrorBoundary from './LoadErrorBoundary.jsx';

// Identical first render on the server and browser; browser APIs start only
// after hydration. This boundary is for editors/3D, never public page text.
export default function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  useEffect(() => setMounted(true), []);
  return mounted ? <LoadErrorBoundary key={location.pathname}><Suspense fallback={fallback}>{children}</Suspense></LoadErrorBoundary> : fallback;
}
