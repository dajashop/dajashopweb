# Plan: Product SEO Meta Tags & Google Images

## TL;DR

Add per-product SEO fields (metaTitle, metaDescription, metaKeywords, ogImage) to Firestore, the admin form, the product page rendering, and the Cloudflare Worker bot injection. Also improve image SEO for Google Images visibility (alt texts, image sitemap, structured data enhancements).

## Context / Current State

- **SEO infrastructure is solid**: `react-helmet-async`, `SEOHead.jsx`, JSON-LD components (`ProductJsonLd`, `BreadcrumbJsonLd`, etc.) all exist
- **Cloudflare Worker** (`_worker.js`) already injects OG/meta tags for bots on `/product/:slug` using raw product fields (name, brand, description, mainImageUrl)
- **Sitemap** Cloud Function generates XML with all visible products
- **Admin modal** (`AdminProductModal.jsx`) has no SEO section
- **Product fields in Firestore** currently have NO SEO-specific fields
- **Image alt tags**: main image uses `product.name`, thumbnails use empty `alt=""`
- **ProductJsonLd** already outputs `schema.org/Product` with images, but no per-image alt or custom SEO description

---

## Phase 1: Firestore Schema — Add SEO Fields to Products

**Steps:**

1. Add new optional fields to product documents (no migration needed — Firestore is schemaless):
   - `seo.metaTitle` (string) — custom SEO title, falls back to `{brand} {name}`
   - `seo.metaDescription` (string) — custom meta description, falls back to `description`
   - `seo.metaKeywords` (string) — comma-separated keywords
   - `seo.ogImage` (string) — optional OG image override URL
   - `seo.imageAltText` (string) — custom alt text for main product image, falls back to `{brand} {name}`

**Relevant files:**

- `src/models/Product.js` — update model (if referenced anywhere)
- `firestore.rules` — no changes needed (products already admin-write-only, new fields are just part of the document)

---

## Phase 2: Admin UI — SEO Section in AdminProductModal

**Steps:**

1. Add `seo` nested object to the `form` state initial value in `AdminProductModal.jsx`
2. When editing, populate `seo` from `product.seo || {}`
3. Add a new collapsible/expandable "SEO / Meta Tagovi" section in the form, visually grouped like existing sections (features, specs). Place it AFTER the description field area, BEFORE the features section.
4. Fields in the SEO section:
   - **SEO Naslov** (`seo.metaTitle`) — text input, placeholder: auto-generated from brand+name, max 60 chars with character counter
   - **SEO Opis** (`seo.metaDescription`) — textarea, placeholder: auto-generated from description, max 160 chars with character counter
   - **Ključne Reči** (`seo.metaKeywords`) — text input, placeholder: "sat, casio, g-shock, muški sat"
   - **OG Slika URL** (`seo.ogImage`) — text input, placeholder: "Ostavi prazno za glavnu sliku proizvoda"
   - **Alt Tekst Slike** (`seo.imageAltText`) — text input, placeholder: auto-generated from brand+name
5. Add a preview snippet showing how the product would appear in Google search results (title in blue, URL in green, description in gray) — like a mini "Google preview" card
6. Include `seo` in the `handleSubmit` payload — clean empty strings to avoid storing blank fields
7. Add helper text explaining: "Ova polja su opciona. Ako ostavite prazno, automatski će se koristiti naziv i opis proizvoda."

**Relevant files:**

- `src/pages/Admin/components/AdminProductModal.jsx` — main form, add SEO section + form state + submit logic

---

## Phase 3: Frontend — Consume SEO Fields on Product Page

**Steps:**

1. Update `Products.jsx` to read `p.seo` and pass custom SEO fields to `<SEOHead>`:
   - `title` → `p.seo?.metaTitle || productTitle`
   - `description` → `p.seo?.metaDescription || productDescription`
   - `keywords` → `p.seo?.metaKeywords || undefined` (falls back to SEOHead default)
   - `image` → `p.seo?.ogImage || productImage`
2. Update `ProductJsonLd.jsx` to use `product.seo?.metaDescription` as description override if present
3. Update `ProductGallery.jsx`:
   - Main image `alt` → `product.seo?.imageAltText || \`${product.brand} ${product.name}\``
   - Thumbnail `alt` → `\`${product.name} - slika ${index + 1}\`` instead of empty string

**Relevant files:**

- `src/pages/Products.jsx` — consume `p.seo` fields for SEOHead props
- `src/components/seo/ProductJsonLd.jsx` — use seo.metaDescription as description override
- `src/components/product/ProductGallery.jsx` — fix alt texts

---

## Phase 4: Cloudflare Worker — Read SEO Fields for Bot Injection

**Steps:**

