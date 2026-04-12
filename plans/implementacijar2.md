# Plan: Firebase Storage → Cloudflare R2 Migration with Thumbnails

## TL;DR

Migrate product image storage from Firebase Storage to Cloudflare R2 via a dedicated Cloudflare Worker (`cdn.dajashop.rs`). Generate 256x256 WebP thumbnails client-side during upload, store both thumb + original in R2, and implement progressive blur-up loading. Includes migration script for existing products.

---

## Phase 1: R2 Worker Setup (No code dependencies)

### Step 1.1: Create `wrangler.toml` in project root

- Configure R2 bucket binding (e.g. `DAJASHOP_IMAGES`)
- Set custom domain route: `cdn.dajashop.rs/*`
- Environment variables for CORS origins

### Step 1.2: Create `src/workers/r2-image-worker.js`

- **Routes:**
  - `PUT /images/{slug}/{filename}` — Upload image to R2 (auth token required — server-to-server only, NOT called from browser)
  - `GET /images/{slug}/{filename}` — Serve image with optimized cache headers (public, no auth)
  - `DELETE /images/{slug}/*` — Delete all images for a product (auth token required)
- **Headers:** `Cache-Control: public, max-age=31536000, immutable`, `Content-Type: image/webp`
- **CORS:** Allow `dajashop.rs` origins (for GET only)
- **Auth:** Shared secret token in `X-Auth-Token` header for PUT/DELETE (only Cloud Functions call these)

### Step 1.3: Cloudflare Dashboard setup (manual)

- Create R2 bucket (e.g. `dajashop-images`)
- Add custom domain `cdn.dajashop.rs` pointing to worker
- Set Worker environment variable for auth token

**Relevant files:**

- Create: `wrangler.toml`
- Create: `src/workers/r2-image-worker.js`

---

## Phase 2: Client-Side Image Processing Utility (Parallel with Phase 1)

### Step 2.1: Create `src/utils/imageProcessing.js`

- `resizeToWebP(file: File, maxSize: number, quality: number): Promise<Blob>` — Canvas API resize + `toBlob('image/webp', quality)`
  - Maintains aspect ratio — fit within `maxSize × maxSize` bounding box
  - 256×256 thumb at quality 0.75 (~5-15KB)
  - Original converted to WebP at quality 0.85
- `generateVariants(file: File): Promise<{thumb: Blob, original: Blob}>` — Returns both variants
- `generateSeoFilename(slug: string, index: number, variant: 'thumb'|'original'): string` — Returns e.g. `digitalna-vaga-1-thumb.webp`

**Relevant files:**

- Create: `src/utils/imageProcessing.js`
- Reference: `src/pages/Admin/utils/generators.js` — `generateSlug()` pattern

---

## Phase 3: R2 Upload Service (Depends on Phase 1 + 2)

### Step 3.1: Create `src/services/r2ImageService.js`

- `uploadProductImage(slug, file, index): Promise<{thumb: string, original: string}>` — Orchestrates:
  1. Call `generateVariants(file)` to get thumb + original blobs (client-side Canvas API)
  2. Convert blobs to base64
  3. Call Cloud Function `uploadProductImagesToR2({ slug, index, thumbBase64, originalBase64 })`
  4. Cloud Function uploads to R2 and returns CDN URLs
  5. Return URLs: `{ thumb: "https://cdn.dajashop.rs/images/{slug}/{name}-thumb.webp", original: "https://cdn.dajashop.rs/images/{slug}/{name}-original.webp" }`
- `uploadProductImages(slug, files): Promise<Array<{thumb, original}>>` — Batch upload all images
- `deleteProductImages(slug): Promise<void>` — Calls Cloud Function to delete via R2 worker
- **No R2 auth token in client code** — all R2 writes go through Cloud Function proxy

### Step 3.2: Modify `ImageManager.jsx` — local file upload path

- **File:** `src/pages/Admin/components/ImageManager.jsx`
- In `handleUpload()` (line ~60): Replace `uploadImages()` from `products.js` with `r2ImageService.uploadProductImage()`
- Instead of returning `{ url, path }` (Firebase format), return `{ url: original, thumb, path: r2Key }`
- Keep progress tracking UX (can use XHR/fetch upload progress or simulate)
- Thumbnail generation: no longer calls `generateThumbnail()` Cloud Function — thumb is generated client-side as part of `generateVariants()`

