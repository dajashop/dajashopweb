import { PUBLIC_SITE_URL as siteUrl } from './publicSite.js';
const configuredShareImage = import.meta.env.VITE_OG_DEFAULT_IMAGE || '';
const defaultShareImage = `${siteUrl}/images/og-default.jpg?v=20261004`;
const defaultDescription = 'DajaShop — prodavnica ručnih satova u Nišu. Otkrijte našu ponudu satova, naočara, daljinskih upravljača, baterija i dodatne opreme.';
const configuredDescription = (import.meta.env.VITE_SITE_DESCRIPTION || '').trim();
const configuredStreet = (import.meta.env.VITE_BUSINESS_STREET || '').trim();
// Older build settings contain concatenated words. Use readable defaults
// rather than publishing those values in metadata, addresses and map links.
const businessStreet = /\s/u.test(configuredStreet)
  ? configuredStreet.replace(/,?\s*(?:Niš|Nis)\s*18000\s*$/iu, '').trim()
  : 'Obrenovićeva bb, Podzemni prolaz lokal C31';
const businessCity = import.meta.env.VITE_BUSINESS_CITY || 'Niš';
const publicSetting = value => {
  const setting = (value || '').trim();
  return /^@?(?:none|null|undefined|n\/a|your_.*|placeholder.*|example.*)$/iu.test(setting) ? '' : setting;
};
const configuredEmail = (import.meta.env.VITE_BUSINESS_EMAIL || '').trim();

export const seoConfig = {
  siteUrl,
  siteName: import.meta.env.VITE_SITE_NAME || 'DajaShop',
  siteDescription: /\s/u.test(configuredDescription) ? configuredDescription : defaultDescription,
  siteKeywords: import.meta.env.VITE_SITE_KEYWORDS || '',
  siteLocale: import.meta.env.VITE_SITE_LOCALE || 'sr_RS',
  siteLocaleAlt: import.meta.env.VITE_SITE_LOCALE_ALT || '',
  ogDefaultImage: !configuredShareImage || /\/og-default\.jpg(?:[?#]|$)/i.test(configuredShareImage)
    ? defaultShareImage : configuredShareImage,
  twitterHandle: publicSetting(import.meta.env.VITE_TWITTER_HANDLE),
  facebookAppId: publicSetting(import.meta.env.VITE_FACEBOOK_APP_ID),
  siteLogoUrl: import.meta.env.VITE_SITE_LOGO_URL || '',
  googleSiteVerification: publicSetting(import.meta.env.VITE_GOOGLE_SITE_VERIFICATION),
  business: {
    name: import.meta.env.VITE_BUSINESS_NAME || 'DajaShop',
    street: businessStreet,
    city: businessCity === 'Nis' ? 'Niš' : businessCity,
    postalCode: import.meta.env.VITE_BUSINESS_POSTAL_CODE || '18000',
    country: import.meta.env.VITE_BUSINESS_COUNTRY || 'RS',
    phone: import.meta.env.VITE_BUSINESS_PHONE || '+381641262425',
    email: configuredEmail && configuredEmail.toLowerCase() !== 'info@dajashop.com' ? configuredEmail : 'cvelenis42@yahoo.com',
    hours: import.meta.env.VITE_BUSINESS_HOURS || 'Mo-Fr 10:00-20:00, Sa 10:00-15:00',
  },
};

export const commerceSeoConfig = {
  country: 'RS',
  currency: 'RSD',
  shippingCost: Number(import.meta.env.VITE_STOREFRONT_SHIPPING_COST_RSD || 380),
  freeShippingThreshold: Number(import.meta.env.VITE_STOREFRONT_FREE_SHIPPING_THRESHOLD_RSD || 8000),
  deliveryMinDays: Number(import.meta.env.VITE_STOREFRONT_DELIVERY_MIN_DAYS || 1),
  deliveryMaxDays: Number(import.meta.env.VITE_STOREFRONT_DELIVERY_MAX_DAYS || 3),
  returnDays: Number(import.meta.env.VITE_STOREFRONT_RETURN_DAYS || 14),
};
