# Jezici i valute prodavnice

U redu sa ikonama zaglavlja postoji samo zastavica izabranog jezika i mala strelica desno, bez vidljivog okvira, podrazumevano Srbija. Otvara zajednički meni za jezik i valutu. Izbori ostaju nezavisni; valuta se pamti kroz postojeći sloj neophodne memorije nakon inicijalizacije saglasnosti.

Ponuda valuta je RSD, EUR, USD, BAM (KM), MKD i CHF. Meniji jezika/valuta i desktop hamburgera dele `HeaderDropdown.jsx` i `HeaderDropdown.css`: širinu do 272 px, poravnanje uz desnu ivicu dugmeta, razmak od 8 px, tipografiju, stavke, senku i animaciju. Paneli su u portalu i prilagođavaju položaj/visinu ekranu. Mobilni hamburger zadržava postojeći prikaz preko celog ekrana.

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

`useStorefront().money(amountRsd)` formatira iznos za izabrani jezik i valutu. `moneyRsd(amountRsd)` uvek prikazuje stvarni iznos za naplatu. RSD nema decimale u prikazu; ostale valute imaju dve. Sve računanje popusta, dostave, cena, budžeta i filter parametara ostaje u RSD. Košarica i podaci poslati API-ju ne sadrže preračunate iznose drugih valuta.

Kurs stiže sa `GET /api/v1/public/catalog/exchange-rates` iz projekta `daja-platform`. Izvor je zvanična važeća srednja kursna lista NBS (`https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate`), a ne prosek kupovnog i prodajnog kursa. Odgovor uključuje `asOf`, `fetchedAt` i `sourceUrl`. Serverski keš važi do 15 minuta i obavezno se ponovo proverava pri prvom zahtevu svakog novog dana po vremenu u Beogradu. Vikendom i praznicima aktuelna NBS lista ostaje poslednja važeća lista. Osvežavanje je vezano za zahteve sajta i ne zahteva poseban cron.

API vraća standardni omotač `{ data, meta, requestId }`. Pregledač prvo izdvaja `data` pa čita `rates` i `asOf`; podržan je i odgovor bez omotača. Za osnovu RSD, `rates[code]` je broj jedinica izabrane valute za 1 RSD, pa prikaz koristi `amountRsd * rates[code]`. NBS jedinice iz tabele uzimaju se u obzir; nema ručno unetih kurseva. Polje `eurRsdRate` ostaje zbog kompatibilnosti sa postojećim dobavljačkim prikazom. Stari odgovor koji sadrži samo EUR ostaje podržan, a ostale valute su onemogućene dok njihov kurs ne bude dostupan.

Pregledač osvežava kurs na 15 minuta i pri povratku na tab. U meniju prikazuje odnos izabrane valute prema RSD i datum liste (za RSD izbor prikazuje EUR/RSD). Ako kurs nije dostupan, prikazuju se RSD cene, nedostupne strane valute su onemogućene u meniju i ponuđen je ponovni pokušaj. Ne koristi se izmišljeni rezervni kurs. Checkout za sve strane valute jasno prikazuje informativni karakter cena i konačan RSD iznos za plaćanje.

## Dalje proširenje

Jezici i valute za početak su deklarisani u `src/localization/StorefrontContext.jsx`. Dodavanje novih kroz administraciju i automatsko prevođenje sadržaja iz baze nisu deo ove prve verzije. Za dodatni jezik dodati katalog, registraciju i lokalnu zastavicu; za dodatnu valutu proširiti izvor kurseva i formatter. Pri promeni prodajne/naplatne valute potrebno je posebno prilagoditi backend obračune i način naplate.
