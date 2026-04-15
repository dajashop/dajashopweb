import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home.jsx'));
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Product = lazy(() => import('./pages/Products.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const FAQ = lazy(() => import('./pages/FAQ.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Usluge = lazy(() => import('./pages/Usluge.jsx'));
const OrdersPage = lazy(() => import('./pages/Admin/OrdersPage.jsx'));

function RouteSpinner() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh]"
      role="status"
      aria-live="polite"
      aria-label="Ucitavanje stranice"
    >
      <span className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteSpinner />}>
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
        <Route path="/admin/orders" element={<OrdersPage />} />
      </Routes>
    </Suspense>
  );
}
