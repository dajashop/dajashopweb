# Plan: Thumbnail 256→512 Migration

## TL;DR

Promena veličine thumbnailova sa 256x256 na 512x512 px. Dve faze: (1) izmena koda da novi uploadi generišu 512x512, (2) migracija svih postojećih thumbova u R2 — download originala, resize na 512, overwrite thumb na istom ključu. Quality ostaje 75%. Firestore URL-ovi se NE menjaju jer se ključ ne menja.

## Činjenice

- Trenutna thumb veličina: 256x256
- Ciljna thumb veličina: 512x512
- Quality: 75% (bez promene)
- R2 bucket: `dajashop-images`, CDN: `cdn.dajashop.rs`
- Thumb key format: `{slug}/{slug}-{index}-thumb.webp` — NE menja se
- Originali su na: `{slug}/{slug}-{index}.webp` (max 2400px)
- Firestore schema: `images[].thumb`, `thumbnailUrl` — URL se ne menja jer je ključ isti

---

## Steps

### Faza 1: Izmena koda (novi uploadi)

1. **`src/utils/imageProcessing.js`** — `generateVariants()` L96-99
   - Promeniti `resizeToWebP(file, 256, 0.75)` → `resizeToWebP(file, 512, 0.75)`

2. **`functions/src/imageUtils.ts`** — konstanta i resize logika
   - L14: `THUMBNAIL_SIZE = 256` → `THUMBNAIL_SIZE = 512`
   - L443-453: Sharp resize automatski koristi `THUMBNAIL_SIZE`, tako da se menja samo konstanta
   - Ako postoji `thumb_256_` prefix za Firebase Storage putanju, promeniti u `thumb_512_` (ili ukloniti)

3. **`functions/src/imageUtils.ts`** — kompajliranje
   - Pokrenuti `cd functions && npm run build` da se TS→JS kompajlira

### Faza 2: Migracioni skript

4. **Napraviti `scripts/migrate-thumbs-512.mjs`** — novi skript po uzoru na `migrate-images-to-r2.mjs`
   - Koristi isti pattern: Firebase Admin SDK init, batch processing, dry-run mode
   - Flow po produktu:
     a. Čita `images[]` array iz Firestore dokumenta
     b. Za svaku sliku: download originala sa `images[i].url` (original, 2400px)
     c. Sharp resize: `sharp(buffer).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 })`
     d. Upload na R2 worker: PUT na isti thumb ključ (parsiran iz `images[i].thumb` URL-a)
     e. Loguje za svaku sliku: stara veličina, nova veličina, ključ
   - **Nema Firestore update** — URL-ovi ostaju isti jer se ključ ne menja, samo se blob zameni
   - Parametri: `--dry-run`, `--batch-size N`, `--product-id <id>`, `--confirm`
   - Statistika na kraju: ukupno proizvoda, ukupno thumbova, uspešno, neuspešno

5. **Verifikacija pre produkcije**
   - `--dry-run` mod: lista sve proizvode i thumbove koji bi bili zamenjeni, prikazuje URL-ove
   - `--product-id <id>` mod: testira na jednom proizvodu

6. **Pokretanje migracije**
   - `node scripts/migrate-thumbs-512.mjs --confirm --batch-size 5`

### Faza 3: Deploy

7. **Deploy Cloud Functions**
   - `firebase deploy --only functions` — deploy novih funkcija sa THUMBNAIL_SIZE=512

8. **Verifikacija**
   - Provera random thumbova na CDN-u da su 512px
   - Test upload novog proizvoda — thumb treba da bude 512x512

---

## Relevant files

- `src/utils/imageProcessing.js` — `generateVariants()` L96: promeniti 256→512 u `resizeToWebP()` pozivu
- `functions/src/imageUtils.ts` — L14: `THUMBNAIL_SIZE` konstanta; L443-453: Sharp resize koristi tu konstantu
- `scripts/migrate-images-to-r2.mjs` — referentni pattern za migration skript (batch, dry-run, Sharp, R2 upload)
- `scripts/rename-r2-images-seo.mjs` — referentni pattern za R2 copy/delete operacije
- `scripts/migrate-thumbs-512.mjs` — NOVI skript za migraciju (kreirati)

## Verification

1. `--dry-run` migracije — proveriti da lista sve proizvode i ispravne ključeve
2. Pokrenuti na jednom proizvodu: `--product-id <test-id> --confirm`
3. Otvoriti thumb URL u browseru, proveriti dimenzije (DevTools → Image dimensions)
4. Upload novog proizvoda kroz admin UI — proveriti da novi thumb bude 512x512
5. Proveriti da ProgressiveImage blur-up efekat radi korektno sa većim thumbom

## Decisions

- Quality ostaje 75% — bez promene
- Zero-downtime NIJE potreban — overwrite na isti ključ je atomičan (PUT zamenjuje blob)
- Firestore se NE ažurira jer se thumb ključ/URL ne menja
- Originalne slike se NE diraju — samo thumbovi
- fit: 'inside' ostaje — thumb čuva aspect ratio unutar 512x512 bounding box

## Further Considerations

1. **CDN cache invalidation** — R2 CDN može keširati stare 256px thumbove. Ako wrangler.toml nema cache headers, možda treba purge. Proveriti da li `_worker.js` setuje Cache-Control i da li Cloudflare treba purge nakon migracije.
2. **Firebase Storage thumbovi** — Ako postoje stari thumbovi u Firebase Storage (pre R2 migracije) sa `thumb_256_` prefiksom, oni su legacy i ne trebaju se dirati. Samo R2 thumbovi su u igri.
