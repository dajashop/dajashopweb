export const seoConfig = {
  siteUrl: import.meta.env.VITE_SITE_URL || '',
  siteName: import.meta.env.VITE_SITE_NAME || 'DajaShop',
  siteDescription: import.meta.env.VITE_SITE_DESCRIPTION || '',
  siteKeywords: import.meta.env.VITE_SITE_KEYWORDS || '',
  siteLocale: import.meta.env.VITE_SITE_LOCALE || 'sr_RS',
  siteLocaleAlt: import.meta.env.VITE_SITE_LOCALE_ALT || '',
  ogDefaultImage: import.meta.env.VITE_OG_DEFAULT_IMAGE || '',
  twitterHandle: import.meta.env.VITE_TWITTER_HANDLE || '',
  facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
  siteLogoUrl: import.meta.env.VITE_SITE_LOGO_URL || '',
  googleSiteVerification: import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '',
  business: {
    name: import.meta.env.VITE_BUSINESS_NAME || 'DajaShop',
    street: import.meta.env.VITE_BUSINESS_STREET || 'Podzemni prolaz lokal C31',
    city: import.meta.env.VITE_BUSINESS_CITY || 'Niš',
    postalCode: import.meta.env.VITE_BUSINESS_POSTAL_CODE || '18000',
    country: import.meta.env.VITE_BUSINESS_COUNTRY || 'RS',
    phone: import.meta.env.VITE_BUSINESS_PHONE || '+381641262425',
    email: import.meta.env.VITE_BUSINESS_EMAIL || 'info@dajashop.com',
    hours: import.meta.env.VITE_BUSINESS_HOURS || 'Mo-Fr 10:00-20:00, Sa 10:00-15:00',
  },
};

export const commerceSeoConfig = {
  country: 'RS',
  currency: 'RSD',
  shippingCost: Number(import.meta.env.VITE_STOREFRONT_SHIPPING_COST_RSD || 380),
  freeShippingThreshold: Number(
    import.meta.env.VITE_STOREFRONT_FREE_SHIPPING_THRESHOLD_RSD || 10000,
  ),
  deliveryMinDays: Number(import.meta.env.VITE_STOREFRONT_DELIVERY_MIN_DAYS || 1),
  deliveryMaxDays: Number(import.meta.env.VITE_STOREFRONT_DELIVERY_MAX_DAYS || 3),
  returnDays: Number(import.meta.env.VITE_STOREFRONT_RETURN_DAYS || 14),
};
