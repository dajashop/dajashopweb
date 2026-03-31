import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';

export default function BreadcrumbJsonLd({ items = [] }) {
  const homeUrl = seoConfig.siteUrl.replace(/\/$/, '');
  const list = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Početna',
      item: homeUrl,
    },
    ...items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 2,
      name: item.name,
      item: item.url,
    })),
  ];

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: list,
      }}
    />
  );
}
