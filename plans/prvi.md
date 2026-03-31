# Plan: Full SEO System for DajaShop

## TL;DR

Implement a complete SEO system for a Vite+React e-commerce SPA hosted on Cloudflare Pages with Firebase backend. Includes: dynamic meta tags via `react-helmet-async`, JSON-LD structured data (Product, Organization, LocalBusiness, BreadcrumbList, FAQPage), dynamic sitemap.xml via Firebase Cloud Function, robots.txt, Cloudflare `_headers` for caching, social sharing meta (Open Graph + Twitter Cards), and a lightweight Cloudflare Worker middleware for bot/crawler prerendering of meta tags. All configurable values go into `.env` variables with comments.

## Architecture Decisions

- **Domain**: `dajashop.pages.dev` (current) → `dajashop.com` / `dajashop.rs` (future). Use env var.
- **Hosting**: Cloudflare Pages (static SPA)
- **Backend**: Firebase Cloud Functions (europe-west1)
- **SSR Strategy**: Hybrid — `react-helmet-async` for Google (executes JS) + Cloudflare Pages `_worker.js` middleware for social crawlers (Facebook, Twitter, LinkedIn cannot execute JS). The worker reads meta info from Firestore Admin SDK or a cached JSON endpoint and injects `<meta>` tags into the HTML `<head>` before serving to bots.
- **Sitemap**: Firebase Cloud Function serving XML, proxied via Cloudflare `_redirects`
- **Language**: Serbian primary, English infrastructure prepared (hreflang ready, no translations yet)
- **Currency**: RSD (Serbian Dinar)
- **Structured Data**: JSON-LD format (Google recommended)

---

## Phase 1: Foundation — Dependencies & ENV Setup

### Step 1.1: Install `react-helmet-async`

- Run: `npm install react-helmet-async`
- This is the standard React library for managing `<head>` tags dynamically per route.

### Step 1.2: Update `.env.example` with all SEO variables

Add these sections with comments to `/home/lazar/projekti/dajashopreact/.env.example` (APPEND after existing content):

```
# ============================================================
# SEO KONFIGURACIJA
# ============================================================

# --- Osnovni podaci o sajtu ---
# Kanonski domen sajta BEZ trailing slash (npr. https://dajashop.com)
VITE_SITE_URL=https://dajashop.pages.dev

# Naziv sajta (koristi se u title tagovima i structured data)
VITE_SITE_NAME=DajaShop

# Podrazumevani opis sajta (meta description za homepage, max 160 karaktera)
VITE_SITE_DESCRIPTION=DajaShop — online prodavnica satova, naočara, daljinskih upravljača i baterija.

# Podrazumevane ključne reči (meta keywords, odvojene zarezom)
VITE_SITE_KEYWORDS=satovi,naočare,daljinski upravljači,baterije,online prodavnica,Srbija

# Jezik sajta (ISO 639-1 kod)
VITE_SITE_LOCALE=sr_RS

# Alternativni jezik (za buduću i18n podršku, ostavite prazno ako nema)
VITE_SITE_LOCALE_ALT=en_US

# --- Open Graph / Social Media ---
# Podrazumevana OG slika za social sharing (1200x630px, apsolutni URL)
# Postavite sliku u public/images/ folder i unesite pun URL
VITE_OG_DEFAULT_IMAGE=https://dajashop.pages.dev/images/og-default.jpg

# Twitter/X nalog (bez @, ostavite prazno ako nemate)
VITE_TWITTER_HANDLE=

# Facebook App ID (za Facebook Insights, ostavite prazno ako nemate)
VITE_FACEBOOK_APP_ID=

# --- Logo i Brending ---
# URL do loga sajta (za structured data Organization schema, apsolutni URL)
VITE_SITE_LOGO_URL=https://dajashop.pages.dev/images/logo.png

# --- Fizička prodavnica (LocalBusiness Schema) ---
# Ako imate fizičku lokaciju, popunite sva polja ispod
VITE_BUSINESS_NAME=DajaShop
VITE_BUSINESS_STREET=Ulica i broj
VITE_BUSINESS_CITY=Grad
VITE_BUSINESS_POSTAL_CODE=00000
VITE_BUSINESS_COUNTRY=RS
VITE_BUSINESS_PHONE=+381XXXXXXXXX
VITE_BUSINESS_EMAIL=info@dajashop.com
# Radno vreme u formatu Schema.org (Mo-Fr 09:00-17:00, Sa 09:00-14:00)
VITE_BUSINESS_HOURS=Mo-Fr 09:00-17:00, Sa 09:00-14:00

# --- Google Verifikacija ---
# Google Search Console verifikacioni tag (samo content vrednost)
# Dobijte ga iz Search Console > Settings > Ownership verification > HTML tag
VITE_GOOGLE_SITE_VERIFICATION=your_google_verification_code

# --- Sitemap ---
# URL do Firebase Cloud Function za sitemap (bez trailing slash)
# Format: https://europe-west1-PROJECT_ID.cloudfunctions.net
VITE_FUNCTIONS_BASE_URL=https://europe-west1-daja-shop-site.cloudfunctions.net

# ============================================================
# KRAJ SEO KONFIGURACIJE
# ============================================================
```

