import { useEffect, useRef, useState } from 'react';
import { promotionsApi } from '../services/dajaPlatform';
import { useConsent } from '../context/ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

export function usePromo() {
  const { hasDecision } = useConsent();
  const [appliedPromo, setAppliedPromo] = useState(() => {
    try {
      const saved = readStoredValue('daja_active_promo', 'necessary');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const promoPersistence = useRef(false);

  useEffect(() => {
    if (!hasDecision) return;
    try {
      const saved = readStoredValue('daja_active_promo', 'necessary');
      promoPersistence.current = Boolean(saved);
      setAppliedPromo(saved ? JSON.parse(saved) : null);
    } catch {
      setAppliedPromo(null);
    }
    setHydrated(true);
  }, [hasDecision]);

  useEffect(() => {
    if (!hasDecision || !hydrated || !promoPersistence.current) return;
    writeStoredValue(
      'daja_active_promo',
      appliedPromo ? JSON.stringify(appliedPromo) : null,
      'necessary',
    );
  }, [appliedPromo, hasDecision, hydrated]);

  const validateAndApply = async (
    inputCode,
    _cartTotal,
    cartItems,
    _user,
    isAuto = false,
    options = {},
  ) => {
    setLoading(true);
    if (!isAuto) {
      setError(null);
      setSuccessMsg(null);
    }

    try {
      const code = inputCode.trim().toUpperCase();
      if (!code) throw new Error('Unesite promo kod.');
      const verified = await promotionsApi.validate(code, cartItems, options);
      if (verified?.valid === false) {
        throw new Error(verified.message || 'Promo kod ne ispunjava uslove za ovu korpu.');
      }
      const amount = Number(verified?.discountAmount ?? 0);
      const freeShipping = Boolean(verified?.freeShipping);
      if (!amount && !freeShipping) {
        throw new Error('Ovaj promo kod trenutno ne daje popust za izabranu korpu.');
      }
      if (!isAuto || options.persist === true) promoPersistence.current = true;
      setAppliedPromo({
        code: verified?.code || code,
        amount,
        freeShipping,
        subtotalAmount: verified?.subtotalAmount ?? null,
        eligibleSubtotalAmount: verified?.eligibleSubtotalAmount ?? null,
      });
      if (!isAuto) {
        setSuccessMsg(freeShipping ? 'Besplatna dostava je primenjena.' : 'Popust je primenjen.');
      }
      return verified;
    } catch (requestError) {
      if (!isAuto) setError(requestError.message || 'Promo kod nije moguće primeniti.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const removePromo = () => {
    promoPersistence.current = true;
    setAppliedPromo(null);
    writeStoredValue('daja_active_promo', null, 'necessary');
    setError(null);
    setSuccessMsg(null);
  };

  return {
    appliedPromo,
    validateAndApply,
    removePromo,
    error,
    successMsg,
    loading,
  };
}
