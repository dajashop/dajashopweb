# Google SEO i Merchant Center — završno povezivanje

## Search Console

1. Otvorite Google Search Console i dodajte `https://dajashop.rs` kao Domain ili URL-prefix property.
2. Za URL-prefix verifikaciju unesite dobijeni token u produkcioni `VITE_GOOGLE_SITE_VERIFICATION` i ponovo objavite web aplikaciju.
3. U Search Console otvorite **Sitemaps** i pošaljite:

   `https://dajashop.rs/sitemap.xml`

4. Za nekoliko reprezentativnih proizvoda koristite URL Inspection i zatražite ponovno indeksiranje nakon većih izmena kataloga.

## Google Merchant Center

1. Otvorite Merchant Center nalog za DajaShop i završite podatke o firmi, plaćanju, dostavi i politici povraćaja.
2. Kao primarni feed dodajte:

   `https://dajashop.rs/merchant-feed.xml`

3. Postavite automatsko dnevno preuzimanje feed-a.
4. U Merchant Center-u podesite besplatnu dostavu od 10.000 RSD; feed šalje standardnu cenu dostave od 380 RSD za Srbiju.
5. Proverite Diagnostics nakon prvog preuzimanja i ispravite artikle bez validnog GTIN-a, slike ili cene.

## Provera pre objave

- Proverite nekoliko URL-ova proizvoda u Google Rich Results Test-u.
- Potvrdite da cena, stanje, slike, rok dostave i povraćaj na stranici odgovaraju podacima koje šalje schema i Merchant feed.
- Nikada ne unosite nepostojeći GTIN, cenu, stanje ili recenziju.