### Step 1.3: Wrap app in `HelmetProvider`

Modify `src/main.jsx`:

- Import `HelmetProvider` from `react-helmet-async`
- Wrap `<BrowserRouter>` (or the outermost component inside `<React.StrictMode>`) with `<HelmetProvider>`
- The resulting structure should be: `StrictMode > AuthProvider > ThemeProvider > ... > WishlistProvider > HelmetProvider > BrowserRouter > App`

---

## Phase 2: SEO Utility Layer — Config & Components

### Step 2.1: Create SEO config file `src/config/seo.js`

This file reads all SEO env vars and exports a centralized config object. Every other SEO component imports from here.

Export an object `seoConfig` with:

```
{
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
  functionsBaseUrl: import.meta.env.VITE_FUNCTIONS_BASE_URL || '',
  business: {
    name: import.meta.env.VITE_BUSINESS_NAME || '',
    street: import.meta.env.VITE_BUSINESS_STREET || '',
    city: import.meta.env.VITE_BUSINESS_CITY || '',
    postalCode: import.meta.env.VITE_BUSINESS_POSTAL_CODE || '',
    country: import.meta.env.VITE_BUSINESS_COUNTRY || 'RS',
    phone: import.meta.env.VITE_BUSINESS_PHONE || '',
    email: import.meta.env.VITE_BUSINESS_EMAIL || '',
    hours: import.meta.env.VITE_BUSINESS_HOURS || '',
  }
}
```

### Step 2.2: Create `src/components/seo/SEOHead.jsx`

A reusable component that wraps `<Helmet>` from `react-helmet-async` and sets:

