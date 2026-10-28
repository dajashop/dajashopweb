# Jezici i valute prodavnice

Na vrhu sajta postoje nezavisni meniji sa lokalnim SVG zastavicama za srpski/engleski i RSD/EUR. `StorefrontProvider` pamti eksplicitan izbor posetioca kroz postojeći sloj neophodne memorije nakon inicijalizacije saglasnosti. Prvi SSR i prvi klijentski render koriste srpski/RSD radi usklađene hidratacije; izbor se zatim obnavlja bez ponovnog učitavanja stranice. Ovo je promena jezika interfejsa, bez zasebnih indeksiranih engleskih URL putanja.

## Novi tekstovi

Prilikom svake izmene javnog interfejsa odmah dodati i engleski prevod. Srpski tekst je ključ u `src/localization/en.json`; vrednost je engleski prevod. Nema servisa za automatsko prevođenje u pregledaču: prevod se priprema zajedno sa izmenom koda.

```jsx
import { useStorefront } from '../localization/StorefrontContext.jsx';

function Example({ price }) {
  const { t, money } = useStorefront();
  return <button>{t('Dodaj u korpu')} · {money(price)}</button>;
}
```

Za promenljive koristiti imenovane parametre, npr. `t('Prikaži {count} proizvoda', { count })`, i isti ključ sa parametrima u engleskom katalogu. Postojeći tekstovi podržavaju i numerisane obrasce poput `{0} je u korpi.`. Ne prevoditi interne ID-jeve, URL parametre, nazive brendova/modela, recenzije, imena kupaca ili korisnički tekst gravure. Podaci za filtriranje ostaju u originalnom obliku; prevode se samo oznake u interfejsu.

Opisi artikala su zaseban sadržaj iz baze. Ako postoji `product.attributes._translations.en.description`, kartica opisa koristi taj prevod. U suprotnom prikazuje srpski original sa napomenom i atributom `lang="sr"`. Postojeći opisi nisu automatski prevedeni niti prepisani. Pravne dokumente i transakcione emailove ovaj korak takođe ne prevodi.

## Cene

`useStorefront().money(amountRsd)` formatira iznos za izabrani jezik i valutu. `moneyRsd(amountRsd)` uvek prikazuje stvarni iznos za naplatu. RSD nema decimale u prikazu, EUR ima dve. Sve računanje popusta, dostave, cena, budžeta i filter parametara ostaje u RSD. Košarica i podaci poslati API-ju ne sadrže preračunate EUR iznose.

Kurs stiže sa `GET /api/v1/public/catalog/exchange-rates` iz projekta `daja-platform`. Endpoint koristi postojeći NBS izvor i serverski keš; pregledač osvežava kurs na sat vremena. Ako kurs nije dostupan, prikazuju se RSD cene, EUR je onemogućen u meniju i ponuđen je ponovni pokušaj. Ne koristi se izmišljeni rezervni kurs. Checkout u EUR režimu jasno prikazuje informativni karakter EUR cena i konačan RSD iznos za plaćanje.

## Dalje proširenje

Jezici i valute za početak su deklarisani u `src/localization/StorefrontContext.jsx`. Dodavanje novih kroz administraciju i automatsko prevođenje sadržaja iz baze nisu deo ove prve verzije. Za dodatni jezik dodati katalog, registraciju i lokalnu zastavicu; za dodatnu valutu proširiti izvor kurseva i formatter. Pri promeni prodajne/naplatne valute potrebno je posebno prilagoditi backend obračune i način naplate.
