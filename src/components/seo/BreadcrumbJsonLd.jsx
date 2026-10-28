import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { localizedSiteUrl } from '../../localization/paths.js';

export default function BreadcrumbJsonLd({ items = [], defer = true }) {
  const { language, t } = useStorefront();
  const homeUrl = localizedSiteUrl('/', language, seoConfig.siteUrl);
  const list = [
    {
      '@type': 'ListItem',
      position: 1,
      name: t('Početna'),
      item: homeUrl,
    },
    ...items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 2,
      name: t(item.name),
      item: localizedSiteUrl(item.url, language, seoConfig.siteUrl),
    })),
  ];

  return (
    <JsonLd
      defer={defer}
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: list,
      }}
    />
  );
}
