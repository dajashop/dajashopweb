# Plan: Smart Progressive Image Loading + R2 Migration

## TL;DR

Restructure product image storage from Firebase Storage to Cloudflare R2, with client-side WebP resizing (256x256 thumb, 512x512 medium, original), progressive loading, SEO filenames, a data-saver mode toggle with auto-detection, and a migration script for existing products.

---

## Phase 1: Image Processing Utility (No dependencies)

### Step 1.1: Create `src/utils/imageProcessing.js`

- `resizeAndConvertToWebP(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob>` — Uses Canvas API + `canvas.toBlob('image/webp', quality)` to resize and convert
- `generateImageVariants(file: File): Promise<{thumb: Blob, medium: Blob, original: Blob}>` — Calls resizeAndConvertToWebP for 256x256 (quality 0.75), 512x512 (quality 0.75), and original size (quality 0.85 for WebP conversion only, no resize)
- `generateSeoFilename(productSlug: string, index: number, size: 'thumb'|'medium'|'original'): string` — Returns SEO-friendly name e.g., `digitalna-vaga-xp3000-1-thumb.webp`, `digitalna-vaga-xp3000-1-medium.webp`, `digitalna-vaga-xp3000-1-original.webp`
- The slug IS the folder name (already unique via productSlugs collection), so image filenames can be generic per folder — just `{slug}-{index}-{size}.webp`
- Keep aspect ratio when resizing — fit within maxWidth×maxHeight bounding box, don't stretch/distort

**Relevant files:**

- Create: `src/utils/imageProcessing.js`
- Reference: `src/utils/slugUtils.js` — for slug format/normalization patterns

---

## Phase 2: R2 Worker Enhancement (_depends on nothing, parallel with Phase 1_)

### Step 2.1: Add product image namespace to R2 Worker

- File: `src/workers/r2-cache-worker.js`
- Currently uses key pattern `v1/{namespace}/{filename}`
- New convention for product images: namespace = `product-images`, key = `v1/product-images/{slug}/{filename}`
- e.g., `v1/product-images/digitalna-vaga-xp3000/digitalna-vaga-xp3000-1-thumb.webp`

### Step 2.2: Add dedicated image route with optimized headers

- Add `GET /images/{slug}/{filename}` route to the worker
- Response headers: `Cache-Control: public, max-age=31536000, immutable`, `Content-Type: image/webp`
- This gives clean SEO URLs: `https://worker.vagabeta.rs/images/digitalna-vaga-xp3000/digitalna-vaga-xp3000-1-original.webp`

### Step 2.3: Add bulk upload endpoint (for migration)

- Add `POST /upload-batch` route — accepts multiple files in one request
- Returns array of URLs

**Relevant files:**

- Modify: `src/workers/r2-cache-worker.js` — add `/images/` routes, optimized cache headers
- Reference: `wrangler.workers.toml` — R2 bucket bindings (R2_BUCKET = `vaga-beta-cache`, R2_CDN = `vaga-beta-cdn`). Use `R2_CDN` for product images

---

## Phase 3: Upload Flow Refactoring (_depends on Phase 1 + 2_)

### Step 3.1: Create `src/services/ProductImageService.js`

- `uploadProductImages(slug: string, mainImage: File, galleryImages: File[]): Promise<ProductImageData>` — orchestrates the full upload:
  1. For each image (main + gallery), call `generateImageVariants()` to get 3 blobs
  2. Generate SEO filenames using slug + index
  3. Upload all blobs to R2 via `R2CacheService.uploadFile()` with namespace `product-images` and key structure `{slug}/{seo-filename}`
  4. Return structured data: `{ mainImage: {thumb, medium, original}, galleryImages: [{thumb, medium, original}, ...] }`
- `deleteProductImages(slug: string): Promise<void>` — delete all images in a product's folder (for product deletion)

### Step 3.2: Modify `handleAddProduct()` in AdminPanel.jsx

