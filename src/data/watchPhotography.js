const unsplash = (file, alt, caption, author, page, position = 'center') => ({
  src: `/images/magazine/${file}-1600.webp`,
  small: `/images/magazine/${file}-640.webp`,
  medium: `/images/magazine/${file}-960.webp`,
  alt, caption, author, creditUrl: `https://unsplash.com/photos/${page}`,
  licenseUrl: 'https://unsplash.com/license', position,
  provider: 'Unsplash',
});

const localPhoto = (file, alt, caption, extra = {}) => ({
  src: `/images/magazine/${file}-1600.webp`, small: `/images/magazine/${file}-640.webp`,
  medium: `/images/magazine/${file}-960.webp`, alt, caption, ...extra,
});

export const watchPhotography = {
  makoScene: localPhoto('orient-mako-scene', 'Orient Mako sa crnim brojčanikom na tamnom kamenu', 'Orient Mako — detalj sportskog dizajna. Ilustracija kolekcije.', {width:1500,position:'center 49%'}),
  orientColours: localPhoto('orient-colours', 'Orient satovi sa zelenim, tirkiznim, ljubičastim i narandžastim brojčanicima', 'Orient — različite boje i karakteri brojčanika. Ilustracija brenda.', {width:1400,position:'center 55%'}),
  danielKlein: localPhoto('daniel-klein-campaign', 'Daniel Klein satovi na talasastoj drvenoj podlozi', 'Daniel Klein — ambijentalna fotografija brenda.', {panorama:'2000 / 834'}),
  qq: localPhoto('qq-anniversary', 'Plavi Q&Q sat na kamenju, kampanja za 50 godina brenda', 'Q&Q — kampanja povodom 50 godina brenda.', {panorama:'1920 / 1027',position:'center 50%'}),
  kamasu: localPhoto('orient-kamasu-wrist', 'Plavi Orient Kamasu RA-AA0002L u ambijentu', 'Orient Kamasu RA-AA0002L — fotografija iz DajaShop kataloga.', {width:1000,position:'center 45%'}),
  bambino: localPhoto('orient-bambino-scene', 'Orient Bambino ER24005W sa kožnom narukvicom na drvenoj podlozi', 'Orient Bambino ER24005W — klasičan sat u svakodnevnom ambijentu.', {position:'center 32%',author:'MIKI Yoshihito',provider:'Wikimedia Commons',creditUrl:'https://commons.wikimedia.org/wiki/File:Orient_Watch_-_Bambino_(ER24005W)_(29121883374).jpg',licenseName:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/'}),
  orientStar: localPhoto('orient-star-scene', 'Orient Star na toploj drvenoj podlozi', 'Orient Star — ambijentalna fotografija mehaničkog sata.', {author:'MIKI Yoshihito',provider:'Wikimedia Commons',creditUrl:'https://commons.wikimedia.org/wiki/File:Orient_Star._(51998694922).jpg',licenseName:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/'}),
  danielKleinWomen: {src:'/images/home/women-watches-960.webp',small:'/images/home/women-watches-480.webp',width:960,smallWidth:480,alt:'Zlatni Daniel Klein sat sa svetlim brojčanikom u ambijentu',caption:'Daniel Klein — detalj ženske kolekcije.'},
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
  'orient-jesen-zima-2026': {cover: watchPhotography.orientColours, detail: watchPhotography.kamasu, headings: ['Tri kolekcije, različiti karakteri', 'Od inspiracije do izbora']},
  'orient-mako-40-boje-2026': {cover: watchPhotography.makoScene, detail: watchPhotography.makoDetail, headings: ['Boja iz drugog ugla', 'Sportski izgled i namena sata']},
};

export const brandPhotography = {
  ORIENT:watchPhotography.makoScene, 'ORIENT STAR':watchPhotography.orientStar,
  'DANIEL KLEIN':watchPhotography.danielKlein, 'Q&Q':watchPhotography.qq, CASIO:watchPhotography.gshock,
};

export const collectionPhotography = {
  '/orient-kamasu':watchPhotography.kamasu, '/orient-bambino':watchPhotography.bambino,
  '/orient-mako':watchPhotography.makoScene,
  '/daniel-klein-zenski-satovi':watchPhotography.danielKleinWomen,
  '/automatski-satovi':watchPhotography.orientStar, '/muski-automatski-satovi':watchPhotography.kamasu,
  '/digitalni-satovi':watchPhotography.gshockDetail, '/casio-digitalni-satovi':watchPhotography.gshockDetail,
  '/casio-g-shock':watchPhotography.gshockDetail,
};
