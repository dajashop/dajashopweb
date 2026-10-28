# Uputstva za rad

- Ne pokretati testove; štedeti tokene.
- Kada se završe tražene izmene, uraditi commit i push. Navesti naziv commita i projekat.
- Novu verziju Android aplikacije instalirati ako je uređaj povezan; ako nije, preskočiti.
- Ne proveravati da li je deploy završen.

## Mapa projekata i infrastrukture

Ovaj repozitorijum sadrži prodavnicu, web admin i Pages SSR. Zajednički backend je u projektu `daja-platform`, a desktop/Android klijenti su u `RFIDDaja`.

Pre rada na povezivanju sajta sa backendom, prijavi, porudžbinama, medijima, mejlovima, Renderu ili Cloudflare-u pročitaj [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md). Tu su mapa sva tri projekta, nazivi i ID-jevi resursa, API adrese, veze i putanje do odgovarajućeg koda. Dokument je u repozitorijumu i dostupan je bez Codex memorije ili pristupa drugim lokalnim projektima.

Mapa je snimak od 28.10.2026, a ne dokaz trenutnog stanja. Glavni Pages projekat je dajashopweb; zasebni dajashop je vezan za staging granu. wrangler.toml opisuje image Worker, ne Pages ili email fallback. Kada zadatak zavisi od aktivne konfiguracije, pročitaj odgovarajući izvor ili resurs preko dostupnog konektora. Ne čuvaj tajne u dokumentaciji.
