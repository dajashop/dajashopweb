import { Suspense, useEffect, useState } from 'react';

// Identical first render on the server and browser; browser APIs start only
// after hydration. This boundary is for editors/3D, never public page text.
export default function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Suspense fallback={fallback}>{children}</Suspense> : fallback;
}
