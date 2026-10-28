import React from 'react';
import JsonLd from './JsonLd.jsx';
import { useStorefront } from '../../localization/StorefrontContext.jsx';

export default function FAQJsonLd({ items = [] }) {
  const { t, locale } = useStorefront();
  if (!Array.isArray(items) || items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: t(item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(item.answer),
      },
    })),
  };

  return <JsonLd data={schema} />;
}
