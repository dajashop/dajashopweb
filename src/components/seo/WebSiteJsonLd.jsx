import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { localizedSiteUrl } from '../../localization/paths.js';

export default function WebSiteJsonLd() {
  const { language, locale } = useStorefront();
  if (!seoConfig.siteUrl) return null;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: seoConfig.siteName,
        url: localizedSiteUrl('/', language, seoConfig.siteUrl),
        inLanguage: locale,
      }}
    />
  );
}
