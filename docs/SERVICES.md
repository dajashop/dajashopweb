# Usluge

Pregled je na `/usluge`. Pet zasebnih stranica:

- `/usluge/lasersko-graviranje`
- `/usluge/zamena-baterije-sata`
- `/usluge/zamena-narukvice-sata`
- `/usluge/skracivanje-narukvice-sata`
- `/usluge/programiranje-daljinskih-upravljaca`

## Izvori i održavanje

`src/data/serviceCatalog.js` sadrži sadržaj, slugove, opise, ključne reči, pitanja i povezane linkove. `Usluge.jsx` prikazuje pregled, a `ServiceDetail.jsx` pojedinačnu uslugu. Stilovi su ograničeni na `.svc-*` u `Usluge.css`; zajedničke komponente i dekorativne SVG ilustracije su u `src/components/services/`.

Adresa, telefon i email dolaze iz postojeće `seoConfig.business` konfiguracije. Ne dodavati neproverene cene, rokove, ocene ili obećanja o kompatibilnosti. `/graviranje` ostaje postojeći editor, povezan sa informativne stranice laserskog graviranja.

## SEO i učitavanje

Sve stranice imaju jedinstven naslov, metaopis, canonical URL i Open Graph/Twitter podatke. JSON-LD opisuje pregled, uslugu i navigacionu putanju; usluge referenciraju globalni Store kroz `/#organization`. FAQ je vidljiv sadržaj sa nativnim `details` elementima.

SSR allowlist u `src/ssr/loadPage.js` uzima putanje iz kataloga usluga. Sadržaj usluga ne zahteva API poziv pri serverskom renderovanju. Nepoznate putanje nisu u javnoj allowlisti i vraćaju postojeću 404 stranicu.

Sitemap se generiše u drugom projektu: `daja-platform/apps/api/src/plan2.controllers.ts`. Kada se menja slug ili dodaje usluga, ažurirati i taj spisak. Sitemap ima postojeći keš od jednog sata.

Slike za deljenje linkova su JPEG datoteke dimenzija 1200 × 630 u `public/images/services/`. Nakon promene naslova regenerisati ih komandom `npm run assets:services` i sačuvati datoteke u Git. Koristi se već postojeći `sharp`, bez novih zavisnosti. Slike se ne učitavaju u sadržaju stranice; ilustracije na stranici su inline SVG sa definisanim odnosom stranica.

Nema slušanja skrola, zaključavanja stranice ni animacija ulaska. Hover prelazi poštuju `prefers-reduced-motion`. FAQ i sekcijski linkovi koriste ponašanje pregledača.

Implementacija je pregledana kroz izvorni kod. Testovi, build i provera deploya nisu pokretani, po zahtevu korisnika. Nisu merene Core Web Vitals vrednosti ili SEO rezultat.
