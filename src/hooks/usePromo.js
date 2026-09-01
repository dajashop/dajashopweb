import { useState, useEffect, useRef } from 'react';
import { PROMO_CODES } from '../data/promoCodes';
import { ordersApi, promotionsApi } from '../services/dajaPlatform';
import { useConsent } from '../context/ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

export function usePromo() {
  const { hasDecision } = useConsent();
  // 1. INICIJALIZACIJA: Proveravamo da li već postoji sačuvan kod u localStorage
  const [appliedPromo, setAppliedPromo] = useState(() => {
    try {
      const saved = readStoredValue('daja_active_promo', 'necessary');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
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

  // 2. EFEKAT: Kad god se promo promeni, sačuvaj ga (ili obriši) u localStorage
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
    cartTotal,
    cartItems,
    user,
    isAuto = false
  ) => {
    setLoading(true);
    if (!isAuto) {
      setError(null);
      setSuccessMsg(null);
    }

    try {
      const normalizedCode = inputCode.trim().toUpperCase();
      const promo = PROMO_CODES.find((p) => p.code === normalizedCode);

      // --- VALIDACIJE (Iste kao pre) ---
      if (!promo) throw new Error('Kod nije pronađen.');

      const today = new Date();
      if (today > new Date(promo.expiresAt))
        throw new Error('Ovaj kod je istekao.');

      if (cartTotal < promo.minOrderValue) {
        throw new Error(
          `Kod važi samo za porudžbine preko ${promo.minOrderValue} RSD.`
        );
      }

      if (promo.rules) {
        if (promo.rules.requiresLogin && !user)
          throw new Error('Morate biti ulogovani da biste koristili ovaj kod.');

        if (promo.rules.firstOrderOnly && user) {
          const previousOrders = await ordersApi.mine();
          if (previousOrders.length) {
            throw new Error('Ovaj kod vazi samo za Vasu prvu kupovinu.');
          }
        }

        if (promo.rules.requiresNewsletter) {
          const verified = await promotionsApi.validate(promo.code, cartTotal);
          const verifiedAmount = Number(verified?.discountAmount ?? verified?.amount ?? 0);
          if (!verifiedAmount) throw new Error('Newsletter popust nije dostupan za ovu kupovinu.');
          const promoData = {
            code: verified.code || promo.code,
            percent: promo.discountPercent,
            amount: verifiedAmount,
            isBrandSpecific: false,
          };
          if (!isAuto) promoPersistence.current = true;
          setAppliedPromo(promoData);
          if (!isAuto) setSuccessMsg('Newsletter popust je primenjen.');
          return;
        }
      }

      // --- OBRAČUN ---
      let discountAmount = 0;
      if (promo.validBrands && promo.validBrands.length > 0) {
        const eligibleItems = cartItems.filter((item) =>
          promo.validBrands
            .map((b) => b.toUpperCase())
            .includes(item.brand.toUpperCase())
        );
        if (eligibleItems.length === 0)
          throw new Error(
            `Kod važi samo za brendove: ${promo.validBrands.join(', ')}.`
          );

        const eligibleTotal = eligibleItems.reduce(
          (acc, item) => acc + item.price * item.qty,
          0
        );
        discountAmount = eligibleTotal * promo.discountPercent;
      } else {
        discountAmount = cartTotal * promo.discountPercent;
      }

      // --- SETOVANJE STANJA ---
      const promoData = {
        code: promo.code,
        percent: promo.discountPercent,
        amount: discountAmount,
        isBrandSpecific: promo.validBrands.length > 0,
      };

      if (!isAuto) promoPersistence.current = true;
      setAppliedPromo(promoData);

      if (!isAuto) {
        setSuccessMsg(
          `Uspešno! ${
            promo.validBrands.length > 0 ? 'Popust na brend' : 'Popust'
          } primenjen.`
        );
      }
    } catch (err) {
      if (!isAuto) setError(err.message);
      // Ako je greška, ne brišemo odmah postojeći promo osim ako korisnik nije eksplicitno probao novi
      // Ali ovde ćemo ga resetovati da sprečimo nevalidne kodove
      // setAppliedPromo(null); <--- Opciono, zavisno od UX želje
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

  // NOVO: Funkcija za re-kalkulaciju (ako se promeni total u korpi, a kod je ostao isti)
  const refreshPromo = (currentTotal, currentItems) => {
    if (!appliedPromo) return;
    // Jednostavna rekalkulacija iznosa bez ponovnog API poziva (za brzinu)
    // Za pravu sigurnost, ovde bi ponovo zvali validateAndApply
    // Ali za UX, samo ažuriramo iznos:

    // ... Logika za ponovni obračun iznosa na osnovu novog totala ...
    // Zbog jednostavnosti, ovde samo vraćamo funkciju, ali idealno bi bilo
    // ponovo pozvati validateAndApply sa 'isAuto=true' u Checkout-u.
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
