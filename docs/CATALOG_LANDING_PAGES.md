# Stalne stranice kataloga

Definicije: `src/data/catalogLandings.js`. Iste definicije selekcija nalaze se u
`daja-platform/apps/api/src/catalog-landings.ts`; menjati ih zajedno.

Devetnaest dodatnih ruta koristi postojeći Catalog, SSR, paginaciju, cene i filtere.
Nema kopija pojedinačnih proizvoda ni posebnih stranica za obrnuti red reči.
Postojeće stranice brendova i muških/ženskih satova ostaju njihove glavne adrese.

Backend primenjuje izbor stalne stranice pre dodatnih filtera i paginacije.
Identitet izbora ulazi u ključeve keša i ostaje pri sortiranju i promeni stranice.
Oznaka izbora može da se ukloni; tada se posetilac vraća u običan katalog.

Javni odgovor vraća `landingPages` samo za izbore sa vidljivim proizvodima.
Oni su povezani na stranici `/kolekcije-satova`, dostupnoj kroz meni „Satovi“ i podnožje. Sitemap v6 dodaje srpske i engleske
adrese sa hreflang vezama. Prazne stalne stranice imaju noindex i ne oglašavaju se
u sitemap-u ili među pregledima kolekcija. Casio rute su pripremljene za buduću ponudu.
Interna pretraga ostaje noindex, sa naslovom „Pretraga za: {query}“.
Proizvoljni dodatni filteri i sortiranje ostaju noindex; paginacija ima svoj canonical.

## Serije

Backend dodaje izvedeni filter „Serije satova“. Sačuvani filteri i proizvodi se ne
prepisuju. Koriste se izričita serija/kolekcija/naziv i konzervativna pravila oznaka
modela. Opis koji samo pominje drugu seriju nije dokaz pripadnosti.
Ista izvedena serija učestvuje u internoj pretrazi. Za nove modele van poznatih
pravila osoblje može uneti potvrđenu vrednost specifikacije `serija` / `series`.

Pravila i izvori nalaze se u backend dokumentu `docs/CATALOG_LANDING_PAGES.md`.
Ovo nije tvrdnja da su sve buduće ili postojeće oznake modela razvrstane: nepoznati
modeli ne dobijaju seriju nagađanjem.

Validacija tokom implementacije: TypeScript kompilacija API-ja i web client/SSR build;
bez testova i bez čekanja ili provere završetka deploya.

## Magazin i pregled u meniju

`CollectionsMenu` koristi zajednički HeaderDropdown sa podesivom širinom.
Otvara se klikom, zatvara klikom van njega, Escape tasterom ili navigacijom.
Na telefonu izbori kolekcija skroluju se vodoravno, a ispod je pregled tri modela.

`/kolekcije-satova` je SSR stranica sa originalnim srpskim/engleskim tekstovima
iz `src/data/watchStories.js`, izvorima istorije i pregledima kolekcija.
Javni endpoint `/public/catalog/collections` grupiše najviše tri modela po izboru,
uz jednu grupnu pretragu fotografija. Browser deli zahtev između menija i stranice.
Pregledi koriste samo javne proizvode i kratko keširanje ograničeno istekom akcija.
Spisak linkova ispod kataloga je uklonjen.
