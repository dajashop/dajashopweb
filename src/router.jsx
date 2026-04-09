import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Products.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Account from './pages/Account.jsx';
import Orders from './pages/Orders.jsx';
import About from './pages/About.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import FAQ from './pages/FAQ.jsx';
import Contact from './pages/Contact.jsx';
import Usluge from './pages/Usluge.jsx';
import OrdersPage from './pages/Admin/OrdersPage';
import WatchFinderPage from './pages/WatchFinder.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* --- RUTE ZA ODELJENJA --- */}
      {/* Glavni katalog (Satovi) */}
      <Route path="/catalog" element={<Catalog department="satovi" />} />

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
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/usluge" element={<Usluge />} />
      <Route path="/watch-finder" element={<WatchFinderPage />} />
      <Route path="/admin/orders" element={<OrdersPage />} />
    </Routes>
  );
}