- **Lines ~409-500** in `src/pages/shop/AdminPanel.jsx`
- Replace direct Firebase Storage upload with `ProductImageService.uploadProductImages()`
- Change path: `products/${Date.now()}_${file.name}` → R2 via ProductImageService
- Keep `simulateUpload()` for progress UX (or replace with real R2 upload progress from `useR2Upload` hook)
- Store variant URLs in Firestore instead of single URL

### Step 3.3: Modify `handleEditSubmit()` in AdminPanel.jsx

- **Lines ~678-803** in `src/pages/shop/AdminPanel.jsx`
- Same approach: new images go through ProductImageService
- Old images (string URLs) stay as-is (backward compat)
- New images get variant structure

### Step 3.4: Update Firestore document structure

- **Old format**: `imgUrl: "https://firebasestorage.googleapis.com/..."`, `images: ["url1", "url2"]`
- **New format**:
  ```
  imgUrl: { thumb: "r2-url-256", medium: "r2-url-512", original: "r2-url-full" }
  images: [
    { thumb: "r2-url-256", medium: "r2-url-512", original: "r2-url-full" },
    ...
  ]
  ```
- **Backward compat**: Display components must handle both `typeof imgUrl === 'string'` (old) and `typeof imgUrl === 'object'` (new)

**Relevant files:**

- Create: `src/services/ProductImageService.js`
- Modify: `src/pages/shop/AdminPanel.jsx` — `handleAddProduct()` (~L409), `handleEditSubmit()` (~L678)
- Reference: `src/services/R2CacheService.js` — existing `uploadFile()`, `getFileUrl()` methods
- Reference: `src/hooks/useR2Cache.js` — `useR2Upload()` for progress tracking
- Reference: `src/contexts/R2CacheContext.jsx` — context provider (ensure it wraps admin routes)

---

## Phase 4: Data Saver Context (_parallel with Phase 3_)

### Step 4.1: Create `src/contexts/DataSaverContext.jsx`

- State: `{ isDataSaver: boolean, isAutoDetected: boolean, connectionType: string|null }`
- Persist in localStorage key `vaga-beta-data-saver`
- Auto-detect via `navigator.connection` API:
  - Enable automatically if `effectiveType` is `'slow-2g'` or `'2g'`
  - Suggest (not force) if `effectiveType` is `'3g'`
  - Listen for `change` event on `navigator.connection`
  - If user manually toggles, override auto-detection
- Export: `useDataSaver()` hook returning `{ isDataSaver, toggleDataSaver, connectionInfo }`

### Step 4.2: Add toggle to header/navbar

- Identify the header component (likely in `src/components/layout/` or `src/components/UI/`)
- Add small icon toggle (e.g., a "leaf" or "signal bars" icon from lucide-react/heroicons)
- Show tooltip: "Štednja interneta" / "Ušteda podataka"
- Visual indicator when active (green dot/badge)
- On slow connection auto-detection, show brief toast/snackbar: "Detektovana spora veza — uključena štednja interneta"

### Step 4.3: Wrap app with DataSaverProvider

- Add to provider stack in `src/App.jsx` (alongside existing contexts)

**Relevant files:**

- Create: `src/contexts/DataSaverContext.jsx`
- Modify: Header/Navbar component (find the shop header — likely `src/components/shop/` or `src/components/layout/`)
- Modify: `src/App.jsx` — add DataSaverProvider to context tree

---

## Phase 5: ProgressiveImage Enhancement (_depends on Phase 3 schema + Phase 4_)

### Step 5.1: Update ProgressiveImage to accept variants

- File: `src/components/UI/ProgressiveImage.jsx`
- Add new prop: `variants?: { thumb: string, medium: string, original: string }` (optional for backward compat)
- Loading strategy:
  1. Immediately load and display `thumb` (256x256, ~5-15KB WebP — nearly instant)
  2. In background, start loading `medium` (512x512)
  3. When medium loads, crossfade from thumb → medium
  4. If viewport > 512px or user zooms, load `original`
  5. Smooth transitions between each stage (already has CSS transitions)

### Step 5.2: Data saver integration

