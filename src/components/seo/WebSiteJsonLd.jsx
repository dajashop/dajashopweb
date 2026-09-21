import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';

export default function WebSiteJsonLd() {
  if (!seoConfig.siteUrl) return null;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: seoConfig.siteName,
        url: seoConfig.siteUrl,
        inLanguage: 'sr-RS',
      }}
    />
  );
}
