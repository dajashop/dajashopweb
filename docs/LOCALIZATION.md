# Jezici i valute prodavnice

U redu sa ikonama zaglavlja postoji samo zastavica izabranog jezika i mala strelica desno, bez vidljivog okvira, podrazumevano Srbija. Otvara zajednički meni za jezik i valutu. Izbori ostaju nezavisni; valuta se pamti kroz postojeći sloj neophodne memorije nakon inicijalizacije saglasnosti.

Srpski koristi putanje bez prefiksa, a engleski `/en`, npr. `/en`, `/en/catalog` i `/en/product/model`. URL određuje jezik u SSR-u i prvom klijentskom renderu. Zapamćeni jezik nikada ne nadjačava adresu. Promena jezika vodi na odgovarajuću adresu iste stranice uz očuvanje query/hash dela. React Router basename čuva prefiks za navigaciju, filtere i Link komponente. Za obične `href` veze koristiti `localizePath` iz `useStorefront()`.

Javne engleske stranice server odmah renderuje na engleskom. Svaka javna verzija ima svoj canonical i uzajamne sr/en/x-default hreflang veze. Backend sitemap uključuje obe verzije i odgovarajuće XHTML alternates. Privatne stranice, email linkovi i filtrirane stranice zadržavaju postojeća noindex/cache pravila i pod `/en`.

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

Kurs stiže sa `GET /api/v1/public/catalog/exchange-rates` iz projekta `daja-platform`. Izvor je zvanična važeća srednja kursna lista NBS (`https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate`), a ne prosek kupovnog i prodajnog kursa. Odgovor uključuje `asOf`, `fetchedAt` i `sourceUrl`. Serverski keš važi do 15 minuta i obavezno se ponovo proverava pri prvom zahtevu svakog novog dana po vremenu u Beogradu. Vikendom i praznicima aktuelna NBS lista ostaje poslednja važeća lista. Osvežavanje je vezano za zahteve sajta i ne zahteva poseban cron.

API vraća standardni omotač `{ data, meta, requestId }`. Pregledač prvo izdvaja `data` pa čita `eurRsdRate` i `asOf`; podržan je i odgovor bez omotača.

Pregledač osvežava kurs na 15 minuta i pri povratku na tab. U meniju prikazuje odnos EUR/RSD i datum liste. Ako kurs nije dostupan, prikazuju se RSD cene, EUR je onemogućen u meniju i ponuđen je ponovni pokušaj. Ne koristi se izmišljeni rezervni kurs. Checkout u EUR režimu jasno prikazuje informativni karakter EUR cena i konačan RSD iznos za plaćanje.

## Dalje proširenje

Jezici i valute za početak su deklarisani u `src/localization/StorefrontContext.jsx`. Dodavanje novih kroz administraciju i automatsko prevođenje sadržaja iz baze nisu deo ove prve verzije. Za dodatni jezik dodati katalog, registraciju i lokalnu zastavicu; za dodatnu valutu proširiti izvor kurseva i formatter. Pri promeni prodajne/naplatne valute potrebno je posebno prilagoditi backend obračune i način naplate.