### Step 3.3: Modify `ImageManager.jsx` — remote URL upload path

- In `handleUrlUpload()` (line ~103):
  - Keep calling `uploadRemoteImage()` Cloud Function — same API as before
  - Cloud Function internally changes target from Firebase Storage → R2 (handled in Phase 6)
  - Response format stays compatible: `{ success, results, mainImageUrl, thumbnailUrl }`
  - Client-side code changes are minimal — just map response URLs to new `{ url, thumb }` format

### Step 3.4: Update Firestore document structure

- **Current:** `images: [{ url: "firebase-url", path: "products/..." }]`, `mainImageUrl: "firebase-url"`, `thumbnailUrl: "firebase-url"`
- **New format:**
  ```
  images: [
    { url: "cdn.dajashop.rs/.../original.webp", thumb: "cdn.dajashop.rs/.../thumb.webp", path: "images/{slug}/{name}" },
    ...
  ]
  mainImageUrl: "cdn.dajashop.rs/.../original.webp"
  thumbnailUrl: "cdn.dajashop.rs/.../thumb.webp"
  ```
- Backward compatible: display components already do fallbacks

**Relevant files:**

- Create: `src/services/r2ImageService.js`
- Modify: `src/pages/Admin/components/ImageManager.jsx` — `handleUpload()` (~L60), `handleUrlUpload()` (~L103)
- Modify: `src/services/products.js` — `uploadImages()` can be deprecated or redirected
- Reference: `src/services/admin.js` — `uploadRemoteImage()`, `generateThumbnail()`

---

## Phase 4: Progressive Loading Component (Depends on Phase 3 schema)

### Step 4.1: Create `src/components/ui/ProgressiveImage.jsx`

- Props: `src` (original URL), `thumbSrc` (256x256 URL), `alt`, `className`, standard img props
- Behavior:
  1. Immediately render `<img src={thumbSrc}>` with CSS `filter: blur(8px)` and `transform: scale(1.05)`
  2. Create `new Image()` in useEffect to preload `src` (original)
  3. When original loads, crossfade: remove blur, swap src
  4. CSS transition: `filter 0.4s ease, opacity 0.4s ease`
- Fallback: if no `thumbSrc`, render `src` directly (backward compat for old products)
- Use `loading="lazy"` for off-screen images

### Step 4.2: Add CSS for blur-up transition

- In same file or companion CSS module
- Minimal: `.progressive-img--loading { filter: blur(8px); transform: scale(1.05); }` → `.progressive-img--loaded { filter: none; transform: scale(1); transition: filter 0.4s, transform 0.4s; }`

**Relevant files:**

- Create: `src/components/ui/ProgressiveImage.jsx`

---

## Phase 5: Update Consumer Components (Depends on Phase 4)

### Step 5.1: ProductCard.jsx

- **File:** `src/components/ProductCard.jsx` (~L218-231)
- Replace `<img>` with `<ProgressiveImage>`
- `thumbSrc={p.thumbnailUrl || p.images?.[0]?.thumb}`
- `src={imgs[imageIndex]?.url ?? p.image}`
- For the card grid (small 128-160px displays), thumb 256x256 is perfect and may be the only version needed

### Step 5.2: ProductGallery.jsx