- `<title>` — Format: `{pageTitle} | {siteName}` (or just `{siteName}` for homepage)
- `<meta name="description" content={description} />`
- `<meta name="keywords" content={keywords} />`
- `<link rel="canonical" href={canonicalUrl} />`
- Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site`
- `<meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />`

**Props**:

```
{
  title: string (required),
  description: string (optional, defaults to seoConfig.siteDescription),
  keywords: string (optional),
  image: string (optional, defaults to seoConfig.ogDefaultImage),
  url: string (optional, auto-computed from current path),
  type: string (optional, defaults to 'website'),
  noIndex: boolean (optional, defaults to false),
  children: ReactNode (optional, for additional head elements like JSON-LD scripts)
}
```

The component should:

1. Import `seoConfig` from `../config/seo.js`
2. Import `Helmet` from `react-helmet-async`
3. Import `useLocation` from `react-router-dom` to auto-compute canonical URL
4. Merge defaults from seoConfig with provided props
5. Render all meta tags inside `<Helmet>`

### Step 2.3: Create `src/components/seo/JsonLd.jsx`

A simple component that renders a `<script type="application/ld+json">` tag inside `<Helmet>`.

**Props**: `{ data: object }` — The JSON-LD schema object to serialize.

Implementation: Render `<Helmet><script type="application/ld+json">{JSON.stringify(data)}</script></Helmet>`

### Step 2.4: Create `src/components/seo/ProductJsonLd.jsx`

A component specifically for product pages that generates Schema.org `Product` structured data.

**Props**: `{ product: object, reviews: array (optional) }`

Generates JSON-LD for Schema.org `Product` type:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{product.brand} {product.name}",
  "description": "{product.description}",
  "image": [array of product image URLs],
  "brand": {
    "@type": "Brand",
    "name": "{product.brand}"
  },
  "sku": "{product.slug}",
  "offers": {
    "@type": "Offer",
    "url": "{seoConfig.siteUrl}/product/{product.slug}",
    "priceCurrency": "RSD",
    "price": "{product.price}",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "{seoConfig.siteName}"
    }
  }
}
```

If `reviews` array is provided and non-empty, also add:

```json
{
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{average rating}",
    "reviewCount": "{reviews.length}"
  }
}
```

Uses `JsonLd` component internally.

### Step 2.5: Create `src/components/seo/OrganizationJsonLd.jsx`

Renders Organization + LocalBusiness JSON-LD for the homepage.

Uses `seoConfig.business` fields. Only renders if `seoConfig.business.name` is truthy.

Schema:

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "{business.name}",
  "url": "{seoConfig.siteUrl}",
  "logo": "{seoConfig.siteLogoUrl}",
  "image": "{seoConfig.ogDefaultImage}",
  "telephone": "{business.phone}",
  "email": "{business.email}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{business.street}",
    "addressLocality": "{business.city}",
    "postalCode": "{business.postalCode}",
    "addressCountry": "{business.country}"
  },
  "openingHours": "{business.hours}"
}
```

### Step 2.6: Create `src/components/seo/BreadcrumbJsonLd.jsx`

Renders BreadcrumbList JSON-LD.

**Props**: `{ items: Array<{name: string, url: string}> }`

Schema:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Početna",
      "item": "{seoConfig.siteUrl}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "{items[0].name}",
      "item": "{items[0].url}"
    }
    // ... etc
  ]
}
```

### Step 2.7: Create `src/components/seo/FAQJsonLd.jsx`

Renders FAQPage JSON-LD for the FAQ page.

**Props**: `{ items: Array<{question: string, answer: string}> }`

Schema uses `@type: "FAQPage"` with `mainEntity` array of `Question` items.

---

## Phase 3: Integrate SEO into Every Page

### Step 3.1: Update `index.html`

Add to `<head>`:

- `<meta name="description" content="DajaShop — online prodavnica satova, naočara, daljinskih upravljača i baterija.">`
- `<meta name="theme-color" content="#000000">`
- `<link rel="icon" href="/favicon.ico">`
- These serve as fallbacks before React hydrates.

### Step 3.2: Homepage — `src/pages/Home.jsx`

Add at the TOP of the return JSX (inside the outermost wrapper):

```jsx
<SEOHead
  title="Početna"
  description={seoConfig.siteDescription}
  keywords={seoConfig.siteKeywords}
  type="website"
/>
<OrganizationJsonLd />
```

### Step 3.3: Catalog page — `src/pages/Catalog.jsx`

The `department` prop determines which catalog. Add `SEOHead` with department-specific titles:

- `department="satovi"` → title: "Satovi — Katalog"
- `department="daljinski"` → title: "Daljinski upravljači — Katalog"
- `department="baterije"` → title: "Baterije — Katalog"
- `department="naocare"` → title: "Naočare — Katalog"

Create a `departmentSEO` map object at the top of the file:

