import { useCallback, useEffect, useRef, useState } from 'react';
import { promotionsApi } from '../services/dajaPlatform';
import { useConsent } from '../context/ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

export function usePromo({ user, authReady = true, items = [], total = 0 } = {}) {
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
  const validationRequest = useRef(0);
  const autoAttempt = useRef('');
  const [eligibilityRevision, setEligibilityRevision] = useState(0);
  const customerKey = user?.id || user?.email || 'guest';

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setEligibilityRevision(value => value + 1);
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('daja:newsletter-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('daja:newsletter-changed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

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

  const validateAndApply = useCallback(async (
    inputCode,
    _cartTotal,
    cartItems,
    _user,
    isAuto = false,
    options = {},
  ) => {
    const request = ++validationRequest.current;
    const code = inputCode.trim().toUpperCase();
    setLoading(true);
    if (!isAuto) {
      setError(null);
      setSuccessMsg(null);
    }

    try {
      if (!code) throw new Error('Unesite promo kod.');
      const verified = await promotionsApi.validate(code, cartItems, options);
      if (request !== validationRequest.current) return null;
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
        writeStoredValue('daja_welcome_promo_removed_for', null, 'necessary');
        setSuccessMsg(freeShipping ? 'Besplatna dostava je primenjena.' : 'Popust je primenjen.');
      }
      return verified;
    } catch (requestError) {
      if (request !== validationRequest.current) return null;
      setAppliedPromo(current => current?.code === code ? null : current);
      if (!isAuto) setError(requestError.message || 'Promo kod nije moguće primeniti.');
      return null;
    } finally {
      if (request === validationRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !hydrated || loading || !items.length) return;
    if (!appliedPromo && (!user?.email || !user.emailVerified ||
      readStoredValue('daja_welcome_promo_removed_for', 'necessary') === customerKey)) return;
    const code = appliedPromo?.code || 'DOBRODOSLI10';
    const attempt = JSON.stringify([customerKey, user?.emailVerified, code, items, eligibilityRevision]);
    if (autoAttempt.current === attempt) return;
    autoAttempt.current = attempt;
    void validateAndApply(code, total, items, user, true, { persist: true });
  }, [authReady, hydrated, loading, appliedPromo, user, customerKey, items, total, eligibilityRevision, validateAndApply]);

  const removePromo = () => {
    validationRequest.current += 1;
    setLoading(false);
    if (appliedPromo?.code === 'DOBRODOSLI10') writeStoredValue('daja_welcome_promo_removed_for', customerKey, 'necessary');
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
