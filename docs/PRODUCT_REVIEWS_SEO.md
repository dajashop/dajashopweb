# Recenzije proizvoda i Google

Javni backend vraća samo objavljene, neobrisane recenzije konkretnog proizvoda: najnovijih 20 u `reviews` i prosek/broj svih objavljenih ocena u `reviewSummary`.

`ProductJsonLd` automatski uključuje `review` (autor, komentar, ocena 1–5, datum) i `aggregateRating` samo kada postoje validni podaci. Bez recenzija ova opciona polja se izostavljaju. Ocene prodavnice i drugih varijanti se ne preuzimaju.

Tab Recenzije je deo početnog serverskog HTML-a, sakriven dok kupac ne izabere tab. Prikaz i SEO koriste isti javni proizvod i njegov zbir ocena. Ako ima više od 20 recenzija, pregledač dodatno učitava celu objavljenu listu.

Dodavanje, promena statusa i uklanjanje recenzije u `daja-platform` pozivaju `CatalogDeliveryService.refreshProductReviews`: ažuriraju vreme izmene proizvoda, uklanjaju Redis keš njegovog javnog detalja i aktuelnog sitemapa i šalju `product.updated`. Otvoreni klijenti osvežavaju proizvod. Ako keš nije dostupan, upis recenzije ostaje uspešan, upozorenje se beleži i važi postojeće isticanje keša. Cloudflare SSR snapshot proizvoda ima sopstveni keš do 60 sekundi; njegovo osvežavanje nije trenutno globalno poništavanje keša.

Google preuzima promene svojim sledećim obilaskom. Prisustvo pravilnih podataka ne garantuje prikaz zvezdica. Ovaj tok ne menja postojeća pravila objave/moderacije recenzija.
