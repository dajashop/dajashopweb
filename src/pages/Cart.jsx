import React, { useState, useEffect } from 'react';
import './Cart.css';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart.js';
import { useUndo } from '../hooks/useUndo.js';
import { usePromo } from '../hooks/usePromo.js';
import { useAuth } from '../hooks/useAuth.js'; // NOVO: Importujemo Auth
import { money } from '../utils/currency.js';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/modals/ConfirmModal.jsx';
import {
  ShoppingBag,
  ShieldCheck,
  Trash2,
  ArrowRight,
  Minus,
  Plus,
  Ticket,
  XCircle,
  Truck,
  X,
} from 'lucide-react';
import SEOHead from '../components/seo/SEOHead.jsx';

function QtyInput({ value, id, dispatch }) {
  const [localVal, setLocalVal] = useState(value);
  const clampQty = (n) => Math.max(1, Math.min(99, n));

  useEffect(() => setLocalVal(value), [value]);

  const handleBlur = () => {
    let n = parseInt(localVal, 10);
    n = clampQty(isNaN(n) ? 1 : n);
    setLocalVal(n);
    if (n !== value) dispatch({ type: 'SET_QTY', id: id, qty: n });
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      e.target.blur();
    }
  };

  return (
    <input
      className="cart__qty no-spin"
      type="number"
      min="1"
      max="99"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-label="Količina proizvoda"
      inputMode="numeric"
    />
  );
}

// NOVO: Dodat prop 'loading'
function PromoCodeSection({
  onApply,
  activeCode,
  onRemove,
  error,
  success,
  loading,
}) {
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    onApply(code);
    setCode('');
  };

  if (activeCode) {
    return (
      <div className="promo-box applied">
        <div className="input-wrapper applied-wrapper">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <Ticket size={18} className="icon" style={{ color: '#4ade80' }} />
            <span className="applied-text">
              Kod <strong>{activeCode}</strong> aktivan
            </span>
          </div>
          <button type="button" onClick={onRemove} className="btn-remove-code">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <form className="promo-box" onSubmit={handleSubmit}>
        <div className={`input-wrapper ${error ? 'border-red-500' : ''}`}>
          <Ticket size={18} className={`icon ${error ? 'text-red-500' : ''}`} />
          <input
            type="text"
            placeholder="Promo kod"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading} // Onemogućeno dok se učitava
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary promo-btn"
          disabled={code.length < 3 || loading}
        >
          {loading ? 'Provera...' : 'Potvrdi'}
        </button>
      </form>
      {error && (
        <p
          style={{
            color: '#ef4444',
            fontSize: '0.8rem',
            marginTop: '-10px',
            marginBottom: '10px',
            paddingLeft: '4px',
          }}
        >
          {error}
        </p>
      )}
      {success && (
        <p
          style={{
            color: '#4ade80',
            fontSize: '0.8rem',
            marginTop: '-10px',
            marginBottom: '10px',
            paddingLeft: '4px',
          }}
        >
          {success}
        </p>
      )}
    </div>
  );
}

