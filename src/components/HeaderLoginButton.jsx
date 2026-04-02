import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import './HeaderLoginButton.css';

export default function HeaderLoginButton() {
  const { user, showAuth } = useAuth();

  // Ako korisnik NIJE ulogovan
  if (!user) {
    return (
      <button className="btn-ghost pill" onClick={() => showAuth('login')}>
        <User size={18} />
        <span>Prijavi se</span>
      </button>
    );
  }

  // Ako JE ulogovan
  return (
    <div className="header-user">
      <Link
        to="/account/profile"
        className="avatar small"
        aria-label="Moj nalog"
        // Dodajemo overflow: hidden da slika ne bi izlazila iz kruga
        style={user.photoURL ? { overflow: 'hidden', padding: 0 } : {}}
      >
        {user.photoURL ? (
          // Prikaz profilne slike ako postoji
          <img
            src={user.photoURL}
            alt={user.displayName || 'Profil'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // Prikaz inicijala ako slike nema
          <span>
            {user.displayName?.[0]?.toUpperCase() ||
              user.email?.[0]?.toUpperCase() ||
              'U'}
          </span>
        )}
      </Link>
    </div>
  );
}
