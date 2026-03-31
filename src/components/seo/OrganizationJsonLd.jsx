import React from 'react';
import JsonLd from './JsonLd.jsx';
import { seoConfig } from '../../config/seo.js';

export default function OrganizationJsonLd() {
  const { business } = seoConfig;

  if (!business?.name) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    url: seoConfig.siteUrl,
    logo: seoConfig.siteLogoUrl,
    image: seoConfig.ogDefaultImage,
    telephone: business.phone,
    email: business.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.street,
      addressLocality: business.city,
      postalCode: business.postalCode,
      addressCountry: business.country,
    },
    openingHours: business.hours,
  };

  return <JsonLd data={schema} />;
}
