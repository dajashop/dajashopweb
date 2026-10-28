# Uputstva za rad

- Ne pokretati testove; štedeti tokene.
- Kada se završe tražene izmene, uraditi commit i push. Navesti naziv commita i projekat.
- Novu verziju Android aplikacije instalirati ako je uređaj povezan; ako nije, preskočiti.
- Ne proveravati da li je deploy završen.

## Jezici i valute prodavnice

- Svaki novi ili izmenjeni tekst namenjen kupcima odmah pripremiti na srpskom i engleskom. Koristiti `useStorefront().t(...)` i dopuniti `src/localization/en.json` u istom commitu. Prevod pripremiti tokom rada na funkciji, bez posebnog korisnikovog zahteva.
- Cene za kupce prikazivati kroz `useStorefront().money(...)`. Osnovne cene, filter parametri i obračuni porudžbina ostaju u RSD; EUR, USD, BAM, MKD i CHF su informativni prikazi po dnevnoj NBS listi sa javnog API-ja. `rates` sadrži jedinice odabrane valute za 1 RSD.
- Ne prevoditi vrednosti koje služe kao identifikatori, API parametri, korisnički unosi, tekst gravure ili recenzije. Za preveden opis artikla koristiti `attributes._translations.en.description`; bez prevoda prikazati original sa oznakom jezika.
- Detalji i primeri: [docs/LOCALIZATION.md](docs/LOCALIZATION.md).
- Srpski je podrazumevan na putanjama bez prefiksa; engleski je pod `/en` (npr. `/en/catalog`). Jezik uvek određuje URL, uključujući SSR; zapamćeno podešavanje ne sme ga promeniti bez navigacije. Interne React Router veze koriste automatski basename, a obične `href` veze `useStorefront().localizePath(...)`. Canonical, hreflang i sitemap moraju ostati usklađeni.
- Padajući meniji hamburgera i jezika/valuta koriste zajedničku komponentu `src/components/ui/HeaderDropdown.jsx` i njene stilove; promene izgleda primenjivati tu.

## Mapa projekata i infrastrukture

Ovaj repozitorijum sadrži prodavnicu, web admin i Pages SSR. Zajednički backend je u projektu `daja-platform`, a desktop/Android klijenti su u `RFIDDaja`.

Pre rada na povezivanju sajta sa backendom, prijavi, porudžbinama, medijima, mejlovima, Renderu ili Cloudflare-u pročitaj [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md). Tu su mapa sva tri projekta, nazivi i ID-jevi resursa, API adrese, veze i putanje do odgovarajućeg koda. Dokument je u repozitorijumu i dostupan je bez Codex memorije ili pristupa drugim lokalnim projektima.

Mapa je snimak od 28.10.2026, a ne dokaz trenutnog stanja. Glavni Pages projekat je dajashopweb; zasebni dajashop je vezan za staging granu. wrangler.toml opisuje image Worker, ne Pages ili email fallback. Kada zadatak zavisi od aktivne konfiguracije, pročitaj odgovarajući izvor ili resurs preko dostupnog konektora. Ne čuvaj tajne u dokumentaciji.
