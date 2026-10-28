import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useEffect, useRef } from "react";
import { ReactLenis } from "@studio-freight/react-lenis";
import { useLocation } from "react-router-dom";

export default function SmoothScroll({ children }) {
  const { t: translateText } = useStorefront();

  const lenisRef = useRef();
  const { pathname } = useLocation();

  // Auto-reset skrola na vrh kada se promeni ruta (stranica)
  useEffect(() => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        duration: 1.2, // Fino podešavanje inercije
        smoothWheel: true,
        wheelMultiplier: 1,
        // Možeš dodati 'lerp: 0.1' za još mekši osećaj, ali duration je obično dovoljan
      }}
    >
      {translateText(children)}
    </ReactLenis>
  );
}
