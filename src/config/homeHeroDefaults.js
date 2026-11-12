const desktopFrame = { width: 1534, height: 678 };
const mobileFrame = { width: 750, height: 1000 };

export const HOME_HERO_DEFAULTS = [
  {
    id: '11111111-1111-4111-8111-111111111111', title: 'DajaShop', active: true,
    desktopSrc: '/images/home/hero-dajashop-desktop.webp?v=2', mobileSrc: '/images/home/hero-dajashop-mobile.webp',
    alt: 'Daniel Klein satovi', to: '/catalog?brand=DANIEL%20KLEIN', desktopFrame, mobileFrame, fit: 'contain', zoom: 102, animation: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222', title: 'Orient Stretto', active: true,
    desktopSrc: '/images/home/hero-orient-stretto-desktop.webp', mobileSrc: '/images/home/hero-orient-stretto-mobile.webp',
    alt: 'Orient Stretto Date kolekcija', to: '/brend/orient', desktopFrame, mobileFrame, fit: 'contain', zoom: 102, animation: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333', title: 'G-Shock', active: true,
    desktopSrc: '/images/home/hero-g-shock-gold-1280.webp', mobileSrc: '/images/home/hero-g-shock-gold-1280.webp',
    alt: 'Casio G-Shock kolekcija', to: '/catalog?brand=CASIO&category=G-SHOCK', desktopFrame, mobileFrame, fit: 'cover', zoom: 102, animation: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444', title: 'Daniel Klein izbor', active: true,
    desktopSrc: '/images/home/hero-daniel-klein-gold-960.webp', mobileSrc: '/images/home/hero-daniel-klein-gold-960.webp',
    alt: 'Daniel Klein izbor', to: '/catalog?brand=DANIEL%20KLEIN', desktopFrame, mobileFrame, fit: 'cover', zoom: 102, animation: true,
  },
  {
    id: '55555555-5555-4555-8555-555555555555', title: 'Casio', active: true,
    desktopSrc: '/images/home/hero-casio-1920.webp', mobileSrc: '/images/home/hero-casio-1920.webp',
    alt: 'Casio kolekcija', to: '/catalog?brand=CASIO', desktopFrame, mobileFrame, fit: 'cover', zoom: 102, animation: true,
  },
  {
    id: '66666666-6666-4666-8666-666666666666', title: 'Daniel Klein', active: true,
    desktopSrc: '/images/home/hero-daniel-klein-1519.webp', mobileSrc: '/images/home/hero-daniel-klein-1519.webp',
    alt: 'Daniel Klein kolekcija', to: '/catalog?brand=DANIEL%20KLEIN', desktopFrame, mobileFrame, fit: 'cover', zoom: 102, animation: true,
  },
  {
    id: '77777777-7777-4777-8777-777777777777', title: 'G-Shock GA-2100', active: true,
    desktopSrc: '/images/home/g-shock-1600.webp', mobileSrc: '/images/home/g-shock-1600.webp',
    alt: 'G-Shock GA-2100', to: '/catalog?brand=CASIO&category=G-SHOCK', desktopFrame, mobileFrame, fit: 'cover', zoom: 102, animation: true,
  },
];
