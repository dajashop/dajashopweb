# Pravne stranice i izbor privatnosti

Verzija sadržaja je `2026-11-23-privacy-storage-v1`, pregled završavan 24.11.2026.

Kupcima su namenjeni `/privacy`, `/cookies`, `/terms` i `/withdrawal`, kao i isti
putevi sa `/en` prefiksom. `/whatsapp-privacy` sadrži posebno dvojezično obaveštenje.
Poslovni podaci su potvrđeni sa vlasnikom: MB 60556903, PIB 104852069,
Obrenovićeva bb, Podzemni prolaz, lokal C31, 18105 Niš; `info@dajashop.rs`.

`src/data/legalDocuments.js` i `daja-platform/apps/api/src/legal-policy-content.ts`
moraju imati isti sadržaj i verziju. Engleski prevod je u `src/localization/en.json`.
Verzija pristanka u `src/services/consentStorage.js` preuzima se iz verzije web dokumenta.
Ne ažurirati samo admin oznaku verzije. Tekst koji je važio za novu porudžbinu
backend čuva u samoj porudžbini i šalje uz potvrdu zahteva.

Lokalno pamćenje, Google usluge i analitika biraju se odvojeno. Odbijanje je odmah
dostupno. Opcioni IndexedDB katalog traje najviše 5 minuta; kopije recenzija se ne
upisuju u njega. HTTP/server/CDN keš javnih resursa i memorijski keš ostaju odvojeni.
Već učitana analitika može zahtevati osvežavanje dokumenta pri opozivu ili prelasku
na privatnu stranicu. SMS koristi zasebnu potvrdu pre pokretanja Firebase/reCAPTCHA.

Detaljan spisak implementiranog, pregleda Render/Cloudflare konfiguracije, izvora
propisa i otvorenih poslovnih obaveza nalazi se u projektu **daja-platform**, u
`docs/LEGAL_COMPLIANCE.md`. Posebno nisu zatvoreni pregled ugovora o međunarodnom
prenosu i svi poslovni/arhivski rokovi. Vlasnik nema potpunu istoriju prethodnih
30 dana, pa je uklonjena nepotvrđena precrtana cena sa kartica i detalja. Važeća
prodajna cena i obračun kupona ostaju. Ponovno prikazivanje istorijskih poređenja
zahteva evidenciju i dokaz relevantne najniže cene; ne izmišljati prošle podatke.
Dokumenti nisu potvrda potpune pravne usklađenosti.

Po uputstvu vlasnika nisu pokretani testovi ni build i nije proveravan deploy.
