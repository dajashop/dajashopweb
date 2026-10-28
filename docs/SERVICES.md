# Usluge

Pregled je na `/usluge`. Pet zasebnih stranica:

- `/usluge/lasersko-graviranje`
- `/usluge/zamena-baterije-sata`
- `/usluge/zamena-narukvice-sata`
- `/usluge/skracivanje-narukvice-sata`
- `/usluge/programiranje-daljinskih-upravljaca`

## Izvori i održavanje

`src/data/serviceCatalog.js` sadrži sadržaj, slugove, opise, ključne reči, pitanja, povezane linkove i opise vizuala. `Usluge.jsx` prikazuje pregled, a `ServiceDetail.jsx` pojedinačnu uslugu. Novi stilovi su ograničeni na `.services-*` u `Usluge.css`; zajedničke komponente su u `src/components/services/`.

Stranice imaju sopstveni okvir `width: min(1600px, 92vw)`, kao `.container` u headeru. U `App.jsx` njihove putanje koriste široki glavni okvir kako ne bi postojala dva ugnježdena suženja. Duži pasusi imaju ograničenu dužinu reda, dok stranica, fotografije i sekcije koriste punu širinu tog okvira.

Adresa, telefon i email dolaze iz postojeće `seoConfig.business` konfiguracije. Ne dodavati neproverene cene, rokove, ocene ili obećanja o kompatibilnosti. `/graviranje` ostaje postojeći editor, povezan sa informativne stranice laserskog graviranja.

## SEO i učitavanje

Sve stranice imaju jedinstven naslov, metaopis, canonical URL i Open Graph/Twitter podatke. JSON-LD opisuje pregled, uslugu i navigacionu putanju; usluge referenciraju globalni Store kroz `/#organization`. FAQ je vidljiv sadržaj sa nativnim `details` elementima.

SSR allowlist u `src/ssr/loadPage.js` uzima putanje iz kataloga usluga. Sadržaj usluga ne zahteva API poziv pri serverskom renderovanju. Nepoznate putanje nisu u javnoj allowlisti i vraćaju postojeću 404 stranicu.

Sitemap se generiše u drugom projektu: `daja-platform/apps/api/src/plan2.controllers.ts`. Kada se menja slug ili dodaje usluga, ažurirati i taj spisak. Sitemap ima postojeći keš od jednog sata.

Pet zasebnih ilustrativnih vizuala napravljeno je ugrađenim imagegen alatom: graviranje, zamena baterije, zamena narukvice, skraćivanje i daljinski. Nisu dokumentarne fotografije radnje. Datoteke su u `public/images/services/`: `{kind}-{640,960,1600}.webp` za stranicu i `{kind}-share.jpg` za deljenje linka. Promptovi i pravac dizajna su u [SERVICE-VISUALS.md](SERVICE-VISUALS.md).

`ServiceVisual.jsx` koristi `srcSet` i `sizes`; samo glavni vizual ima eager/high prioritet, a kartice i srodne usluge su lazy. Prelom za telefone odvaja sliku od teksta. Slike za deljenje su stvarno 1200 × 630, u skladu sa metapodacima. Za pripremu zamenskog izvora koristiti `node scripts/prepare-service-assets.mjs <kind> <source.png>`; postojeći sharp pravi iste četiri datoteke bez instalacije novih paketa. `kind` je `engraving`, `battery`, `strap`, `sizing` ili `remote`.

Vizuelne animacije su CSS: blag jednokratan ulazak uvoda, zum fotografija na hover/fokus, reakcije dugmadi i strelica i otvaranje FAQ odgovora. Sadržaj nije inicijalno sakriven, a nema slušanja skrola, zaključavanja stranice, parallax efekta ili dodatne biblioteke. `prefers-reduced-motion` isključuje animacije i pomeranja; boja i vidljiv fokus ostaju kao povratna informacija.

Linkovi „Pogledajte detalje” i „Izaberite uslugu” koriste `scrollToServiceSection` iz `src/utils/serviceSectionNavigation.js`: na klik pokreću nativni `window.scrollTo` sa `behavior: smooth`, uz stvarno izmerenu visinu sticky headera i dodatna 24 px razmaka. Kod smanjenih animacija skok je trenutan. Nema petlje za animaciju, presretanja točkića ili zaključavanja skrola. `href` ostaje stvaran link ka sekciji, a modifikovani klik zadržava standardno ponašanje.

FAQ zadržava nativni `details/summary`. Glatko širenje i zatvaranje koristi `::details-content`, `interpolate-size` i diskretnu tranziciju `content-visibility` samo kada pregledač podržava sve te mogućnosti. Ostali pregledači zadržavaju standardno otvaranje sa kratkim prelazom vidljivog odgovora. Izvori za ovaj dodatak: [Chrome — styling details](https://developer.chrome.com/blog/styling-details) i [animiranje intrinsic dimenzija](https://developer.chrome.com/docs/css-ui/animate-to-height-auto).

Implementacija je pregledana kroz izvorni kod. Testovi, build i provera deploya nisu pokretani, po zahtevu korisnika. Nisu merene Core Web Vitals vrednosti ili SEO rezultat.
