const unsplash = (file, alt, caption, author, page, position = 'center') => ({
  src: `/images/magazine/${file}-1600.webp`,
  small: `/images/magazine/${file}-640.webp`,
  medium: `/images/magazine/${file}-960.webp`,
  alt, caption, author, creditUrl: `https://unsplash.com/photos/${page}`,
  licenseUrl: 'https://unsplash.com/license', position,
});

export const watchPhotography = {
  gshock: unsplash('gshock-studio', 'Crni digitalni G-Shock na svetloj podlozi', 'Digitalno nasleđe G-Shock-a. Ilustrativna fotografija, nije model iz najave.', 'Peng Productions®', 'black-casio-g-shock-digital-watch-MQs3wF6APLY', 'center 58%'),
  gshockDetail: unsplash('gshock-camera', 'Beli G-Shock pored fotoaparata', 'G-Shock u svakodnevnom okruženju. Ilustrativna fotografija.', 'Moaaz Baig', 'a-white-watch-sitting-on-top-of-a-table-next-to-a-camera-OvKa4izFRo0', 'center 53%'),
  movement: unsplash('movement', 'Detalj mehaničkog satnog mehanizma', 'Pogled u mehanički svet satova. Ilustracija, nije Orient mehanizam.', 'Max Fomin', 'a-close-up-of-the-inside-of-a-watch-94wyGKpnpT0'),
  calibre: unsplash('calibre', 'Zupčanici i balansni sklop mehaničkog sata', 'Detalji satnog mehanizma. Ilustrativna fotografija.', 'Lukas Tennie', 'a-close-up-of-a-watch-face-with-the-gears-missing-3dyDozzCORw'),
  mako: {
    src: 'https://cdn.dajashop.rs/images/ra-ac0q13e/ra-ac0q13e-1-31128c41-7d81-443a-9aeb-b6091b9b92ff.webp',
    alt: 'Orient RA-AC0Q13E sa zelenim brojčanikom', caption: 'Orient RA-AC0Q13E — fotografija iz DajaShop kataloga.', product: true,
  },
  makoDetail: {
    src: 'https://cdn.dajashop.rs/images/ra-ac0q13e/ra-ac0q13e-2-2fc43928-7aee-4df5-a2bf-3c3402467220.webp',
    alt: 'Drugi ugao modela Orient RA-AC0Q13E', caption: 'Orient RA-AC0Q13E — pogled iz drugog ugla.', product: true,
  },
};

export const articlePhotography = {
  'g-shock-analogni-2500': {cover: watchPhotography.gshock, detail: watchPhotography.gshockDetail, headings: ['Prepoznatljiv oblik, drugačiji prikaz', 'Šta uporediti pri izboru']},
  'orient-jesen-zima-2026': {cover: watchPhotography.movement, detail: watchPhotography.calibre, headings: ['Tri kolekcije, različiti karakteri', 'Od inspiracije do izbora']},
  'orient-mako-40-boje-2026': {cover: watchPhotography.mako, detail: watchPhotography.makoDetail, headings: ['Boja iz drugog ugla', 'Sportski izgled i namena sata']},
};
