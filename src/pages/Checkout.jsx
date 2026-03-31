import React, { useState, useEffect } from 'react';
import './Checkout.css';
import { useCart } from '../hooks/useCart.js';
import { useFormValidator } from '../hooks/useFormValidator.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFlash } from '../hooks/useFlash.js';
import { usePromo } from '../hooks/usePromo.js';
import { money } from '../utils/currency.js';
import { AnimatePresence } from 'framer-motion';

// --- FIREBASE IMPORTI ---
import { db } from '../services/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';

// Uvoz komponenti
import OrderConfirmationModal from '../components/checkout/OrderConfirmationModal';
import DeliveryForm from '../components/checkout/DeliveryForm';
import ShippingSection from '../components/checkout/ShippingSection';
import PaymentSection from '../components/checkout/PaymentSection';
import OrderSummary from '../components/checkout/OrderSummary';
import SEOHead from '../components/seo/SEOHead.jsx';

// [IZMENJENO]: Asinhrona funkcija za generisanje DAJA-xxxxxx ID-a sa proverom jedinstvenosti
const generateUniqueDisplayId = async () => {
  const maxRetries = 10;
  let attempts = 0;
  let uniqueIdFound = false;
  let displayId = '';

  while (attempts < maxRetries && !uniqueIdFound) {
    // Generiše nasumičan broj od 100000 do 999999 (tačno 6 cifara)
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    displayId = `DAJA-${randomNumber}`;

    attempts++;

    // Proveravamo u bazi da li već postoji porudžbina sa istim displayId
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('displayId', '==', displayId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      uniqueIdFound = true;
    } else {
      // Mali timeout da se izbegne prevelik pritisak na Firestore
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  if (!uniqueIdFound) {
    // Fallback: Ako smo potrošili sve pokušaje, vraćamo vremensku oznaku
    console.error(
      'Nije moguće generisati jedinstven DAJA-ID nakon 10 pokušaja.',
    );
    return `FALLBACK-${Date.now()}`;
  }

  return displayId;
};

export default function Checkout() {
  const { items, total, dispatch } = useCart();
  const { user, register } = useAuth();
  const { flash } = useFlash();

  // 2. KORISTIMO HOOK (On će automatski povući kod iz localStorage)
  const { appliedPromo, validateAndApply, removePromo } = usePromo();

  const [payMethod, setPayMethod] = useState('cod');
  const [shippingMethod, setShippingMethod] = useState('courier');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [submitCount, setSubmitCount] = useState(0);
  const [showRegPopover, setShowRegPopover] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [popoverDismissed, setPopoverDismissed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const {
    formData,
    errors,
    handleChange,
    handleBlur,
    validateAll,
    setFormData,
  } = useFormValidator({
    name: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });

  // 3. REKALKULACIJA SA POPUSTOM
  // Važno: Moramo osigurati da je iznos popusta tačan za trenutne artikle
  // (Hook vraća 'amount', ali za svaki slučaj možemo ponovo validirati na mount)

  useEffect(() => {
    // Kada se učita Checkout, ako imamo kod, proverimo ga ponovo "tiho"
    // da bismo bili sigurni da je validan za trenutni total i usera
    if (appliedPromo && appliedPromo.code) {
      validateAndApply(appliedPromo.code, total, items, user, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Samo na mount

  // Računanje cena
  const discountAmount = appliedPromo ? appliedPromo.amount : 0;
  const subtotalAfterDiscount = total - discountAmount;

  const FREE_SHIPPING_LIMIT = 8000;
  const COURIER_COST = 380;
  // Besplatna dostava se gleda na iznos POSLE popusta (obično je tako u prodaji)
  const isFreeShipping = subtotalAfterDiscount >= FREE_SHIPPING_LIMIT;

  const finalShipping =
    shippingMethod === 'pickup' ? 0 : isFreeShipping ? 0 : COURIER_COST;

  const finalTotal = subtotalAfterDiscount + finalShipping;

  const requiredForCourier = shippingMethod === 'courier';

  // --- AUTOFILL EFEKAT ---
  useEffect(() => {
    const fetchLastAddress = async () => {
      if (user && !formData.address && !formData.phone) {
        try {
          const q = query(
            collection(db, 'users', user.uid, 'addresses'),
            orderBy('createdAt', 'desc'),
            limit(1),
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const savedAddr = snapshot.docs[0].data();
            const parts = (savedAddr.name || '').trim().split(/\s+/);
            const fName = parts[0] || '';
            const lName = parts.slice(1).join(' ') || '';

            setFormData((prev) => ({
              ...prev,
              name: fName,
              surname: lName,
              email: user.email || prev.email,
              phone: savedAddr.phone || '',
              address: savedAddr.address || '',
              city: savedAddr.city || '',
              postalCode: savedAddr.zip || '',
            }));
          } else {
            setFormData((prev) => ({ ...prev, email: user.email || '' }));
          }
        } catch (error) {
          console.error(error);
        }
      }
    };
    fetchLastAddress();
  }, [user, setFormData]);

  useEffect(() => {
    if (shippingMethod === 'pickup') {
      setFormData((prev) => ({
        ...prev,
        address: '',
        city: '',
        postalCode: '',
      }));
    }
  }, [shippingMethod, setFormData]);

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
    return () => clearTimeout(t);
  }, [shippingMethod, createAccount, showRegPopover, errors]);

  const handleConfirmReg = async () => {
    if (!formData.name.trim() || !formData.surname.trim()) {
      flash('Greška', 'Unesite ime i prezime.', 'error');
      return;
    }
    if (!formData.email && !formData.phone) {
      flash('Greška', 'Unesite email.', 'error');
      return;
    }
    if (password.length < 6) {
      flash('Greška', 'Lozinka mora imati min. 6 karaktera', 'error');
      return;
    }
    setIsRegistering(true);
    try {
      await register({
        identity: formData.email || formData.phone,
        password: password,
        name: `${formData.name} ${formData.surname}`,
      });
      flash('Uspeh', 'Nalog kreiran.', 'success');
      setShowRegPopover(false);
      setPassword('');
    } catch (err) {
      flash('Greška', 'Došlo je do greške pri registraciji.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDismissReg = () => {
    setShowRegPopover(false);
    setPopoverDismissed(true);
    setPassword('');
  };

  const handlePlaceOrder = async () => {
    const fieldsToSkip =
      shippingMethod === 'pickup' ? ['address', 'city', 'postalCode'] : [];

    if (validateAll(fieldsToSkip)) {
      setIsProcessing(true);

      if (createAccount && !user && password) {
        try {
          await register({
            identity: formData.email,
            password: password,
            name: `${formData.name} ${formData.surname}`,
          });
        } catch (err) {
          console.warn('Auto-reg failed', err);
        }
      }

      // [IZMENA 2]: Poziv asinhronog generatora jedinstvenog ID-a
      const displayId = await generateUniqueDisplayId();

      // Koristimo Firestore-ov auto-generisani ID (docRef.id) i custom displayId za kupca
      const newOrder = {
        // [IZMENA 3]: Dodajemo displayId, orderId se više ne generiše
        displayId: displayId,
        customer: {
          ...formData,
          uid: user ? user.uid : 'guest',
        },
        items: items,
        subtotal: total, // Originalni total

        // 4. DODAJEMO PODATKE O POPUSTU U OBJEKAT PORUDŽBINE
        promoCode: appliedPromo ? appliedPromo.code : null,
        discountAmount: discountAmount,
        subtotalAfterDiscount: subtotalAfterDiscount,

        shippingCost: finalShipping,
        shippingMethod: shippingMethod,
        paymentMethod: payMethod,
        finalTotal: finalTotal,
        status: 'Na čekanju',
        isRead: false,
        date: new Date().toLocaleDateString('sr-RS'),
        createdAt: serverTimestamp(),
      };

      try {
        // addDoc generiše automatski document ID (koji nam je potreban za update statusa)
        const docRef = await addDoc(collection(db, 'orders'), newOrder);

        // 5. BRIŠEMO PROMO KOD I KORPU POSLE USPEŠNE KUPOVINE
        removePromo();

        // [KLJUČNA ISPRAVKA]: Ažuriramo orderData za modal sa displayId-em za 'id'
        // i originalnim docId-em za 'docId' (za internu upotrebu ako zatreba).
        const finalOrderData = { ...newOrder, id: displayId, docId: docRef.id };

        setOrderData(finalOrderData);
        setShowSuccessModal(true);
        dispatch({ type: 'CLEAR' });
      } catch (error) {
        console.error('Greška pri slanju porudžbine:', error);
        flash(
          'Greška',
          'Nismo uspeli da sačuvamo porudžbinu. Pokušajte ponovo.',
          'error',
        );
      } finally {
        setIsProcessing(false);
      }
    } else {
      setSubmitCount((prev) => prev + 1);
      setTimeout(() => {
        const firstError = document.querySelector('.input-error');
        if (firstError)
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const preventFormSubmit = (e) => e.preventDefault();
  const getInputClass = (n) => (errors[n] ? 'input-error' : '');

  return (
    <div className="container checkout-page">
      <SEOHead title="Plaćanje" noIndex={true} />
      <h1 className="checkout-title">Naplata i Isporuka</h1>
      <form className="checkout-layout" onSubmit={preventFormSubmit} noValidate>
        <div className="checkout-left">
          <DeliveryForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            submitCount={submitCount}
            user={user}
            getInputClass={getInputClass}
            shippingMethod={shippingMethod}
            requiredForCourier={requiredForCourier}
            showSuccessModal={showSuccessModal}
            password={password}
            setPassword={setPassword}
            showRegPopover={showRegPopover}
            setShowRegPopover={setShowRegPopover}
            handleDismissReg={handleDismissReg}
            handleConfirmReg={handleConfirmReg}
            isRegistering={isRegistering}
            popoverDismissed={popoverDismissed}
            createAccount={createAccount}
          />
          <ShippingSection
            shippingMethod={shippingMethod}
            setShippingMethod={setShippingMethod}
            isFreeShipping={isFreeShipping}
            COURIER_COST={COURIER_COST}
            money={money}
            finalShipping={finalShipping}
          />
          <PaymentSection payMethod={payMethod} setPayMethod={setPayMethod} />
        </div>

        <div className="checkout-right">
          <OrderSummary
            total={total}
            shippingMethod={shippingMethod}
            finalShipping={finalShipping}
            finalTotal={finalTotal}
            handlePlaceOrder={handlePlaceOrder}
            money={money}
            isLoading={isProcessing}
            // 6. PROSLEĐUJEMO PODATKE O POPUSTU U SUMMARY
            appliedPromo={appliedPromo}
            discountAmount={discountAmount}
          />
        </div>
      </form>

      <AnimatePresence>
        {showSuccessModal && orderData && (
          <OrderConfirmationModal
            order={orderData}
            money={money}
            onClose={() => setShowSuccessModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
