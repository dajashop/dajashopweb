## 🛍️ DajaShop - Moderna E-Commerce Prodavnica Satova

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.17-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.5.0-FFCA28?logo=firebase)](https://firebase.google.com/)

DajaShop je moderna, responzivna React aplikacija za online prodavnicu satova sa profesionalnim UI/UX dizajnom, glatkim animacijama i potpunom Firebase integracijom.

## ✨ Glavne Karakteristike

### 🔐 Autentifikacija

- **Email/Password** autentifikacija
- **Google OAuth** prijava
- **Facebook OAuth** prijava
- **Phone SMS** verifikacija
- Bezbedan JWT token sistem
- Email verifikacija

### 🛒 E-Commerce Funkcionalnosti

- Kompletan **shopping cart** sistem
- Real-time ažuriranje korpe
- **Promo kodovi** i popusti
- **Wishlist** funkcionalnost
- Multi-step **checkout** proces
- **Order history** i tracking

### 🎨 Korisničko Iskustvo

- **Dark/Light mode** sa smooth prelaskom
- **Smooth scrolling** sa Lenis bibliotekom
- Profesionalne **animacije** sa Framer Motion
- **Responsive dizajn** za sve uređaje
- **3D prikaz** satova sa Three.js
- **Lazy loading** slika za bolje performanse

### 📱 Stranice

- **Home** - Landing page sa featured proizvodima
- **Catalog** - Prikaz svih proizvoda sa filterima
- **Product Details** - Detaljan prikaz proizvoda
- **Cart** - Shopping cart
- **Checkout** - Proces naručivanja
- **Account** - Korisnički profil
- **Orders** - Istorija porudžbina
- **About** - O nama stranica
- **Admin Panel** - Upravljanje proizvodima (admin only)

### 🔧 Admin Panel

- CRUD operacije za proizvode
- Upload slika
- Upravljanje porudžbinama
- Statistika prodaje
- Korisničko upravljanje

## 🚀 Quick Start

### Preduslovi

Potrebno je da imate instaliran:

- **Node.js** 18.x ili noviji
- **npm** ili **yarn**
- **Git**

### Instalacija

1. **Klonirajte repozitorijum:**

```bash
git clone https://github.com/your-username/dajashopreact.git
cd dajashopreact
```

2. **Instalirajte zavisnosti:**

```bash
npm install
```

3. **Podesite environment varijable:**

```bash
cp .env.example .env
```

Otvorite `.env` i popunite Firebase konfiguraciju:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... ostale varijable
```

4. **Pokrenite development server:**

```bash
npm run dev
```

Aplikacija će biti dostupna na `http://localhost:5173`

### Build za Production

```bash
npm run build
npm run preview
```

## 📖 Dokumentacija

- **[SETUP.md](./SETUP.md)** - Detaljan vodič za podešavanje projekta
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arhitektura i struktura projekta
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Vodič za doprinošenje projektu

### Dokumentacija po Direktorijumima

- [src/components/](./src/components/README.md) - React komponente
- [src/hooks/](./src/hooks/README.md) - Custom React hooks
- [src/pages/](./src/pages/README.md) - Stranice aplikacije
- [src/services/](./src/services/README.md) - API servisi
- [src/context/](./src/context/README.md) - Context provideri
- [src/utils/](./src/utils/README.md) - Utility funkcije

## 🛠️ Tehnološki Stack

### Frontend

- **React 19.2.0** - UI library
- **Vite 7.2.2** - Build tool
- **React Router DOM 7.9.5** - Rutiranje
- **Tailwind CSS 4.1.17** - Styling
- **Framer Motion 12.23.24** - Animacije
- **Lenis 1.3.15** - Smooth scrolling
- **Lucide React 0.553.0** - Ikone

### Backend & Database

- **Firebase 12.5.0**
  - Authentication (Multi-provider)
  - Firestore (NoSQL database)
  - Storage (Slike i fajlovi)
  - Analytics
  - App Check (Sigurnost)

### 3D & Graphics

- **Three.js 0.181.1** - 3D rendering
- **@react-three/fiber 9.4.0** - React renderer za Three.js
- **@react-three/drei 10.7.7** - Three.js helpers

## 📂 Struktura Projekta

```
dajashopreact/
├── public/                  # Statički resursi
│   └── products/           # Slike proizvoda
├── src/
│   ├── assets/            # Lokalni resursi
│   ├── components/        # React komponente
│   │   ├── modals/       # Modal komponente
│   │   └── about/        # About page komponente
│   ├── config/           # Konfiguracija
│   ├── context/          # React Context
│   │   ├── AuthContext/  # Autentifikacija
│   │   ├── CartContext/  # Shopping cart
│   │   └── ThemeContext/ # Tema (dark/light)
│   ├── data/             # Statički podaci
│   │   └── mock/        # Mock podaci za dev
│   ├── hooks/            # Custom hooks
│   ├── models/           # Data modeli
│   ├── pages/            # Stranice
│   │   └── Admin/       # Admin panel
│   ├── services/         # API servisi
│   ├── styles/           # Globalni stilovi
│   └── utils/            # Helper funkcije
├── .env.example          # Template za env varijable
├── .editorconfig         # Editor konfiguracija
├── .vscode/              # VS Code settings
├── ARCHITECTURE.md       # Arhitekturna dokumentacija
├── SETUP.md              # Setup vodič
├── CONTRIBUTING.md       # Vodič za doprinošenje
└── package.json          # Zavisnosti
```

## 🎯 Dostupne Komande

```bash
# Development server sa hot reload
npm run dev

# Build za production
npm run build

# Preview production build
npm run preview

# Lint koda
npm run lint
```

## 🔒 Sigurnost

- Firebase App Check za zaštitu od abuse-a
- Validacija input-a na client i server strani
- Sigurno čuvanje environment varijabli
- XSS zaštita
- CSRF zaštita

## 🌐 Browser Podrška

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) /* Tablet */ @media (min-width: 641px) and (max-width: 1024px) /* Desktop */ @media (min-width: 1025px);
```

## 🤝 Doprinošenje

Doprinosi su dobrodošli! Pročitajte [CONTRIBUTING.md](./CONTRIBUTING.md) za detalje o procesu i coding standardima.

### Brzi Start za Doprinošenje

1. Fork-ujte projekat
2. Kreirajte feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit-ujte promene (`git commit -m 'feat: Add amazing feature'`)
4. Push-ujte branch (`git push origin feature/AmazingFeature`)
5. Otvorite Pull Request

## 📝 Licenca

Sva prava zadržana © 2025 DajaShop

## 📞 Kontakt

**DajaShop**

- 📧 Email: cvelenis42@yahoo.com
- 📱 Telefon: 064/1262425, 065/2408400
- 📍 Adresa: Niš, TPC Gorča lokal C31

## 🙏 Priznanja

- [React](https://react.dev/) - UI biblioteka
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animacije
- [Firebase](https://firebase.google.com/) - Backend as a Service
- [Lucide](https://lucide.dev/) - Ikone

---

**Izrađeno sa ❤️ u Nišu, Srbija**