```
const departmentSEO = {
  satovi: { title: 'Satovi — Katalog', description: 'Pregledajte našu kolekciju satova poznatih brendova...', keywords: 'satovi,ručni satovi,Casio,Orient...' },
  daljinski: { title: 'Daljinski upravljači — Katalog', description: 'Daljinski upravljači za televizore i uređaje...', keywords: '...' },
  baterije: { title: 'Baterije — Katalog', description: 'Baterije za satove i elektroniku...', keywords: '...' },
  naocare: { title: 'Naočare — Katalog', description: 'Naočare za sunce i dioptrijske naočare...', keywords: '...' },
};
```

Add `<SEOHead>` using `departmentSEO[department]` at the top of return JSX.

Also add `<BreadcrumbJsonLd>` with items: Početna → {Department name}.

### Step 3.4: Product page — `src/pages/Products.jsx`

This is the MOST IMPORTANT page for SEO. After the product loads (when `p` is available and `!loading`):

Add `<SEOHead>`:

- `title`: `{p.brand} {p.name}`
- `description`: `{p.description}` (or fallback: `Kupite {p.brand} {p.name} po ceni od {p.price} RSD. Besplatna dostava.`)
- `image`: `{p.mainImageUrl || p.images?.[0]?.url || p.image}`
- `type`: `product`
- `url`: `{seoConfig.siteUrl}/product/{p.slug}`

Add `<ProductJsonLd product={p} />` — pass reviews if available.

Add `<BreadcrumbJsonLd>` with items: Početna → {Department name} → {p.brand} {p.name}.

### Step 3.5: About page — `src/pages/About.jsx`

Add `<SEOHead title="O nama" description="Saznajte više o DajaShop-u..." />`

### Step 3.6: FAQ page — `src/pages/FAQ.jsx`

Add `<SEOHead title="Često postavljana pitanja" description="Odgovori na najčešća pitanja..." />`
Add `<FAQJsonLd>` using the existing FAQ data from `src/data/faqContent.js`.

### Step 3.7: Contact page — `src/pages/Contact.jsx`

Add `<SEOHead title="Kontakt" description="Kontaktirajte DajaShop..." />`

### Step 3.8: Services page — `src/pages/Usluge.jsx`

Add `<SEOHead title="Usluge" description="Usluge servisa i popravke satova..." />`

### Step 3.9: Private pages — noindex

Add `<SEOHead noIndex={true}>` to these pages (they should NOT be indexed):

- `src/pages/Cart.jsx` — title: "Korpa"
- `src/pages/Checkout.jsx` — title: "Plaćanje"
- `src/pages/Account.jsx` — title: "Moj nalog"
- `src/pages/Orders.jsx` — title: "Moje porudžbine"
- `src/pages/VerifyEmail.jsx` — title: "Verifikacija email-a"
- `src/pages/Admin/AdminDashboard.jsx` — title: "Admin"
- `src/pages/Admin/OrdersPage.jsx` — title: "Admin — Porudžbine"

---

## Phase 4: Static SEO Files

### Step 4.1: Create `public/robots.txt`

```
User-agent: *
Allow: /

# Privatne stranice
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /orders
Disallow: /admin
Disallow: /verify-email

# Sitemap
Sitemap: https://dajashop.pages.dev/sitemap.xml
```

NOTE: The sitemap URL should use the VITE_SITE_URL value, but since robots.txt is static, hardcode it and add a comment to update it when domain changes.

### Step 4.2: Create `public/_headers`

Cloudflare Pages `_headers` file for caching and security:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=604800

/sitemap.xml
  Content-Type: application/xml
  Cache-Control: public, max-age=3600
