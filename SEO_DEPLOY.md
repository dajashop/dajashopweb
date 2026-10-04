# Serverski prikaz javnog sajta

`npm run build` pravi browser aplikaciju i samostalan Cloudflare Pages Worker
`dist/_worker.js`. Build komanda ostaje `npm run build`, output direktorijum `dist`.
Postojeći `wrangler.toml` pripada posebnom R2 image Workeru.

## Konfiguracija

U Pages projektu koristiti iste vrednosti za build i runtime:

- `SITE_URL` i `VITE_SITE_URL`: `https://dajashop.rs`
- `DAJA_API_BASE_URL` i `VITE_DAJA_API_BASE_URL`: `https://daja-platform-api.onrender.com/api/v1`

Podrazumevane vrednosti odgovaraju postojećoj produkciji. `SITE_URL` i
`DAJA_API_BASE_URL` su runtime varijable; `VITE_*` ulaze u browser build.
Worker se bundluje zajedno sa npm zavisnostima za webworker runtime.
Statički resursi koriste Pages ASSETS binding.

## Ponašanje

- Početna, katalozi, proizvodi, informacije, FAQ, kontakt, usluge i javni izbor
  za graviranje imaju React HTML pre pokretanja JavaScripta.
- Browser preuzima isti anonimni početni skup podataka i hidrira postojeći HTML.
  Korpa, prijava, administracija i 3D prikaz aktiviraju se u browseru.
- Proizvodi imaju naziv, fotografiju, cenu, opis, specifikacije i strukturirane
  podatke u HTML-u. Specifikacije unutar taba ostaju u HTML-u kada je tab zatvoren.
- Katalog ima linkove `?page=N` i poseban canonical za svaku stranu. Filtrirani
  URL-ovi imaju `noindex,follow`.
- Brend ima javnu adresu `/brend/orient`. Filteri koriste čitljive parametre,
  npr. `?mehanizam=automatski&staklo=safirno&cena-od=10000`. Stari linkovi sa
  internim ID-jevima preusmeravaju se na novi format. Sami brendovi mogu da se
  indeksiraju, dok dodatni filteri zadržavaju `noindex,follow`.
- U admin podešavanjima filtera i opcija moguće je upisati „Naziv u adresi“.
  Prazno polje bira automatski naziv. Za ručno čuvanje URL naziva backend mora
  imati podršku za opcioni `urlSlug` u konfiguraciji filtera (bez DB migracije).
- Worker kešira samo anonimne odgovore kataloga do 60 sekundi. Rok akcije
  dodatno skraćuje keš. Privatni podaci, tokeni i nacrti se ne serijalizuju.
- Nedostajući proizvod vraća 404, promenjen slug 301, a nedostupan backend 503
  sa `Retry-After`. API greška ne objavljuje prazan katalog sa statusom 200.
- Sitemap, merchant feed i OAuth callback koriste postojeći backend.
- `npm run dev` koristi isti renderer preko Vite middleware-a. `vite preview`
  prikazuje statički browser build. Za lokalni Pages runtime koristiti
  `npx wrangler pages dev dist` posle builda.

## Naknadna provera

Posle objave pregledati početni HTML javnih URL-ova, hidrataciju u browseru,
404/301/503 odgovore i katalog `?page=2`. Ovo je uputstvo za buduću proveru;
izmena koda sama po sebi ne potvrđuje stanje objavljenog sajta.
