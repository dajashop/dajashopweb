import { useStorefront } from '../localization/StorefrontContext.jsx';
import React, { useState, useRef } from 'react';
import './Header.css';
import { Link } from 'react-router-dom';
import NavBar from './NavBar.jsx';
import SearchBar from './SearchBar.jsx';
import { useCart } from '../hooks/useCart.js';
import HeaderLoginButton from './HeaderLoginButton.jsx';
import { useAuth } from '../hooks/useAuth.js';
// [NOVO] Dodat import za ShoppingBag
import { Heart, ShoppingBag } from 'lucide-react';
import { useWishlist } from '../context/WishlistProvider.jsx';

import HamburgerMenu from './HamburgerMenu.jsx';
import StorefrontPreferences from '../localization/StorefrontPreferences.jsx';
import brandLogo from '../assets/dajashop-logo.svg';

export default function Header() {
  const { t: translateText } = useStorefront();

  const { count, cart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, staffReady } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadOrders, setUnreadOrders] = useState(0);

  const anchorRef = useRef(null);

  return (
    <header className="header card shadow">
      <div className="container header__grid">
        <Link to="/" className="header__brand">
          <span className="header__brand-sizing" aria-hidden="true">{translateText("DajaShop")}</span>
          <img className="header__brand-logo" src={brandLogo} alt="DajaShop" />
        </Link>

        <div className="header__search">
          <SearchBar />
        </div>

        <div className="header__actions">
          {/* KORPA: Ima 'ShoppingBag' ikonicu za desktop i klasu 'desktop-only' da se sakrije na mobilnom */}
          <Link className="header__cart desktop-only" to="/cart">
            <ShoppingBag size={22} />
            {/* <span>Korpa</span> */}
            <span className="badge">{translateText(count)}</span>
          </Link>

          {/* LISTA ŽELJA: Klasa 'header__wishlist' (nema korpu na mobilnom) */}
          <Link
            className="header__wishlist"
            to="/account/wishlist"
            title={translateText("Lista želja")}
          >
            <Heart size={22} />
            {wishlistCount > 0 && (
              <span className="badge">{translateText(wishlistCount)}</span>
            )}
          </Link>

          <StorefrontPreferences />
          <HeaderLoginButton />

          <button
            ref={anchorRef}
            className="hamburger"
            aria-label={translateText(menuOpen ? 'Zatvori meni' : 'Otvori meni')}
            aria-expanded={menuOpen}
            aria-controls="hm-panel"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hamburger__line"></span>
            <span className="hamburger__line"></span>
            <span className="hamburger__line"></span>
            {unreadOrders > 0 && (
              <span className="hamburger__notification" aria-label={translateText(`${unreadOrders} novih porudžbina`)}>
                {translateText(unreadOrders > 99 ? '99+' : unreadOrders)}
              </span>
            )}
          </button>
        </div>
      </div>

      <NavBar />

      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        count={count}
        cart={cart}
        user={user}
        staffReady={staffReady}
        anchorEl={anchorRef}
        onUnreadOrdersChange={setUnreadOrders}
      />
    </header>
  );
}