- Consume `useDataSaver()` inside ProgressiveImage
- When `isDataSaver === true`:
  - Stop at `thumb` variant (256x256)
  - Skip loading medium and original entirely
  - Only load original on explicit user action (click to zoom in ImageModal)

### Step 5.3: Update `src` resolution helper

- Create internal helper: `getImageSrc(srcProp, variants, dataSaver): string`
  - If `variants` is provided and `dataSaver`: return `variants.thumb`
  - If `variants` is provided: return `variants.medium` (default display)
  - If `srcProp` is string (old format): return as-is (backward compat)
  - If `srcProp` is object with `.thumb/.medium/.original`: treat as variants
- Update srcSet generation: for R2 URLs, don't use Cloudflare `/cdn-cgi/image/` — R2 images are already resized

### Step 5.4: Backward compatibility

- When `src` is a plain string (old Firebase URL) and no `variants` prop: behave exactly as before
- When `src` is an object or `variants` is provided: use new progressive strategy
- This ensures zero breakage for existing products

**Relevant files:**

- Modify: `src/components/UI/ProgressiveImage.jsx` — add variants prop, progressive loading, data-saver integration
- Reference: `src/contexts/DataSaverContext.jsx` (created in Phase 4)

---

## Phase 6: Update Consumer Components (_depends on Phase 5_)

### Step 6.1: ProductCard

- File: `src/components/shop/ProductCard.jsx`
- Change `<ProgressiveImage src={product.imgUrl} ... />` to pass variants:
  ```
  src={typeof product.imgUrl === 'string' ? product.imgUrl : product.imgUrl?.medium}
  variants={typeof product.imgUrl === 'object' ? product.imgUrl : undefined}
  ```
- ProductCard always shows small images (128-160px) so `thumb` is sufficient even without data-saver

### Step 6.2: ProductDetails

- File: `src/components/shop/ProductDetails.jsx`
- Update image carousel to pass variants for both main image and gallery images
- For `images[]` array: handle both old format (string[]) and new format (object[])
- ImageModal (zoom): always load `original` variant regardless of data-saver

### Step 6.3: ProductForm / EditProductModal (admin)

- Files: `src/components/AdminPanel/ProductForm.jsx`, `src/components/UI/EditProductModal.jsx`
- Previews during upload still use `URL.createObjectURL()` (no change needed for preview)
- For edit mode: show existing images using `medium` variant URL

### Step 6.4: SEO/JSON-LD structured data

- Update product JSON-LD schema in ProductDetails to use `original` variant URL
- Alt tags: already using `product.name` — good for SEO

**Relevant files:**

- Modify: `src/components/shop/ProductCard.jsx`
- Modify: `src/components/shop/ProductDetails.jsx`
- Modify: `src/components/AdminPanel/ProductForm.jsx` (edit mode image display)
- Modify: `src/components/UI/EditProductModal.jsx`
- Reference: `src/components/UI/ImageModal.jsx` — ensure zoom uses original

---

## Phase 7: Migration Script (_parallel with Phase 6, depends on Phase 2 + 3_)

### Step 7.1: Create `scripts/migrate-product-images.mjs`

