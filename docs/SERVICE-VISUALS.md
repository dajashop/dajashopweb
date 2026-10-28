# Vizuelni pravac usluga

Pripremljeno 28.10.2026. Korišćeni skillovi: `frontend-design` i `imagegen`. Generacija: ugrađeni `image_gen.imagegen`, bez API/CLI generacije. Vizuali su ilustrativni prizori usluga, bez tvrdnje da predstavljaju stvarnu opremu ili enterijer DajaShop radnje.

## Dizajn

Paleta prati postojeći sajt: tekst #111111, bela #FFFFFF, površina #F5F5F7, sekundarni tekst #6E6E73 i srebrna #D2D2D7. Tamni fotografski kadrovi daju prostor proizvodima i materijalima. Font ostaje isti kao u ostatku sajta; veći osnovni tekst i dugmad, naslovi sa umerenim razmakom slova. Nova kompozicija zamenjuje stari sistem crteža, oznaka i sitnog teksta.

Širina je ista kao header: min(1600px, 92vw). Na desktopu uvod spaja tekst levo sa odgovarajućim prizorom usluge desno. Na telefonu slika i tekst su zasebni delovi istog uvoda. Pregled sadrži istaknutu gravuru i četiri fotografske kartice; detalji imaju tri stavke obuhvata, opis, pripremu, nativni FAQ i kontakt. Numeracija postoji samo u stvarnom procesu od tri koraka.

## Sačuvani rezultati

`public/images/services/engraving-{640,960,1600}.webp` i `engraving-share.jpg`.

`public/images/services/battery-{640,960,1600}.webp` i `battery-share.jpg`.

`public/images/services/strap-{640,960,1600}.webp` i `strap-share.jpg`.

`public/images/services/sizing-{640,960,1600}.webp` i `sizing-share.jpg`.

`public/images/services/remote-{640,960,1600}.webp` i `remote-share.jpg`.

Priprema dimenzija i formata: `scripts/prepare-service-assets.mjs`, postojeći sharp, WebP kvalitet 82 i JPEG kvalitet 84. Izvorne generisane PNG datoteke ostaju u lokalnom Codex generated_images direktorijumu; sajt koristi rezultate sačuvane u repozitorijumu.

## Promptovi poslati generatoru

### Graviranje

Create a premium editorial website hero photograph for a Serbian watch shop service: laser engraving on the stainless-steel case back of an elegant wristwatch. Close-up of a professional laser engraver at work in a clean, modern watchmaker workshop. The engraving beam is subtle and safe, tiny warm metallic reflection, precision tools visible softly in background. Composition is wide landscape with generous dark negative space on the LEFT for white website headline; main subject on the RIGHT. Sophisticated graphite, silver and white palette, realistic product photography, restrained luxury, no logos, no readable letters, no watermark, no UI, no people faces, no text.

### Baterija

Create a premium editorial website hero photograph for a Serbian watch shop service: a professional watchmaker replacing a small silver button-cell battery in an elegant quartz wristwatch, using precision tweezers on a dark graphite workbench. No face visible. Composition wide landscape with clean dark negative space on the LEFT for a white website headline, detailed workshop action on the RIGHT. Sophisticated graphite, steel, soft silver palette, realistic product photography, restrained modern luxury. No logos, readable text, watermark, UI, or extra hands.

### Zamena narukvice

Use case: photorealistic editorial product photography for a premium watch-shop service website. Wide landscape composition about replacing a watch strap. A refined silver wristwatch lies on a graphite watchmaker workbench on the right, its old black leather strap detached and a beautiful new dark brown leather strap with stitching beside it, with a precision spring-bar tool neatly placed. One small spring bar visible, no hands needed. Realistic brushed steel, leather grain, subtle wear, soft directional studio light. The left 45 percent is clean dark charcoal negative space reserved for white website text. Restrained silver/graphite palette with leather as the only warm detail. No text, logos, watermarks, UI, frame, collage or fake lettering.

### Skraćivanje narukvice

Use case: photorealistic editorial product photography for a premium watch-shop service website. Wide landscape photograph about resizing a stainless-steel watch bracelet. Right side of image shows a silver watch bracelet secured in a real small bracelet-link pin-removal tool on a graphite jeweler workbench; a pin being aligned with the tool and two removed bracelet links arranged nearby. Technically plausible simple tool mechanism, clean composition, no hands. Macro brushed and polished steel, tangible machining details, soft studio light, tasteful restrained luxury. Left 45 percent is clean dark graphite negative space for a white website headline. No text, numbers, brands, logos, watermarks, UI or collage.

### Daljinski

Use case: photorealistic editorial product photography for a modern Serbian shop offering gate and garage remote programming. Wide landscape composition: two unbranded compact black and brushed-silver gate remote key fobs with four distinct rubber buttons, one old remote and one clean replacement, arranged on the RIGHT on a graphite electronics workbench; subtle softly blurred electronic receiver enclosure behind them. Keep electronics plausible, remote controls clearly recognizable, no car keys, no watches. Premium studio light, realistic plastic and metal microtexture, silver/black palette. Left 45 percent is uncluttered dark graphite negative space for white website text. No letters, text, logos, watermark, UI, collage or frame.
