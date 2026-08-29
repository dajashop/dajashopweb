import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { seoConfig } from '../../config/seo.js';

function ensureAbsoluteUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const base = seoConfig.siteUrl?.replace(/\/$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return base ? `${base}${path}` : value;
}

export default function SEOHead({
  title,
  description = seoConfig.siteDescription,
  keywords = seoConfig.siteKeywords,
  image = seoConfig.ogDefaultImage,
  url,
  type = 'website',
  noIndex = false,
  children,
}) {
  const location = useLocation();
  const siteName = seoConfig.siteName || 'DajaShop';
  const baseUrl = seoConfig.siteUrl?.replace(/\/$/, '') || '';
  const currentPath = location.pathname || '/';
  const canonicalUrl = ensureAbsoluteUrl(url || `${baseUrl}${currentPath}`);
  const imageUrl = ensureAbsoluteUrl(image);
  const isHome = currentPath === '/' || title === 'Početna';
  const fullTitle = isHome ? siteName : `${title} | ${siteName}`;
  const robotsValue = noIndex
    ? 'noindex,follow,max-image-preview:large'
    : 'index,follow,max-image-preview:large';
  const twitterSite = seoConfig.twitterHandle
    ? seoConfig.twitterHandle.startsWith('@')
      ? seoConfig.twitterHandle
      : `@${seoConfig.twitterHandle}`
    : '';

  return (
    <Helmet>
      <html lang="sr" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robotsValue} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={seoConfig.siteLocale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}

      {seoConfig.facebookAppId && (
        <meta property="fb:app_id" content={seoConfig.facebookAppId} />
      )}
      {seoConfig.googleSiteVerification && (
        <meta
          name="google-site-verification"
          content={seoConfig.googleSiteVerification}
        />
      )}

      {children}
    </Helmet>
  );
}
