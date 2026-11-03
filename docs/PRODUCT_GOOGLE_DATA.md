# Podaci proizvoda za Google — 3.11.2026.

- Javni identifikator grupe je stabilan SHA-256 prefiks od 40 heksadecimalnih znakova. `inProductGroupWithID` i `ProductGroup.productGroupID` koriste istu vrednost. Frontend skraćuje i raniji odgovor od 64 znaka iz postojećeg keša, istim pravilom kao backend. Interni identiteti grupa se ne menjaju.
- Grupa ima lokalizovan opis koji upućuje na pojedinačne modele. Ne prepisuje se opis boje ili specifikacija jednog modela na celu grupu.
- Vlasnik je potvrdio da kod odustanka kupac organizuje povrat i plaća direktno kuriru. Zato je `returnFees` = `ReturnFeesCustomerResponsibility`; nema izmišljene `returnShippingFeesAmount`. Isto pravilo piše u tabu Isporuka, na oba jezika. Ovo nije pravilo o trošku opravdane reklamacije.
- Dokument `/privacy/documents/terms` je pri pregledu i dalje vraćao `ready: false`, odnosno tehnički nacrt. Ova promena ne predstavlja dovršavanje pravnih dokumenata.

Read-only pregled javnog kataloga i feeda: 1.760 kataloških stavki, 1.764 feed stavke. Za svih 1.760 upoređenih `variantId` nisu nađena odstupanja u efektivnoj ceni (uključujući akciju), valuti, dostupnosti, URL-u i prvoj fotografiji. Dodatne feed varijante nisu poređene sa karticom drugog modela. Ovo nije pregled svakog serverskog HTML-a, vizuelna provera tačnosti fotografija niti potvrda Googleovog keširanog prikaza.

438 feed opisa kraćih od 120 znakova izdvojeno je za urednički pregled. Prag nije Googleovo obavezno pravilo. Nije bilo nedostajućih prvih fotografija/brendova ni ponovljene prve fotografije među različitim kataloškim karticama. Sadržaj i nedostajući GTIN/EAN nisu izmišljani. Testovi i završetak deploy-a nisu proveravani.
