import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function JsonLd({ data }) {
  if (!data) return null;

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data).replace(/</g, '\\u003c')}</script>
    </Helmet>
  );
}
