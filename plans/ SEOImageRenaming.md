# Plan: SEO Image Renaming

## Status: Draft

## Context

Current R2 key format (BAD):
`casio-g-shock/1704067200000-a1b2c3d4-casio-g-shock-1-thumb.webp`

Target R2 key format (GOOD):
`casio-g-shock/casio-g-shock-1-thumb.webp` or `casio-g-shock/casio-g-shock-1.webp`

## Key Files

- functions/src/imageUtils.ts — uploadProductImagesToR2 callable (line ~470-530)
- src/utils/imageProcessing.js — generateSeoFilename(), slugify()
- src/services/r2ImageService.js — client-side upload orchestration
- src/components/ProductCard.jsx — missing alt text
- src/components/product/ProductGallery.jsx — has alt text, needs review
- functions/src/sitemap.ts — image sitemap exists, needs <image:title>, <image:caption>
- scripts/ — need new rename migration script

## Root Cause

In `uploadProductImagesToR2`, a `uniqueSuffix = "${Date.now()}-${uuidv4()}"` is prepended to the clean SEO filename from client. That defeats the descriptive naming.

## Plan Phases

### Phase 1: Fix upload naming (new uploads)

1. Modify `generateSeoFilename()` in `src/utils/imageProcessing.js`:
   - Change 'original' variant to '' (empty) so output is `{slug}-{n}.webp` not `{slug}-{n}-original.webp`
   - Keep 'thumb' → `{slug}-{n}-thumb.webp`
2. Modify `uploadProductImagesToR2` in `functions/src/imageUtils.ts`:
   - Remove the `uniqueSuffix` prepend
   - New key: `${slug}/${thumbFileName}` and `${slug}/${originalFileName}` directly
   - Add note: overwriting same key on re-upload is acceptable (same index = same key = natural replacement)

### Phase 2: Fix alt text in ProductCard

1. Check ProgressiveImage component for how alt prop is handled
2. In ProductCard.jsx, compute alt = `${p.brand} ${p.name}`.trim() and pass to each image

### Phase 3: Verify image sitemap

1. In sitemap.ts, ensure image entries include `<image:title>` (product name) and `<image:caption>` (product description or seo.description)
2. Both thumbnail and original URLs are in sitemap

### Phase 4: Migration script for existing images

1. New script `scripts/rename-r2-images-seo.mjs`:
   - Reads all products from Firestore
   - For each product, extracts current image URLs, parses the old key
   - Copies each R2 object to new SEO-friendly key via Worker API
   - Updates Firestore document with new URLs
   - Deletes old R2 objects
2. This touches production data — user must confirm before running
