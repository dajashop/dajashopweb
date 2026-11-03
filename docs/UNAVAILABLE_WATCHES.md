# Skriveni satovi i direktni linkovi

Za objavljen sat (`department=satovi`, `published=true`) isključena vidljivost (`active=false`) znači da trenutno nije dostupan za nabavku. Katalog, pretraga, preporuke, izbor javnih varijanti i Merchant feed i dalje izostavljaju skrivene proizvode.

Javni detalj po slugu prikazuje taj sat sa oznakom „Trenutno nije dostupan za nabavku”, poslednjom poznatom cenom i onemogućenim poručivanjem. Isto važi za mobilni i desktop prikaz, nezavisno od zastavice za prikaz lagera. Google strukturirani podaci navode `OutOfStock`; stranica je indeksabilna i ostaje u sitemapu na oba jezika. Stari slug može preusmeriti na važeći slug takvog sata.

Nacrti (`published=false`), obrisani proizvodi i skrivene kategorije proizvoda koje nisu satovi ne dobijaju ovaj javni detalj. Varijante i interna polja zadržavaju postojeća pravila javnog pristupa. Serverski obračun porudžbine i dalje zahteva aktivan i objavljen proizvod i varijantu.

Ponovno uključivanje vidljivosti uklanja oznaku i vraća normalno ponašanje. Posebna promena podataka za već skrivene, objavljene satove nije potrebna. Postojeći keševi i Google indeks osvežavaju se svojim tokom; izmena ne garantuje trenutno pojavljivanje stranice u Google rezultatima.