- **File:** `src/components/product/ProductGallery.jsx` (~L80-100)
- Replace main `<img>` with `<ProgressiveImage>`
- `thumbSrc={activeItem?.thumb}` (from image object's `.thumb` property)
- `src={activeItem?.src}` (original)
- Thumbnail strip: use `.thumb` URLs for small previews

### Step 5.3: ImageGalleryModal.jsx (zoom)

- **File:** `src/components/modals/ImageGalleryModal.jsx`
- Always use original URL for full-screen zoom
- Can use `<ProgressiveImage>` with thumb as placeholder while original loads

### Step 5.4: RelatedProducts.jsx

- **File:** `src/components/product/RelatedProducts.jsx` (~L75-85)
- Use thumb URL for related product images (small display)

### Step 5.5: Products.jsx page

- **File:** `src/pages/Products.jsx` (~L80)
- Update `productImage` fallback chain to prefer thumb for list view

### Step 5.6: Cart.jsx

- **File:** `src/pages/Cart.jsx`
- When adding to cart, store both `image` (original) and `thumb` URLs
- Display thumb in cart (small images)

### Step 5.7: SEO metadata

- **File:** `src/components/seo/ProductJsonLd.jsx` — use original URLs for structured data
- **File:** `public/_worker.js` (~L43) — update `og:image` resolution to use original R2 URL

**Relevant files:**

- Modify: `src/components/ProductCard.jsx`
- Modify: `src/components/product/ProductGallery.jsx`
- Modify: `src/components/modals/ImageGalleryModal.jsx`
- Modify: `src/components/product/RelatedProducts.jsx`
- Modify: `src/pages/Products.jsx`
- Modify: `src/pages/Cart.jsx`
- Modify: `src/components/seo/ProductJsonLd.jsx`
- Modify: `public/_worker.js`

---

## Phase 6: Cloud Function Update (Parallel with Phase 5)

### Step 6.1: Add R2 upload helper to `functions/src/imageUtils.ts`

- Create `uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string>` helper
  - Uses `fetch()` to PUT to `cdn.dajashop.rs/images/{key}` with `X-Auth-Token` header
  - Auth token from `functions.config().r2.auth_token` or `process.env.R2_AUTH_TOKEN`
  - Returns CDN URL: `https://cdn.dajashop.rs/images/{key}`

### Step 6.2: Create new Cloud Function `uploadProductImagesToR2`

- **File:** `functions/src/index.ts` — new HTTP callable export
- Receives from client: `{ slug, index, thumbBase64, originalBase64 }`
- Validates Firebase Auth (user must be admin)
- Decodes base64 → buffers
- Calls `uploadToR2()` for both thumb + original
- Returns `{ thumb: "cdn-url-thumb", original: "cdn-url-original" }`

### Step 6.3: Modify existing `saveImageFromUrl` Cloud Function

- **File:** `functions/src/imageUtils.ts` — `processMainImageWithResize()`
- Change sharp resize from 500×500 to 256×256 for thumb
- Replace `uploadBuffer()` (Firebase Storage) with `uploadToR2()` for both thumb + original WebP
- Return R2 CDN URLs instead of Firebase Storage URLs
- Response format stays compatible: `{ success, results, mainImageUrl, thumbnailUrl }`

### Step 6.4: Create `deleteProductImagesFromR2` Cloud Function

- Receives: `{ slug }`
- Validates admin auth
- Calls R2 Worker `DELETE /images/{slug}/*` with auth token
- Used when deleting products from admin panel

### Step 6.5: Update `functions/src/index.ts` exports

- Add: `uploadProductImagesToR2`, `deleteProductImagesFromR2`
- Deprecate: `generateThumbnailFromStorage` (thumbnails now part of upload flow)
- Environment config: `firebase functions:config:set r2.auth_token="..." r2.worker_url="https://cdn.dajashop.rs"`

**Relevant files:**

- Modify: `functions/src/imageUtils.ts` — add `uploadToR2()`, modify `processMainImageWithResize()`
- Modify: `functions/src/index.ts` — add `uploadProductImagesToR2`, `deleteProductImagesFromR2` exports
- Modify: `functions/package.json` — no new deps needed (sharp + fetch already available in Node 22)

---

## Phase 7: Migration Script (Depends on Phase 1 worker being deployed)

### Step 7.1: Create `scripts/migrate-images-to-r2.mjs`

- Uses `firebase-admin` SDK + `sharp` for processing
- For each product in Firestore:
  1. Download current images from Firebase Storage (`mainImageUrl`, `images[].url`)
  2. Use `sharp` to create 256x256 WebP thumb + convert original to WebP
  3. Upload both to R2 via worker's PUT endpoint
  4. Update Firestore document with new URLs (keep old fields for rollback)
  5. Log progress: `[12/45] ✓ digitalna-vaga-xp3000 — 3 images migrated`
- Flags: `--dry-run` (log only), `--product-id <id>` (single product), `--batch-size <n>` (default 5 concurrent)
- Error handling: skip failed products, log errors, continue, summary at end

### Step 7.2: Add script entry to `package.json`

- `"migrate:images": "node scripts/migrate-images-to-r2.mjs"`
- Add `sharp` as devDependency if not in root (it's in `functions/package.json` but not root)

**Relevant files:**

- Create: `scripts/migrate-images-to-r2.mjs`
- Modify: `package.json` — add script + `sharp` devDep

---

## Verification

1. **Image processing unit test** — Upload a 2000×1500 JPEG → verify 2 WebP blobs generated (256×256 thumb, original-proportional WebP) with correct dimensions
2. **R2 Worker test** — Upload test image via `PUT /images/test/test-1-original.webp` → verify `GET` returns image with correct headers (`Cache-Control: immutable`, `Content-Type: image/webp`)
3. **Admin upload test** — Add product with 3 gallery images → verify Firestore has `thumb` URLs for each image → verify R2 images accessible at `cdn.dajashop.rs/images/{slug}/...`
4. **Progressive loading** — Open product page, throttle to Slow 3G in DevTools → verify thumb appears instantly (blurred), then original crossfades in
5. **Backward compat** — Existing products with Firebase Storage URLs should display identically (no regression)
6. **Migration dry-run** — `npm run migrate:images -- --dry-run` → verify log output without writes
7. **Migration run** — Migrate 2-3 test products → verify site renders correctly, R2 images load, thumbs display
8. **SEO test** — Curl `/product/{slug}` with Googlebot UA → verify `og:image` uses R2 original URL
9. **Lighthouse** — Run on product listing + detail pages → verify LCP improvement from thumb loading

---

## Decisions

- **Thumb + original only** (no medium variant) — simpler architecture, thumb handles small displays, original for detail/zoom
- **256×256 thumb** — good for ProductCard (~160px), gallery thumbnails, cart items
- **WebP only** — 97%+ browser support, significant size savings
- **No Data Saver mode** — excluded per user decision
- **`cdn.dajashop.rs`** — dedicated CDN subdomain for R2 worker
- **Firebase Storage cleanup excluded** — old images remain, can be cleaned later
- **Cloud Function URL upload updates in Phase 6** — server-side sharp processing stays, just targets R2
- **Cloud Function proxy for ALL uploads** — R2 auth token never touches client-side code. Local file uploads: client generates variants (Canvas API) → sends base64 to Cloud Function → Cloud Function uploads to R2. Remote URL uploads: Cloud Function downloads + processes + uploads to R2 directly
- **Client-side processing for local uploads** — Canvas API for WebP conversion + resize (reduces Cloud Function compute, but blobs still proxied through Cloud Function for auth)

## Resolved: Upload Architecture

### R2 Auth Strategy — Cloud Function Proxy

- **Problem:** `VITE_R2_UPLOAD_TOKEN` u client-side kodu znači da je token vidljiv u browser-u. Bilo ko može da uzme token iz JS bundlea i uploaduje slike direktno.
- **Odluka:** Svi uploadi (lokalni fajlovi + remote URL) idu kroz Cloud Function kao proxy. R2 auth token ostaje isključivo server-side (`functions/.env` / Firebase config). R2 Worker GET endpoint je javni (serviranje slika bez auth-a).
- **Flow za lokalni upload:**
  1. Client: Canvas API generiše thumb (256×256 WebP) + original (WebP)
  2. Client: šalje oba blob-a Cloud Functionu (`uploadProductImagesToR2`) kao base64 ili multipart
  3. Cloud Function: prima blob-ove, uploaduje na R2 sa auth tokenom, vraća CDN URL-ove
  4. Client: sprema URL-ove u Firestore
- **Flow za remote URL upload:**
  1. Client: poziva `uploadRemoteImage(url, slug)` Cloud Function (kao i sada)
  2. Cloud Function: preuzima sliku, sharp generiše thumb + WebP original, uploaduje OBA na R2
  3. Cloud Function: vraća `{ mainImageUrl, thumbnailUrl, images: [...] }` sa R2 CDN URL-ovima
  4. Client: sprema u Firestore (isti handler kao sada)

### Implikacije na plan

- `src/services/r2ImageService.js` — NE uploaduje direktno na R2 Worker. Umesto toga poziva Cloud Function za upload
- R2 Worker (`r2-image-worker.js`) — NEMA `PUT` route od klijenta. PUT dolazi samo iz Cloud Function (server-to-server sa auth tokenom)
- Cloud Function dobija novi `R2_AUTH_TOKEN` i `R2_WORKER_URL` environment varijable
- Nova Cloud Function: `uploadProductImagesToR2` — prima base64 blob-ove od klijenta, uploaduje na R2
- Postojeća Cloud Function `saveImageFromUrl` — menja target sa Firebase Storage na R2
