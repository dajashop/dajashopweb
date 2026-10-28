// Shared by the pages, SSR route allowlist and social-image generator.
export const serviceCatalog = [
  {
    slug: 'lasersko-graviranje', kind: 'engraving',
    title: 'Lasersko graviranje', category: 'Lični pečat',
    tagline: 'Mali detalj. Vaša priča.',
    summary: 'Ime, datum ili kratka poruka koja satu, nakitu ili poklonu daje lični pečat.',
    description: 'Lasersko graviranje satova, nakita i poklona u Nišu. Donesite predmet u DajaShop radi provere materijala i dogovora o tekstu, položaju i izgledu gravure.',
    keywords: 'lasersko graviranje Niš, graviranje sata, graviranje nakita, personalizovani pokloni, DajaShop',
    paragraphs: [
      'Poklon postaje ličan kada nosi poruku namenjenu baš toj osobi. Laserskim graviranjem dodajemo ime, važan datum ili kratku posvetu na odgovarajuću površinu sata, nakita ili drugog predmeta.',
      'Pre izrade pregledamo materijal, oblik i raspoloživu površinu. Zajedno dogovaramo tekst, veličinu i položaj gravure, kako bi poruka bila čitljiva i uklopljena u predmet.'
    ],
    included: ['Provera da li je predmet pogodan za graviranje', 'Dogovor o tekstu i rasporedu gravure', 'Lasersko graviranje dogovorenog motiva'],
    bring: ['Predmet koji želite da gravirate', 'Tačno napisan tekst, sa svim slovima i datumima', 'Primer željenog izgleda, ako ga imate'],
    note: 'Online editor pomaže da osmislite gravuru. Mogućnost izrade i konačan izgled potvrđujemo nakon pregleda predmeta.',
    action: { path: '/graviranje', label: 'Otvori editor gravure' },
    faqs: [
      { question: 'Šta mogu da graviram?', answer: 'Možete doneti sat, nakit ili poklon. Mogućnost graviranja zavisi od materijala, završne obrade, oblika i dostupne površine, pa predmet prvo pregledamo u radnji.' },
      { question: 'Da li mogu unapred da pripremim tekst?', answer: 'Da. Pripremite tačan tekst i proverite slova, datume i interpunkciju. Za ideju rasporeda možete koristiti naš editor gravure, a detalje potvrđujemo pre izrade.' },
      { question: 'Koliko košta graviranje i kada je gotovo?', answer: 'Cena i rok zavise od predmeta i tražene gravure. Dogovaramo ih nakon pregleda, pre početka rada. Za prvu informaciju pozovite nas ili pošaljite upit.' }
    ]
  },
  {
    slug: 'zamena-baterije-sata', kind: 'battery',
    title: 'Zamena baterije sata', category: 'Ponovo u pokretu',
    tagline: 'Vreme je da ponovo otkucava.',
    summary: 'Odgovarajuća baterija, pažljiva zamena i provera rada vašeg sata.',
    description: 'Zamena baterije sata u DajaShop radnji u Nišu. Provera odgovarajućeg tipa baterije, pažljiva ugradnja i provera rada sata nakon zamene.',
    keywords: 'zamena baterije sata Niš, baterija za sat, zamena baterije ručnog sata, DajaShop',
    paragraphs: [
      'Ako je vaš kvarcni sat stao, istrošena baterija može biti razlog. Donesite sat u radnju da proverimo odgovarajući tip baterije i mogućnost zamene za taj model.',
      'Usluga obuhvata pažljivo otvaranje kućišta, zamenu odgovarajućom baterijom i proveru rada nakon ugradnje. Ako sat i dalje ne radi, sama zamena baterije ne rešava uzrok problema.'
    ],
    included: ['Odabir odgovarajućeg tipa baterije', 'Pažljiva zamena u radnji', 'Provera rada sata nakon ugradnje'],
    bring: ['Sat kojem je potrebna nova baterija', 'Informaciju o ponašanju sata pre nego što je stao', 'Oznaku modela, ako je poznata'],
    note: 'Zamenu radimo u radnji, bez slanja sata kurirskom službom. Zamena baterije sama po sebi nije potvrda vodootpornosti sata.',
    action: { path: '/baterije', label: 'Pogledaj ponudu baterija' },
    faqs: [
      { question: 'Da li mogu da pošaljem sat kurirom?', answer: 'Ovu uslugu pružamo isključivo u radnji u Nišu. Donesite sat lično kako bismo pregledali model i dogovorili zamenu.' },
      { question: 'Da li svaki sat koji je stao treba novu bateriju?', answer: 'Ne. Mehanički satovi ne koriste bateriju, a kod kvarcnog sata uzrok može biti i drugi problem. Zato prvo pregledamo sat i proveravamo njegovo stanje.' },
      { question: 'Koliko košta zamena baterije?', answer: 'Cena zavisi od modela sata i potrebne baterije. Tačan iznos saopštavamo nakon pregleda, pre zamene.' }
    ]
  },
  {
    slug: 'zamena-narukvice-sata', kind: 'strap',
    title: 'Zamena narukvice sata', category: 'Novi izgled',
    tagline: 'Isti sat. Novi karakter.',
    summary: 'Osvežite izgled sata narukvicom koja odgovara njegovom kućištu i vašem stilu.',
    description: 'Zamena narukvice sata u Nišu. U DajaShop radnji proveravamo širinu i prihvat, pomažemo pri izboru odgovarajuće narukvice i obavljamo montažu.',
    keywords: 'zamena narukvice sata Niš, narukvice za satove, kaiš za sat, montaža narukvice, DajaShop',
    paragraphs: [
      'Istrošena narukvica ne mora da znači kraj omiljenog sata. Nova narukvica menja njegov izgled i može da doprinese udobnijem nošenju.',
      'Za dobar izbor važni su širina između prihvata, oblik kućišta i način pričvršćivanja. Pregledamo sat, proveravamo kompatibilnost narukvice i pažljivo je montiramo.'
    ],
    included: ['Provera širine i načina pričvršćivanja', 'Pomoć pri izboru kompatibilne narukvice', 'Montaža i provera pričvršćenja'],
    bring: ['Sat za koji birate novu narukvicu', 'Staru narukvicu i sačuvane delove, ako ih imate', 'Novu narukvicu, ako ste je već nabavili'],
    note: 'Satovi sa posebnim ili integrisanim prihvatom mogu zahtevati narukvicu namenjenu baš tom modelu. Kompatibilnost proveravamo pre montaže.',
    action: { path: '/usluge/skracivanje-narukvice-sata', label: 'Potrebno je samo skraćivanje?' },
    faqs: [
      { question: 'Kako da znam koja narukvica odgovara mom satu?', answer: 'Potrebno je proveriti širinu prihvata, oblik kućišta i način vezivanja. Najbolje je da donesete sat kako bismo proverili sve tri stvari pre izbora.' },
      { question: 'Mogu li da donesem svoju narukvicu?', answer: 'Možete je doneti zajedno sa satom. Pre montaže proveravamo da li narukvica i njeni delovi odgovaraju vašem modelu.' },
      { question: 'Da li su zamena i skraćivanje ista usluga?', answer: 'Zamenom se postavlja druga narukvica. Skraćivanjem se podešava dužina postojeće metalne narukvice, kada njen oblik i konstrukcija to dozvoljavaju.' }
    ]
  },
  {
    slug: 'skracivanje-narukvice-sata', kind: 'sizing',
    title: 'Skraćivanje narukvice sata', category: 'Po vašoj meri',
    tagline: 'Da sat lepo legne.',
    summary: 'Podešavanje dužine metalne narukvice za prijatnije i sigurnije nošenje.',
    description: 'Skraćivanje metalne narukvice sata u Nišu. Donesite sat u DajaShop radi provere članaka, podešavanja dužine i provere kako sat stoji na ruci.',
    keywords: 'skraćivanje narukvice sata Niš, podešavanje metalne narukvice, vađenje karika sata, DajaShop',
    paragraphs: [
      'Sat treba da stoji udobno, bez nepotrebnog klizanja i stezanja. Kod odgovarajućih metalnih narukvica dužina se podešava uklanjanjem predviđenih članaka ili pomeranjem položaja kopče.',
      'Najpre proveravamo konstrukciju narukvice, zatim dogovaramo odgovarajuću dužinu. Nakon podešavanja proveravamo pričvršćenje i kako sat stoji na ruci.'
    ],
    included: ['Provera mogućnosti skraćivanja', 'Podešavanje dužine prema vašoj ruci', 'Provera kopče i spojeva nakon podešavanja'],
    bring: ['Sat čiju narukvicu treba podesiti', 'Sačuvane članke i delove, ako ih imate', 'Najbolje je da dođe osoba koja će nositi sat'],
    note: 'Mogućnost podešavanja zavisi od konstrukcije narukvice. Sačuvajte uklonjene članke za eventualno kasnije produžavanje.',
    action: { path: '/usluge/zamena-narukvice-sata', label: 'Pogledaj zamenu narukvice' },
    faqs: [
      { question: 'Da li svaka metalna narukvica može da se skrati?', answer: 'Ne na isti način. Mogućnost skraćivanja zavisi od članaka, kopče i konstrukcije. Pregledom utvrđujemo kako vaša narukvica može da se podesi.' },
      { question: 'Da li treba da dođem lično?', answer: 'Preporučujemo da dođe osoba koja će nositi sat. Tako dužinu možemo da prilagodimo stvarnom obimu ruke i željenom osećaju pri nošenju.' },
      { question: 'Mogu li kasnije ponovo da produžim narukvicu?', answer: 'Kod narukvica sa uklonjivim člancima to može biti moguće ako sačuvate odgovarajuće članke i spojne delove. Zato ih zadržite nakon skraćivanja.' }
    ]
  },
  {
    slug: 'programiranje-daljinskih-upravljaca', kind: 'remote',
    title: 'Programiranje daljinskih upravljača', seoTitle: 'Programiranje daljinskih u Nišu',
    category: 'Lakši pristup', tagline: 'Jedan klik do ulaza.',
    summary: 'Provera kompatibilnosti i programiranje daljinskih za kapije, garažna vrata i rampe.',
    description: 'Programiranje daljinskih za kapije, garaže i rampe u Nišu. Donesite postojeći daljinski u DajaShop radi provere modela, kompatibilnosti i mogućnosti uparivanja.',
    keywords: 'programiranje daljinskih Niš, daljinski za kapiju, daljinski za garažu, kopiranje daljinskog, DajaShop',
    paragraphs: [
      'Potreban vam je dodatni ili zamenski daljinski za kapiju, garažna vrata ili rampu? Postojeći daljinski i podaci o sistemu pomažu nam da utvrdimo koja je opcija odgovarajuća.',
      'Kompatibilnost zavisi od modela, frekvencije i načina kodiranja. Proveravamo mogućnost programiranja i objašnjavamo da li je potrebno dodatno uparivanje sa prijemnikom na objektu.'
    ],
    included: ['Provera postojećeg daljinskog i dostupnih podataka o sistemu', 'Provera kompatibilnosti zamenskog upravljača', 'Programiranje kada ga sistem podržava i uputstvo za dalje korake'],
    bring: ['Postojeći daljinski, po mogućnosti ispravan', 'Oznaku ili fotografiju modela prijemnika, ako je dostupna', 'Podatke o kapiji, garaži ili rampi koju koristite'],
    note: 'Nije svaki daljinski moguće kopirati. Pojedini sistemi zahtevaju pristup prijemniku ili odobrenje osobe koja upravlja sistemom.',
    action: { path: '/daljinski', label: 'Pogledaj daljinske upravljače' },
    faqs: [
      { question: 'Da li je dovoljno da daljinski radi na istoj frekvenciji?', answer: 'Ne. Pored frekvencije, moraju da odgovaraju protokol i način kodiranja. Zato proveravamo konkretan model, a ne samo broj naveden na kućištu.' },
      { question: 'Da li moram da donesem stari daljinski?', answer: 'Donesite ga ako ga imate, najbolje ispravnog. Ako nemate postojeći daljinski, javite nam se sa podacima o sistemu kako bismo procenili šta je potrebno za proveru.' },
      { question: 'Da li je nakon programiranja potrebno uparivanje na kapiji?', answer: 'To zavisi od sistema. Neki upravljači zahtevaju postupak na prijemniku, uz dozvolu vlasnika ili upravnika. Potrebne korake objašnjavamo nakon provere kompatibilnosti.' }
    ]
  }
].map(service => ({
  ...service,
  path: `/usluge/${service.slug}`,
  image: `/images/services/${service.slug}.jpg`
}));

export const servicesOverview = {
  title: 'Usluge u Nišu — graviranje, satovi i daljinski',
  description: 'Pet usluga u DajaShop radnji u Nišu: lasersko graviranje, zamena baterije i narukvice sata, skraćivanje narukvice i programiranje daljinskih upravljača.',
  keywords: 'usluge Niš, lasersko graviranje, zamena baterije sata, zamena narukvice, skraćivanje narukvice, programiranje daljinskih',
  image: '/images/services/usluge.jpg'
};

export const getService = slug => serviceCatalog.find(service => service.slug === slug);