export default function Cart() {
  const { items, total, dispatch } = useCart();
  const { showUndo } = useUndo();
  const { user } = useAuth(); // NOVO: Uzimamo ulogovanog korisnika
  const [showClearModal, setShowClearModal] = useState(false);

  // NOVO: Uzimamo i 'loading' status iz hook-a
  const {
    appliedPromo,
    validateAndApply,
    removePromo,
    error,
    successMsg,
    loading,
  } = usePromo();

  const FREE_SHIPPING_LIMIT = 10000;
  const SHIPPING_COST = 380;

  const discountAmount = appliedPromo ? appliedPromo.amount : 0;
  const subtotalAfterDiscount = total - discountAmount;

  const isFreeShipping = appliedPromo?.freeShipping || subtotalAfterDiscount >= FREE_SHIPPING_LIMIT;
  const missingForFree = FREE_SHIPPING_LIMIT - subtotalAfterDiscount;
  const progressPct = Math.min(
    100,
    (subtotalAfterDiscount / FREE_SHIPPING_LIMIT) * 100,
  );

  const finalTotal =
    subtotalAfterDiscount + (isFreeShipping ? 0 : SHIPPING_COST);

  const clampQty = (n) => Math.max(1, Math.min(99, n));

  const handleApplyPromo = (code) => {
    // NOVO: Prosleđujemo 'user' kao četvrti argument za proveru u bazi
    validateAndApply(code, total, items, user, false);
  };

  const performRemove = (item) => {
    dispatch({ type: 'REMOVE', id: item.id });
    showUndo(item, () => {
      dispatch({ type: 'ADD', item: item, qty: item.qty });
    });
  };

  const handleDecrease = (item) => {
    if (item.qty > 1) {
      dispatch({ type: 'SET_QTY', id: item.id, qty: item.qty - 1 });
    } else {
      performRemove(item);
    }
  };

  const performClear = () => {
    const itemsToRestore = [...items];

    dispatch({ type: 'CLEAR' });
    setShowClearModal(false);
    removePromo();

    showUndo({ name: 'Sve proizvode' }, () => {
      itemsToRestore.forEach((item) => {
        dispatch({ type: 'ADD', item: item, qty: item.qty });
      });
    });
  };

  return (
    <div className="cart container">
      <SEOHead title="Korpa" noIndex={true} />

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={performClear}
        title="Isprazni korpu?"
        description="Da li ste sigurni da želite da uklonite sve proizvode? Ovu akciju nije moguće opozvati."
        isDanger={true}
      />

      <div className="cart__header">
        <div className="cart__title">
          <ShoppingBag aria-hidden /> <h1>Vaša korpa</h1>
        </div>
        <div className="header-actions">
          {items.length > 0 && (
            <div className="cart__badge" aria-label={`${items.length} stavki`}>
              {items.length}
            </div>
          )}
        </div>
      </div>

      {items.length === 0 && (
        <motion.div
          className="empty glass card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="empty__iconWrap">
            <ShoppingBag className="empty__icon" aria-hidden />
          </div>
          <h2>Korpa je prazna</h2>
          <p className="muted">
            Pogledaj našu kolekciju satova i pronađi onaj pravi.
          </p>
          <Link to="/catalog" className="btn btn-primary">
            U katalog <ArrowRight size={18} aria-hidden />
          </Link>
        </motion.div>
      )}

      {items.length > 0 && (
        <div className="cart-content-grid">
          <motion.div
            className="card glass cart__wrap items-list-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="cart__rows">
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((it) => (
                  <motion.div
                    key={it.id}
                    className="cart__row"
                    layout
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      marginBottom: 0,
                      scale: 0.95,
                    }}
                    transition={{ duration: 0.25 }}
                  >
                    <img
                      className="cart__thumb"
                      src={it.thumb || it.image}
                      alt={it.name}
                      loading="lazy"
                    />

                    <div className="cart__meta">
                      <Link to={`/product/${it.slug}`} className="cart__name">
                        {it.name}
                      </Link>
                      <div className="cart__brand">{it.brand}</div>
                    </div>

                    <div className="cart__qtyWrap">
                      <button
                        className="qty__btn"
                        onClick={() => handleDecrease(it)}
                      >
                        <Minus size={14} />
                      </button>

                      <QtyInput value={it.qty} id={it.id} dispatch={dispatch} />

                      <button
                        className="qty__btn"
                        onClick={() =>
                          dispatch({
                            type: 'SET_QTY',
                            id: it.id,
                            qty: clampQty(it.qty + 1),
                          })
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="cart__price">
                      {money(it.price * it.qty)}
                    </div>

                    <button
                      className="cart__remove"
                      onClick={() => performRemove(it)}
                      title="Ukloni"
                    >
                      <XCircle size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="cart__clear-row">
              <button
                className="btn btn-ghost btn-clear-all"
                onClick={() => setShowClearModal(true)}
              >
                <Trash2 size={16} /> Isprazni celu korpu
              </button>
            </div>
          </motion.div>

          <motion.div
            className="card glass cart__summary-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="summary-title">Pregled porudžbine</h3>

            <div className="shipping-progress">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: 6,
                }}
              >
                {isFreeShipping ? (
                  <span
                    style={{
                      color: 'var(--primary)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Truck size={14} color="#40a840" /> Imate besplatnu dostavu!
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text)' }}>
                    Još{' '}
                    <strong style={{ color: '#40a840', fontWeight: 700 }}>
                      {money(missingForFree)}
                    </strong>{' '}
                    do besplatne dostave
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {progressPct.toFixed(0)}%
                </span>
              </div>

              <div
                style={{
                  height: 6,
                  width: '100%',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: '#40a840',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>

            <PromoCodeSection
              onApply={handleApplyPromo}
              activeCode={appliedPromo?.code}
              onRemove={removePromo}
              error={error}
              success={successMsg}
              loading={loading} // NOVO: Prosleđujemo loading stanje
            />

            <div className="summary-details">
              <div className="summary-row subtotal">
                <span className="muted">Međuzbir:</span>
                <span>{money(total)}</span>
              </div>

              {appliedPromo && (
                <div
                  className="summary-row discount"
                  style={{ color: '#ef4444' }}
                >
                  <span className="muted" style={{ color: '#ef4444' }}>
                    Popust ({appliedPromo.code}):
                  </span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}

              <div className="summary-row shipping">
                <span className="muted">Isporuka:</span>
                {isFreeShipping ? (
                  <span style={{ color: '#40a840', fontWeight: 700 }}>
                    Besplatna
                  </span>
                ) : (
                  <span>{money(SHIPPING_COST)}</span>
                )}
              </div>
            </div>

            <div className="cart__total">
              <span>Ukupno za plaćanje</span>
              <span className="cart__totalPrice">{money(finalTotal)}</span>
            </div>

            <Link to="/checkout" className="btn btn-primary checkout-btn">
              Nastavi na plaćanje <ArrowRight size={18} aria-hidden />
            </Link>

            <div className="cart__note">
              <ShieldCheck size={16} aria-hidden /> Sigurna kupovina i garancija
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
