# Bezbednost web projekta — 30.10.2026.

Ovaj korak obuhvata dajashopweb, Pages SSR i CDN Worker. Ne potvrđuje bezbednost zajedničkog backenda, baze ili RFID aplikacije. Backend nalaze treba rešiti u daja-platform koraku, bez predstavljanja frontend provera kao serverske autorizacije.

## Uvedene zaštite

- `.gitignore` obuhvata sve `.env.*` fajlove osim `.env.example`, lokalne Worker tajne, privatne ključeve i Wrangler stanje.
- Pre produkcijskog builda `scripts/public-security.mjs` dozvoljava samo pregledane javne `VITE_*` nazive; proverava javne servisne URL-ove i odbija osetljive fajlove, symlinkove i prepoznatljive privatne kredencijale u `public/`. Ne ispisuje vrednosti promenljivih. Ovo je dodatna zaštita, nije univerzalni detektor tajni.
- Pages odbija dotfile, izvorne, backup i slične putanje pre SPA fallbacka. Nepostojeći asset ne dobija HTML sa statusom 200. Statički izuzeci u `_routes.json` prolaze build pregled `public/` sadržaja.
- SSR HTML ima nasumičan CSP nonce od 192 bita na skriptama, `strict-dynamic` i zabranu inline JavaScripta. HTML je `no-store` da nonce ne bude deljen kroz cache; cache javnih API snimaka i statičkih asseta ostaje. Ne objavljivati HTML mimo Pages Workera kao zamenu za ovaj SSR režim.
- `unsafe-eval` ostaje dokumentovan izuzetak zbog Google Maps/Places integracije za adresu i ocenu prodavnice. `style-src 'unsafe-inline'` ostaje zbog React stilova i biblioteka. Za uklanjanje tih izuzetaka potrebna je posebna migracija integracija; CSP nije zamena za sanitizaciju.
- HSTS `max-age=2592000`, nosniff, zabrana iframe ugradnje, ograničene dozvole browsera i postojeća privatnost email linkova.
- CDN prihvata samo GET/HEAD/OPTIONS; nema upisa, brisanja ni prefix brisanja zajedničkim tokenom. Upload ostaje preko serverski autorizovanih potpisanih R2 URL-ova. Nepoznati tipovi se preuzimaju kao attachment, a dokumenti dobijaju sandbox CSP.
- SSR/CDN logovi ne sadrže URL, query parametre, ključeve ili sirove izuzetke. CDN observability je uključen sa uklonjenim query stringom i isključenim automatskim invocation logovima.
- API klijent prikazuje opštu SR/EN poruku za serverske greške, mrežne greške i ne-JSON proxy odgovore; sirov odgovor nije priložen UI izuzetku.
- Vite dev/preview sluša localhost; produkcija ne generiše source maps.
- Uklonjene su nekorišćene direktne zavisnosti `@aws-sdk/client-s3` i `@react-google-maps/api`; ažuriran je lockfile i sharp. Dependabot predlaže nedeljna npm ažuriranja, bez automatskog mergea.

Cloudflare zona: TLS minimum 1.2, Full (strict), HSTS 30 dana bez preload i includeSubDomains. Legacy `R2_AUTH_TOKEN` uklonjen je iz CDN Workera. Ove cloud izmene nisu izvršive samo Git revertom.

## Otvorene stavke za sledeći projekat

1. Kupčev access/refresh i staff token i dalje su dostupni JavaScriptu u localStorage. Koordinisati backend i web prelazak na HttpOnly/Secure sesije, CSRF zaštitu i očuvanje realtime veze, obnove i odjave.
2. Obavezan administratorski MFA mora da se sprovodi na backendu, ne samo u web interfejsu.
3. Backend korak je dodao auth limite, HTTP/WS CORS ograničenja, upload provere, zabranu trusted-header identiteta i redakciju logova. Potpun pregled svih poslovnih autorizacija i produkcijski deploy nisu potvrđeni; detalji su u daja-platform/docs/SECURITY.md.
4. Render baza sada ima blokiran javni pristup, a produkcijski backup je uspešno vraćen i proveren u izolaciji. Produkcijski DB aplikacioni korisnik još nije odvojen od vlasnika/migratora.
5. Ograničenja javnog Google Maps browser ključa proveriti u Google Cloud Console. Javne browser ključeve nije moguće sakriti u frontend buildu; privatne ključeve nikada ne stavljati u `VITE_*`.
6. Nastaviti reviziju istorije/rotaciju ako bude dokaza o izloženom privatnom ključu. Odsustvo nalaza u pregledanim lokalnim Git referencama ne dokazuje odsustvo u svim fork-ovima, logovima ili backupima.

## Provera

`npm run build` zatim `npm run test:security`: 10 test grupa za OAuth browser-state, redakciju API grešaka, putanje i kodirane pokušaje zaobilaženja, odbijanje javnih env naziva, sanitizaciju opisa, CDN metode/CORS/tipove, spakovani Pages Worker, nonce/cache/email privatnost i odbijanje upisa. Runtime je lokalni Cloudflare Workerd kroz Miniflare; R2 i statički binding su kontrolisane zamene, ne produkcijski storage.

`npm audit`: 0 poznatih ranjivosti na kraju ovog koraka. Ciljani ESLint nad izmenjenim JS kodom i `git diff --check` prolaze. Ovo ne predstavlja dokaz odsustva svih ranjivosti, test kupovine/prijave ili potvrdu produkcijskog deploya. Deploy završetak se po korisnikovom uputstvu ne proverava.

Reference: [Cloudflare Workers smernice](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Google Maps CSP zahtevi](https://developers.google.com/maps/documentation/javascript/content-security-policy).

## Dopuna: OAuth browser-state

Google OAuth povratak mora da odgovara kriptografski nasumičnom jednokratnom stanju započetom u istom tabu, uz rok od 10 minuta. Stanje je potpisano na backendu; podmetnuti, ponovljeni ili stari fragment ne zamenjuje sesiju. Stari/in-flight Google login posle promene treba ponoviti; desktop/mobile Google tok koristi zaseban postojeći ugovor. Logout callback u auth kontekstu ima usklađene React zavisnosti.