1. Update `fetchProductBySlug()` in `_worker.js` to also read `seo` map fields from Firestore REST response:
   - `seo.metaTitle` → `fields.seo?.mapValue?.fields?.metaTitle?.stringValue`
   - `seo.metaDescription` → `fields.seo?.mapValue?.fields?.metaDescription?.stringValue`
   - `seo.metaKeywords` → `fields.seo?.mapValue?.fields?.metaKeywords?.stringValue`
   - `seo.ogImage` → `fields.seo?.mapValue?.fields?.ogImage?.stringValue`
   - `seo.imageAltText` → `fields.seo?.mapValue?.fields?.imageAltText?.stringValue`
2. Update `buildMetaTags()` to use SEO fields with fallbacks:
   - `<title>` → `seo.metaTitle || {brand} {name}`
   - `<meta name="description">` → `seo.metaDescription || description`
   - Add `<meta name="keywords">` → `seo.metaKeywords` (if present)
   - `og:image` → `seo.ogImage || mainImageUrl || image`
   - Add `<meta property="product:price:amount">` and `<meta property="product:price:currency">` for rich product sharing
3. Add `<meta property="og:image:alt">` tag using `seo.imageAltText || title`

**Relevant files:**

- `public/_worker.js` — update `fetchProductBySlug()` and `buildMetaTags()`

---

## Phase 5: Google Images Optimization

### 5a. Structured Data Enhancement (code changes)

1. In `ProductJsonLd.jsx`, enhance image output to use `ImageObject` schema instead of plain URLs when `seo.imageAltText` is available:
   ```
   image: [{ "@type": "ImageObject", url: "...", name: "alt text" }]
   ```
2. This helps Google understand product images better

### 5b. Image Sitemap (code changes)

1. Update `functions/src/sitemap.ts` to include `<image:image>` extensions in the sitemap for each product:
   - `<image:loc>` — mainImageUrl
   - `<image:title>` — `seo.imageAltText || {brand} {name}`
   - `<image:caption>` — `seo.metaDescription || description`
   - Include additional product images (up to 5) from `images[]` array
2. The sitemap function already reads all products — just need to add image fields to the Firestore read and XML output

### 5c. Manual Steps — Tutorial (documentation only)

Create a brief tutorial section for the user covering:

1. **Google Search Console**: Submit image sitemap, check indexing
2. **Image file naming**: Recommend descriptive file names when uploading (e.g., "casio-gshock-ga2100.webp" not "IMG_001.webp")
3. **Image sizes**: Recommend at least 1200px wide images for Google Discover/Images
4. **Google Merchant Center**: Optional free product listings for Google Shopping/Images
5. **Alt text best practices**: Short, descriptive, include brand and product type

---

## Relevant Files Summary

| File                                               | Changes                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `src/pages/Admin/components/AdminProductModal.jsx` | Add SEO section with 5 fields + Google preview + form state + submit |
| `src/pages/Products.jsx`                           | Use `p.seo` fields for SEOHead props                                 |
| `src/components/seo/SEOHead.jsx`                   | No changes needed (already accepts all needed props)                 |
| `src/components/seo/ProductJsonLd.jsx`             | Use seo.metaDescription, enhance image schema                        |
| `src/components/product/ProductGallery.jsx`        | Fix alt texts on main image and thumbnails                           |
| `public/_worker.js`                                | Read seo fields from Firestore, use in buildMetaTags                 |
| `functions/src/sitemap.ts`                         | Add `<image:image>` extensions to product URLs                       |
| `src/models/Product.js`                            | Optionally update if used anywhere                                   |

## Verification

1. **Admin UI**: Open admin → create/edit product → verify SEO section appears, character counters work, Google preview renders correctly
2. **Frontend meta tags**: Open product page → inspect `<head>` → verify custom metaTitle, metaDescription, keywords, ogImage appear when set
3. **Fallback behavior**: Leave SEO fields empty → verify auto-generated values still work correctly (no regressions)
4. **Bot injection**: Use `curl -A Googlebot {product-url}` → verify custom SEO meta tags in HTML response
5. **Structured data**: Use Google Rich Results Test (https://search.google.com/test/rich-results) on a product URL → verify Product schema is valid
6. **Image sitemap**: Fetch `/sitemap.xml` → verify `<image:image>` tags appear for products with images
7. **Alt texts**: Inspect product gallery images → verify descriptive alt attributes

## Decisions

- SEO fields stored as nested `seo` map in Firestore (not flat fields) to keep product documents organized
- All SEO fields are optional — always fall back to existing auto-generated values
- Character counters (60 for title, 160 for description) are advisory, not enforced limits
- Google preview in admin is a visual aid, updates in real-time as user types
- Image sitemap includes up to 5 images per product (Google's recommended limit per URL)

## Further Considerations

1. **Bulk SEO editing**: Currently SEO can only be set per-product in the modal. A future improvement could be a bulk SEO editor table view. → Exclude from this plan, can be added later.
2. **Auto-generation with AI**: Could add a "Generate" button that auto-fills SEO fields based on product data using an LLM API. → Exclude from this plan, nice future feature.
3. **Prerendering**: The Cloudflare Worker handles bot injection, but for full SSR-quality SEO, consider Cloudflare Workers SSR or prerendering in the future. → Current setup is sufficient.