- Use firebase-admin SDK (already available in `functions/`)
- For each product in Firestore:
  1. Download current `imgUrl` and all `images[]` from Firebase Storage
  2. Resize each to 256x256, 512x512 (using `sharp` — Node.js, not Canvas API)
  3. Convert all to WebP at 75% quality
  4. Upload all variants to R2 (via worker's `/upload` endpoint or direct R2 SDK with wrangler)
  5. Update Firestore document with new variant structure
  6. Log progress: `[12/45] Migrated: digitalna-vaga-xp3000`
- Support `--dry-run` flag (log only, no writes)
- Support `--product-id <id>` for single product migration
- Handle errors gracefully: skip failed products, log them, continue

### Step 7.2: Add `sharp` to scripts or functions dependencies

- For Node.js migration script: `npm install sharp --save-dev` (dev dependency)
- Sharp is much better than Canvas for server-side image processing

**Relevant files:**

- Create: `scripts/migrate-product-images.mjs`
- Modify: `package.json` — add `sharp` as devDependency, add script `"migrate:images": "node scripts/migrate-product-images.mjs"`
- Reference: `functions/serviceAccountKey.json` — Firebase Admin auth
- Reference: `scripts/migrate-product-slugs.mjs` — existing migration script pattern to follow

---

## Phase 8: Cache & SEO Headers (_parallel with Phase 6_)

### Step 8.1: Update `public/_headers` for R2 image URLs

- If R2 worker serves from `worker.vagabeta.rs/images/*`, headers are set in the worker itself (Step 2.2)
- No changes needed in `_headers` for R2 served content

### Step 8.2: Update SSR middleware for product images

- File: `functions/_middleware.js`
- In the product detail SSR route (`/p/{slug}`), add `og:image` meta tag using `original` variant URL
- Ensures social media shares use full-quality image

### Step 8.3: Sitemap image URLs

- File: `scripts/generate-sitemap.js` / `scripts/generate-sitemap-ssr.js`
- Update `<image:loc>` entries to use `original` variant URL from R2

**Relevant files:**

- Modify: `functions/_middleware.js` — og:image meta with R2 URL
- Modify: `scripts/generate-sitemap.js` — image URLs
- Modify: `scripts/generate-sitemap-ssr.js` — image URLs

---

## Verification

1. **Unit test image processing** — Create test: upload a 2000x1500 JPEG → verify 3 WebP blobs are generated with correct dimensions (256x256, 512x512, proportional original)
2. **R2 upload test** — Upload test image to R2, verify it's accessible at `worker.vagabeta.rs/images/{slug}/{filename}`, verify response headers include `Cache-Control: public, max-age=31536000, immutable` and `Content-Type: image/webp`
3. **Admin panel test** — Add new product with 3 gallery images → verify Firestore document has variant format for all images → verify all 3 variants are accessible in R2
4. **Progressive loading test** — Open product page in Chrome DevTools (Network tab, slow 3G throttle) → verify thumb loads first (<50ms), then medium crossfades in, then original for large viewports
5. **Data saver test** — Toggle data saver ON → navigate shop → verify only 256x256 images load in Network tab → click product image zoom → verify original loads
6. **Auto-detection test** — In DevTools, set network to "Slow 3G" → reload page → verify data saver activates automatically with snackbar notification
7. **Backward compat test** — Old products with string `imgUrl` should render identically to before (no regression)
8. **Migration dry-run** — Run `node scripts/migrate-product-images.mjs --dry-run` → verify it logs all products that would be migrated without writing anything
9. **Migration execution** — Run migration → verify Firestore documents updated → verify R2 images accessible → verify site still renders all products correctly
10. **SEO test** — Check `/p/{slug}` SSR output → verify `og:image` uses full R2 URL → check sitemap.xml for correct image URLs
11. **Lighthouse** — Run Lighthouse on product listing and detail pages → verify LCP improvement

---

## Decisions & Scope

### Included:

- Client-side WebP resizing (256, 512, original) via Canvas API
- R2 storage with dedicated `/images/` worker route
- Progressive thumb → medium → original loading
- Data saver mode with auto-detection + manual toggle in header
- Migration script for existing products (sharp for Node.js)
- SEO filenames based on product slug
- Backward compatibility with old Firebase Storage URLs

### Excluded:

- Firebase Storage cleanup (old images remain, can be cleaned later manually)
- R2 custom domain setup (uses existing `worker.vagabeta.rs`)
- Video handling (only product images)
- User profile images (stay in Firebase Storage)
- Datasheet/markdown file migration (stay in Firebase Storage)

### Key Assumptions:

- Slug is unique and immutable (confirmed — `productSlugs` collection enforces this)
- `worker.vagabeta.rs` is deployed and operational
- R2 buckets `vaga-beta-cache` and `vaga-beta-cdn` exist
- WebP is acceptable (97%+ browser support as of 2026)
- 75% quality is acceptable for resized variants
