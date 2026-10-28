import { useStorefront } from '../localization/StorefrontContext.jsx';
import React from 'react';
import SEOHead from '../components/seo/SEOHead.jsx';

export default function Orders() {
  const { t: translateText } = useStorefront();

  return (
    <div>
      <SEOHead title={translateText("Moje porudžbine")} noIndex={true} />
      <h1>{translateText("Moje porudžbine")}</h1>
      <p>{translateText("Istorija porudžbina — integrisati kasnije.")}</p>
    </div>
  );
}
