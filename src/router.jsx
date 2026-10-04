import React, { lazy } from 'react';
import ClientOnly from './components/ClientOnly.jsx';

function browserPage(loader) {
  const Component = lazy(loader);
  return function BrowserPage(props) {
    return <ClientOnly fallback={<p role="status">Učitavanje…</p>}><Component {...props} /></ClientOnly>;
  };
}
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
const SearchResults = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/SearchResults.jsx'));
import Product from './pages/Products.jsx';
const Cart = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Cart.jsx'));
const Checkout = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Checkout.jsx'));
const Account = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Account.jsx'));
const Orders = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Orders.jsx'));
import About from './pages/About.jsx';
const AdminDashboard = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Admin/AdminDashboard.jsx'));
const VerifyEmail = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/VerifyEmail.jsx'));
const ResetPassword = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/ResetPassword.jsx'));
const Logout = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Logout.jsx'));
import FAQ from './pages/FAQ.jsx';
import Contact from './pages/Contact.jsx';
import Usluge from './pages/Usluge.jsx';
import Engraving from './pages/Engraving.jsx';
import PageStatus from './pages/PageStatus.jsx';
const OrdersPage = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Admin/OrdersPage'));
const LegalDocument = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/LegalDocument.jsx'));
const Unsubscribe = import.meta.env.SSR ? () => null : browserPage(() => import('./pages/Unsubscribe.jsx'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* --- RUTE ZA ODELJENJA --- */}
      {/* Glavni katalog (Satovi) */}
      <Route path="/catalog" element={<Catalog department="satovi" />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/muski-satovi" element={<Catalog department="satovi" fixedGender="Muški" seo={{ title: 'Muški satovi', description: 'Muški ručni satovi brendova Casio, Orient, Daniel Klein i Q&Q. Pronađite model za svaki stil u DajaShop-u.', keywords: 'muski satovi,rucni satovi za muskarce,Casio,Orient,Daniel Klein', path: '/muski-satovi' }} />} />
      <Route path="/zenski-satovi" element={<Catalog department="satovi" fixedGender="Ženski" seo={{ title: 'Ženski satovi', description: 'Ženski ručni satovi brendova Casio, Daniel Klein, Orient i Q&Q. Izaberite elegantan sat u DajaShop-u.', keywords: 'zenski satovi,rucni satovi za zene,Casio,Daniel Klein,Orient', path: '/zenski-satovi' }} />} />

      {/* Posebne stranice za ostale proizvode */}
      <Route path="/daljinski" element={<Catalog department="daljinski" />} />
      <Route path="/baterije" element={<Catalog department="baterije" />} />
      <Route path="/naocare" element={<Catalog department="naocare" />} />

      <Route path="/product/:slug" element={<Product />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/account" element={<Account />} />
      <Route path="/account/:section" element={<Account />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/about" element={<About />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/usluge" element={<Usluge />} />
      <Route path="/graviranje" element={<Engraving />} />
      <Route path="/admin/orders" element={<OrdersPage />} />
      <Route path="/privacy" element={<LegalDocument kind="privacy" />} />
      <Route path="/cookies" element={<LegalDocument kind="cookies" />} />
      <Route path="/terms" element={<LegalDocument kind="terms" />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="*" element={<PageStatus />} />
    </Routes>
  );
}