```

### Step 4.3: Update `public/_redirects`

APPEND to existing `_redirects` file (keep existing firebase-web-authn redirect):

```
/sitemap.xml https://europe-west1-daja-shop-site.cloudfunctions.net/generateSitemap 200
```

This proxies sitemap requests to the Firebase Cloud Function.

---

## Phase 5: Dynamic Sitemap via Firebase Cloud Function

### Step 5.1: Create `functions/src/sitemap.ts`

Create a new Firebase Cloud Function `generateSitemap` that:

1. Is an `onRequest` HTTPS function (not onCall)
2. Queries Firestore `products` collection where `isVisible == true`
3. Generates XML sitemap with:
   - Static pages: `/`, `/catalog`, `/daljinski`, `/baterije`, `/naocare`, `/about`, `/faq`, `/contact`, `/usluge`
   - Dynamic product pages: `/product/{slug}` for each visible product
4. Sets appropriate headers: `Content-Type: application/xml`, `Cache-Control: public, max-age=3600`
5. Uses the site URL from an environment variable (Firebase Functions config or hardcoded)

XML format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dajashop.pages.dev/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- static pages with priority 0.8 -->
  <!-- product pages with priority 0.9, lastmod from updatedAt -->
  <url>
    <loc>https://dajashop.pages.dev/product/{slug}</loc>
    <lastmod>{updatedAt in YYYY-MM-DD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
```

### Step 5.2: Export the function in `functions/src/index.ts`

Add import and export for `generateSitemap` from `./sitemap`.

### Step 5.3: Add Firebase Functions environment config

The sitemap function needs to know the site URL. Use Firebase Functions defineString() config:

- `SITE_URL` = the canonical site URL

In `functions/src/sitemap.ts`, use:

```typescript
import { defineString } from "firebase-functions/params";
const siteUrl = defineString("SITE_URL", {
  default: "https://dajashop.pages.dev",
});
```

Then set it via: `firebase functions:config:set site.url="https://dajashop.pages.dev"`
Or use `.env` in functions directory.

### Step 5.4: Create `functions/.env` example

Add `functions/.env.example`:

```
# URL sajta za sitemap generisanje
SITE_URL=https://dajashop.pages.dev
```

---

## Phase 6: Update `index.html` with Fallback Meta Tags

### Step 6.1: Enhance `index.html` `<head>`

Add comprehensive fallback meta tags that `react-helmet-async` will override per-page:

```html
<meta
  name="description"
  content="DajaShop — online prodavnica satova, naočara, daljinskih upravljača i baterija."
/>
<meta
  name="keywords"
  content="satovi,naočare,daljinski upravljači,baterije,online prodavnica,Srbija"
/>
<meta name="author" content="DajaShop" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://dajashop.pages.dev/" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:title" content="DajaShop — online prodavnica satova" />
<meta
  property="og:description"
  content="DajaShop — online prodavnica satova, naočara, daljinskih upravljača i baterija."
/>
<meta
  property="og:image"
  content="https://dajashop.pages.dev/images/og-default.jpg"
/>
<meta property="og:url" content="https://dajashop.pages.dev/" />
<meta property="og:site_name" content="DajaShop" />
<meta property="og:locale" content="sr_RS" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="DajaShop — online prodavnica satova" />
<meta
  name="twitter:description"
  content="DajaShop — online prodavnica satova, naočara, daljinskih upravljača i baterija."
/>
<meta
  name="twitter:image"
  content="https://dajashop.pages.dev/images/og-default.jpg"
/>

<!-- Google Search Console -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />

<!-- Theme -->
<meta name="theme-color" content="#000000" />
```

NOTE: These are STATIC fallbacks in index.html. react-helmet-async will OVERRIDE them when pages load. This ensures social crawlers that don't execute JS still see basic meta tags.

---

## Phase 7: Cloudflare Worker Middleware for Social Bot Prerendering (OPTIONAL / ADVANCED)

> This phase is optional but HIGHLY recommended for proper social media sharing (Facebook, Twitter, LinkedIn previews). Without it, social crawlers see only the static fallback meta tags from index.html, not product-specific ones.

### Step 7.1: Create `public/_worker.js`

This is a Cloudflare Pages advanced mode Worker. When placed in the build output directory, Cloudflare automatically uses it.

The worker:

1. Checks if the User-Agent is a known bot/crawler (facebookexternalhit, Twitterbot, LinkedInBot, Googlebot, etc.)
2. For NON-bot requests: passes through to the origin (normal SPA behavior)
3. For BOT requests to `/product/{slug}`:
   - Fetches the original HTML from origin
   - Fetches product data from Firestore REST API: `https://firestore.googleapis.com/v1/projects/daja-shop-site/databases/(default)/documents/products?where...` (query by slug field)
   - Injects product-specific meta tags into the `<head>` of the HTML
   - Returns the modified HTML
4. For BOT requests to other pages: passes through (static fallback meta tags in index.html are sufficient)

**Environment variables needed in Cloudflare Pages dashboard**:

- `SITE_URL` — canonical site URL
- `FIREBASE_PROJECT_ID` — for Firestore REST API

**Implementation notes**:

- Use HTMLRewriter API (Cloudflare's streaming HTML transformer) to inject meta tags — very efficient
- The Firestore REST API does NOT require auth for public-readable collections. Check that Firestore rules allow read on `products` collection (they should since the SPA reads them client-side)
- Cache product data in Cloudflare's Cache API for 1 hour to avoid hitting Firestore on every bot request

### Step 7.2: Add `.cfignore` file at project root

```
functions/
node_modules/
```

This prevents Cloudflare Pages from treating the Firebase `functions/` directory as Cloudflare Pages Functions.

---

## Relevant Files

### Files to MODIFY:

- `.env.example` — Add all SEO env variables with comments (Step 1.2)
- `index.html` — Add fallback meta tags (Step 6.1)
- `src/main.jsx` — Wrap with HelmetProvider (Step 1.3)
- `src/pages/Home.jsx` — Add SEOHead + OrganizationJsonLd (Step 3.2)
- `src/pages/Catalog.jsx` — Add SEOHead per department + BreadcrumbJsonLd (Step 3.3)
- `src/pages/Products.jsx` — Add SEOHead + ProductJsonLd + BreadcrumbJsonLd (Step 3.4)
- `src/pages/About.jsx` — Add SEOHead (Step 3.5)
- `src/pages/FAQ.jsx` — Add SEOHead + FAQJsonLd (Step 3.6)
- `src/pages/Contact.jsx` — Add SEOHead (Step 3.7)
- `src/pages/Usluge.jsx` — Add SEOHead (Step 3.8)
- `src/pages/Cart.jsx` — Add SEOHead with noIndex (Step 3.9)
- `src/pages/Checkout.jsx` — Add SEOHead with noIndex (Step 3.9)
- `src/pages/Account.jsx` — Add SEOHead with noIndex (Step 3.9)
- `src/pages/Orders.jsx` — Add SEOHead with noIndex (Step 3.9)
- `src/pages/VerifyEmail.jsx` — Add SEOHead with noIndex (Step 3.9)
- `src/pages/Admin/AdminDashboard.jsx` — Add SEOHead with noIndex (Step 3.9)
- `src/pages/Admin/OrdersPage.jsx` — Add SEOHead with noIndex (Step 3.9) (if it exists as JSX file)
- `public/_redirects` — Add sitemap proxy rule (Step 4.3)
- `functions/src/index.ts` — Export generateSitemap (Step 5.2)

### Files to CREATE:

- `src/config/seo.js` — Centralized SEO config from env vars (Step 2.1)
- `src/components/seo/SEOHead.jsx` — Reusable meta tag component (Step 2.2)
- `src/components/seo/JsonLd.jsx` — Generic JSON-LD renderer (Step 2.3)
- `src/components/seo/ProductJsonLd.jsx` — Product structured data (Step 2.4)
- `src/components/seo/OrganizationJsonLd.jsx` — Organization/LocalBusiness schema (Step 2.5)
- `src/components/seo/BreadcrumbJsonLd.jsx` — Breadcrumb schema (Step 2.6)
- `src/components/seo/FAQJsonLd.jsx` — FAQ schema (Step 2.7)
- `public/robots.txt` — Crawler directives (Step 4.1)
- `public/_headers` — Cloudflare caching headers (Step 4.2)
- `functions/src/sitemap.ts` — Dynamic sitemap Cloud Function (Step 5.1)
- `functions/.env.example` — Functions env template (Step 5.4)
- `public/_worker.js` — Cloudflare bot prerender middleware (Step 7.1) [OPTIONAL]
- `.cfignore` — Ignore Firebase functions dir (Step 7.2) [OPTIONAL]

### Files to REFERENCE (read but not modify):

- `src/services/products.js` — `fetchProductBySlug(slug)` function, Firestore collection name
- `src/hooks/useProduct.js` — How product data is consumed
- `src/components/Breadcrumbs.jsx` — Existing breadcrumb component (reference for consistency)
- `src/data/faqContent.js` — FAQ data structure for FAQJsonLd
- `src/models/Product.js` — Product field names
- `src/services/reviews.js` — `getProductReviews(productId)` for aggregate ratings

---

## Verification

1. **Build check**: Run `npm run build` — no build errors
2. **Dev check**: Run `npm run dev` and visit homepage — inspect `<head>` in DevTools, verify dynamic meta tags are present
3. **Product page check**: Navigate to a product page — inspect `<head>`, verify product-specific title, description, OG tags, and JSON-LD script
4. **Google Rich Results Test**: Paste a product URL into https://search.google.com/test/rich-results — verify Product schema is valid
5. **OpenGraph debugger**: Paste URL into https://developers.facebook.com/tools/debug/ — verify OG tags appear (requires Phase 7 for dynamic product meta)
6. **robots.txt check**: Visit `/robots.txt` — verify it loads with correct directives
7. **Sitemap check**: After deploying sitemap function, visit `/sitemap.xml` — verify XML loads with all products listed
8. **noIndex check**: Visit `/cart`, `/admin` in DevTools — verify `<meta name="robots" content="noindex,nofollow">` is present
9. **Lighthouse SEO audit**: Run Lighthouse in Chrome DevTools on homepage and a product page — target 90+ SEO score
10. **Firebase deploy**: Run `cd functions && npm run build` — verify sitemap.ts compiles with no errors

---

## Decisions

- Using `react-helmet-async` (not `react-helmet`) because it supports React 18+ concurrent mode and is the maintained fork
- JSON-LD format for structured data (Google's recommended format, not Microdata)
- Cloudflare `_redirects` proxy for sitemap (simpler than Workers routing)
- Product OG image uses `mainImageUrl` (original quality) not `thumbnailUrl` (500x500 webp)
- Currency hardcoded as RSD in ProductJsonLd (not from env, since it's a structural constant)
- Phase 7 (Cloudflare Worker) is marked optional — social sharing will work with static fallbacks from index.html for the homepage, but product-specific OG will require it
- i18n infrastructure is "prepared" via `siteLocaleAlt` env var and hreflang-ready structure, but no actual translations or route prefixes

## Further Considerations

1. **OG slika**: Trebalo bi kreirati default OG sliku (1200x630px) sa DajaShop brendingom i staviti je u `public/images/og-default.jpg`. Bez nje social sharing neće imati sliku. → Preporuka: Kreiraj je u Canva ili sličnom alatu.
2. **Cloudflare Worker (Phase 7)**: Ovo značajno poboljšava social sharing za individualne proizvode. Bez ovoga, Facebook/Twitter će uvek prikazivati iste default meta podatke za sve stranice. → Preporuka: Implementiraj Phase 7.
3. **Google Merchant Center**: Za pravu e-commerce SEO, Google Merchant Center product feed bi značajno poboljšao vidljivost u Google Shopping rezultatima. Ovo bi mogao biti budući korak — Firebase Cloud Function koja generiše Google Shopping XML feed. → Preporuka: Planiraj za sledeću iteraciju.
