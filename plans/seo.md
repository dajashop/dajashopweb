# Plan: 500x500 Thumbnail za lokalni upload

## TL;DR

Lokalni upload slika (file picker) ne generiše 500x500 thumbnail — samo remote URL upload to radi preko `saveImageFromUrl` CF. Rešenje: nova callable CF `generateThumbnailFromStorage` + frontend integracija.

## Faza 1: Backend — Nova Cloud Function

1. U `functions/src/imageUtils.ts` dodati novu callable CF `generateThumbnailFromStorage`:
   - **Input:** `{ storagePath: string }` — putanja fajla u Storage (npr. `products/casio-a500/1234_photo.jpg`)
   - Čita fajl: `bucket.file(storagePath).download()`
   - Resize: `sharp(buffer).resize(500, 500, { fit: inside, withoutEnlargement: true }).webp({ quality: 80 })`
   - Upload thumbnail sa `resized_500x500_` prefiksom u isti folder koristeći `uploadBuffer()` helper
   - Generiše stable download URL za original: `getStableDownloadUrl()`
   - **Output:** `{ success: boolean, thumbnailUrl: string, mainImageUrl: string, thumbnailPath: string }`
   - Config: region `europe-west3`, memory `1GiB`, timeout `120s`

2. Eksportovati u `functions/src/index.ts`

## Faza 2: Frontend — Servis i poziv CF (zavisi od Faze 1)

3. U `src/services/admin.js` dodati `generateThumbnail(storagePath)`:
   - Callable wrapper po uzoru na `uploadRemoteImage()`
   - Poziva CF `generateThumbnailFromStorage`

4. U `src/pages/Admin/components/ImageManager.jsx`, u `handleUpload()` (~linija 62):
   - Posle uspešnog uploada proveriti `images.length === 0` pre uploada (znači uploadovana postaje index 0)
   - Ako jeste, pozvati `generateThumbnail(uploaded[0].path)`
   - Proslediti rezultat kroz `onRemoteUploadSuccess?.(res)` callback
   - Loading state dok CF radi

5. `AdminProductModal.jsx` → `handleRemoteImageSuccess()` — **BEZ PROMENA** (već pravilno setuje thumbnailUrl i mainImageUrl)

## Faza 3: Reorder scenario (opciono, za sledeću iteraciju)

6. U `handleImageChange()` u `AdminProductModal.jsx` kad se index 0 promeni, opciono pozvati `generateThumbnail()` za novu prvu sliku. Za sada fallback na pun URL je OK.

## Relevantni fajlovi

- `functions/src/imageUtils.ts` — no# Plan: 500x500 Thumbnail za lokalni upload

## TL;DR

Lokalni upload slika (file picker) ne generiše 500x500 thumbnail — samo remote URL upload to radi preko `saveImageFromUrl` CF. Rešenje: nova callable CF `generateThumbnailFromStorage` + frontend integracija.

## Faza 1: Backend — Nova Cloud Function

1. U `functions/src/imageUtils.ts` dodati novu callable CF `generateThumbnailFromStorage`:
   - **Input:** `{ storagePath: string }` — putanja fajla u Storage (npr. `products/casio-a500/1234_photo.jpg`)
   - Čita fajl: `bucket.file(storagePath).download()`
   - Resize: `sharp(buffer).resize(500, 500, { fit: inside, withoutEnlargement: true }).webp({ quality: 80 })`
   - Upload thumbnail sa `resized_500x500_` prefiksom u isti folder koristeći `uploadBuffer()` helper
   - Generiše stable download URL za original: `getStableDownloadUrl()`
   - **Output:** `{ success: boolean, thumbnailUrl: string, mainImageUrl: string, thumbnailPath: string }`
   - Config: region `europe-west3`, memory `1GiB`, timeout `120s`

2. Eksportovati u `functions/src/index.ts`

## Faza 2: Frontend — Servis i poziv CF (zavisi od Faze 1)

3. U `src/services/admin.js` dodati `generateThumbnail(storagePath)`:
   - Callable wrapper po uzoru na `uploadRemoteImage()`
   - Poziva CF `generateThumbnailFromStorage`

4. U `src/pages/Admin/components/ImageManager.jsx`, u `handleUpload()` (~linija 62):
   - Posle uspešnog uploada proveriti `images.length === 0` pre uploada (znači uploadovana postaje index 0)
   - Ako jeste, pozvati `generateThumbnail(uploaded[0].path)`
   - Proslediti rezultat kroz `onRemoteUploadSuccess?.(res)` callback
   - Loading state dok CF radi

5. `AdminProductModal.jsx` → `handleRemoteImageSuccess()` — **BEZ PROMENA** (već pravilno setuje thumbnailUrl i mainImageUrl)

## Faza 3: Reorder scenario (opciono, za sledeću iteraciju)

6. U `handleImageChange()` u `AdminProductModal.jsx` kad se index 0 promeni, opciono pozvati `generateThumbnail()` za novu prvu sliku. Za sada fallback na pun URL je OK.

## Relevantni fajlovi

- `functions/src/imageUtils.ts` — nova CF, reuse `uploadBuffer()`, `getStableDownloadUrl()`, Sharp
- `functions/src/index.ts` — eksport
- `src/services/admin.js` — novi wrapper `generateThumbnail()`
- `src/pages/Admin/components/ImageManager.jsx` — poziv CF posle lokalnog uploada index 0
- `src/components/ProductCard.jsx` — BEZ PROMENA (već koristi thumbnailUrl)

## Verifikacija

1. Lokalni upload za nov proizvod → proveriti `resized_500x500_*.webp` u Storage
2. Sačuvati → proveriti `thumbnailUrl` u Firestore dokumentu
3. Katalog → DevTools Network → potvrda da ProductCard učitava webp
4. URL upload → regresioni test
5. Reorder slika → thumbnail se resetuje na novu prvu

## Odluke

- Callable CF (eksplicitni poziv) umesto onFinalize
- Samo novi proizvodi (bez backfill-a)
- Reorder auto-regeneracija → sledeća iteracija
- CF čita iz Storage (ne prima base64 sa klijenta)
  va CF, reuse `uploadBuffer()`, `getStableDownloadUrl()`, Sharp
- `functions/src/index.ts` — eksport
- `src/services/admin.js` — novi wrapper `generateThumbnail()`
- `src/pages/Admin/components/ImageManager.jsx` — poziv CF posle lokalnog uploada index 0
- `src/components/ProductCard.jsx` — BEZ PROMENA (već koristi thumbnailUrl)

## Verifikacija

1. Lokalni upload za nov proizvod → proveriti `resized_500x500_*.webp` u Storage
2. Sačuvati → proveriti `thumbnailUrl` u Firestore dokumentu
3. Katalog → DevTools Network → potvrda da ProductCard učitava webp
4. URL upload → regresioni test
5. Reorder slika → thumbnail se resetuje na novu prvu

## Odluke

- Callable CF (eksplicitni poziv) umesto onFinalize
- Samo novi proizvodi (bez backfill-a)
- Reorder auto-regeneracija → sledeća iteracija
- CF čita iz Storage (ne prima base64 sa klijenta)
