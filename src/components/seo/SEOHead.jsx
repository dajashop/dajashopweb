import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { seoConfig } from '../../config/seo.js';
import { isEmailLinkPath } from '../../utils/emailLinkPrivacy.js';
import { localizedSiteUrl } from '../../localization/paths.js';

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
  homeTitle,
  defer = true,
  children,
}) {
  const { t: translateText, language } = useStorefront();

  const location = useLocation();
  const siteName = seoConfig.siteName || 'DajaShop';
  const baseUrl = seoConfig.siteUrl?.replace(/\/$/, '') || '';
  const currentPath = location.pathname || '/';
  const canonicalSource = ensureAbsoluteUrl(url || `${baseUrl}${currentPath}`);
  const canonicalUrl = localizedSiteUrl(canonicalSource, language, baseUrl);
  const serbianUrl = localizedSiteUrl(canonicalSource, 'sr', baseUrl);
  const englishUrl = localizedSiteUrl(canonicalSource, 'en', baseUrl);
  const imageUrl = ensureAbsoluteUrl(image);
  const isHome = currentPath === '/' || title === 'Početna';
  const fullTitle = homeTitle ? translateText(homeTitle) : isHome ? siteName : `${translateText(title)} | ${siteName}`;
  const translatedDescription = translateText(description);
  const sensitiveEmailLink = isEmailLinkPath(currentPath);
  const robotsValue = sensitiveEmailLink ? 'noindex,nofollow,noarchive' : noIndex
    ? 'noindex,follow,max-image-preview:large'
    : 'index,follow,max-image-preview:large';
  const twitterSite = seoConfig.twitterHandle
    ? seoConfig.twitterHandle.startsWith('@')
      ? seoConfig.twitterHandle
      : `@${seoConfig.twitterHandle}`
    : '';

  return (
    <Helmet defer={defer}>
      <html lang={language} />
      <title>{fullTitle}</title>
      <meta name="description" content={translatedDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robotsValue} />
      {sensitiveEmailLink && <meta name="referrer" content="no-referrer" />}
      <link rel="canonical" href={canonicalUrl} />
      {!sensitiveEmailLink && !noIndex && <>
        <link rel="alternate" hrefLang="sr" href={serbianUrl} />
        <link rel="alternate" hrefLang="en" href={englishUrl} />
        <link rel="alternate" hrefLang="x-default" href={serbianUrl} />
      </>}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={translatedDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={language === 'en' ? 'en_GB' : seoConfig.siteLocale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={translatedDescription} />
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

      {translateText(children)}
    </Helmet>
  );
}
