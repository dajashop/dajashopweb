import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShoppingBag } from 'lucide-react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useCart } from '../hooks/useCart.js';
import { useFormValidator } from '../hooks/useFormValidator.js';
import { useAuth } from '../hooks/useAuth.js';
import { usePromo } from '../hooks/usePromo.js';
import { CHECKOUT_UNAVAILABLE_MESSAGE, useCheckoutAvailability } from '../hooks/useCheckoutAvailability.js';
import { ordersApi } from '../services/dajaPlatform.js';
import { formatDeliveryAddress } from '../components/checkout/deliveryAddress.js';
import DeliveryForm from '../components/checkout/DeliveryForm';
import ShippingSection from '../components/checkout/ShippingSection';
import PaymentSection from '../components/checkout/PaymentSection';
import OrderSummary from '../components/checkout/OrderSummary';
import OrderConfirmation from '../components/checkout/OrderConfirmation.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import { commerceSeoConfig } from '../config/seo.js';
import { FORM_RULES } from '../data/validationRules.js';
import './Checkout.css';

const STEPS = ['Podaci', 'Isporuka', 'Plaćanje', 'Potvrda'];
const ADDRESS_FIELDS = ['address', 'city', 'postalCode'];
const CONTACT_FIELDS = ['name', 'surname', 'email', 'phone'];

export default function Checkout() {
  const { t, money, moneyRsd } = useStorefront();
  const { items, total, dispatch } = useCart();
  const { user, authReady, showAuth } = useAuth();
  const { appliedPromo, removePromo, loading: promoLoading } = usePromo({ user, authReady, items, total });
  const [step, setStep] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('courier');
  const [orderData, setOrderData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submissionInProgress = useRef(false);
  const stepHeading = useRef(null);
  const previousStep = useRef(0);
  const { availability, isChecking, checkAvailability, markUnavailable } = useCheckoutAvailability();
  const { formData, errors, handleChange, handleBlur, validateAll, setFormData } = useFormValidator({
    name: '', surname: '', email: '', phone: '', address: '', addressDetails: '', city: '', postalCode: '',
  });

  const discountAmount = appliedPromo ? appliedPromo.amount : 0;
  const subtotalAfterDiscount = Math.max(0, total - discountAmount);
  const isFreeShipping = appliedPromo?.freeShipping || subtotalAfterDiscount >= commerceSeoConfig.freeShippingThreshold;
  const finalShipping = shippingMethod === 'pickup' || isFreeShipping ? 0 : 380;
  const finalTotal = subtotalAfterDiscount + finalShipping;
  const payMethod = shippingMethod === 'pickup' ? 'pickup' : 'cod';
  const busy = isProcessing || promoLoading || !authReady;
  const actionDisabled = busy || (step === 2 && availability !== 'available');
  const actionLabel = isProcessing ? 'Slanje porudžbine…' : step === 0 ? 'Nastavi na isporuku' : step === 1 ? 'Nastavi na plaćanje' : availability === 'checking' ? 'Provera dostupnosti…' : availability === 'unavailable' ? 'Trenutno nije dostupno' : 'Potvrdi porudžbinu';

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    stepHeading.current?.focus({ preventScroll: true });
    stepHeading.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [step]);

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const input = document.querySelector('.checkout-left [aria-invalid="true"]');
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
  };

  const changeStep = (nextStep) => {
    if (busy || orderData || nextStep === step) return;
    if (nextStep < step) { setStep(nextStep); return; }
    const skip = step === 0 ? ADDRESS_FIELDS : shippingMethod === 'pickup' ? ADDRESS_FIELDS : [];
    if (!validateAll(skip)) {
      if (CONTACT_FIELDS.some(name => !FORM_RULES[name].regex.test(formData[name]))) setStep(0);
      focusFirstError();
      return;
    }
    setSubmitError('');
    setStep(Math.min(step + 1, nextStep));
  };

  const placeOrder = async () => {
    if (submissionInProgress.current || orderData || !items.length || actionDisabled) return;
    if (!validateAll(shippingMethod === 'pickup' ? ADDRESS_FIELDS : [])) {
      const contactError = CONTACT_FIELDS.some(name => !FORM_RULES[name].regex.test(formData[name]));
      setStep(contactError ? 0 : 1);
      focusFirstError();
      return;
    }
    submissionInProgress.current = true;
    setIsProcessing(true);
    setSubmitError('');
    try {
      if (!(await checkAvailability())) return;
      const { addressDetails, ...customerDetails } = formData;
      const newOrder = await ordersApi.create({
        customer: {
          ...customerDetails,
          address: shippingMethod === 'courier' ? formatDeliveryAddress(formData.address, addressDetails) : '',
          city: shippingMethod === 'courier' ? formData.city : '',
          postalCode: shippingMethod === 'courier' ? formData.postalCode : '',
          uid: user ? user.uid : 'guest',
        },
        items, subtotal: total, promoCode: appliedPromo?.code || null, discountAmount,
        subtotalAfterDiscount, shippingCost: finalShipping, shippingMethod,
        paymentMethod: payMethod, finalTotal,
      });
      // Preserve the server receipt independently of the cart cleared below.
      setOrderData(newOrder);
      setStep(3);
      removePromo();
      dispatch({ type: 'CLEAR' });
    } catch (error) {
      const unavailable = !error.status || error.status >= 500;
      if (unavailable) markUnavailable();
      setSubmitError(unavailable ? CHECKOUT_UNAVAILABLE_MESSAGE : error.status === 409 && items.some(item => item.engraving)
        ? 'Gravura je promenjena. Otvorite je u korpi i ponovo potvrdite dizajn.'
        : error.message || 'Nismo uspeli da sačuvamo porudžbinu. Pokušajte ponovo.');
    } finally {
      submissionInProgress.current = false;
      setIsProcessing(false);
    }
  };

  const continueCheckout = () => step < 2 ? changeStep(step + 1) : void placeOrder();
  const empty = !items.length && !orderData;

  return (
    <div className="container checkout-page checkout-flow">
      <SEOHead title={t('Plaćanje')} noIndex />
      <header className="checkout-heading">
        {!orderData && <Link className="checkout-back-link" to="/cart"><ArrowLeft size={16} />{t('Nazad u korpu')}</Link>}
        <div className="checkout-heading-row"><h1>{t(orderData ? 'Hvala na porudžbini' : 'Završite kupovinu')}</h1><span className="checkout-trust"><LockKeyhole size={16} />{t('Sigurna kupovina')}</span></div>
        <p>{t(orderData ? 'Sve je na jednom mestu. Vaša porudžbina je primljena.' : 'Vaši podaci, način isporuke i potvrda. Još samo nekoliko koraka.')}</p>
      </header>

      {empty ? <section className="checkout-empty"><ShoppingBag size={40} /><h2>{t('Korpa je prazna')}</h2><p>{t('Dodajte proizvode u korpu da biste nastavili kupovinu.')}</p><Link className="btn btn-primary" to="/catalog">{t('Pogledaj ponudu')}</Link></section> : <>
        <nav className="checkout-progress" aria-label={t('Koraci porudžbine')}>
          <ol>{STEPS.map((label, index) => <li key={label} className={[(index === step ? 'is-current' : ''), (index < step || orderData ? 'is-complete' : '')].join(' ')}>
            <button type="button" aria-current={index === step ? 'step' : undefined} disabled={busy || !!orderData || index > step} onClick={() => changeStep(index)}>
              <span className="checkout-progress-number">{index < step || orderData ? <Check size={17} aria-hidden="true" /> : index + 1}</span><span>{t(label)}</span>
            </button>
          </li>)}</ol>
        </nav>

        <div className="checkout-layout">
          <div className="checkout-left">
            <h2 ref={stepHeading} tabIndex={-1} className="checkout-step-heading">{t(['Vaši podaci', 'Kako želite da preuzmete porudžbinu?', 'Pregledajte i potvrdite', 'Porudžbina je uspešno primljena'][step])}</h2>
            {orderData ? <OrderConfirmation order={orderData} /> : <form id="checkout-form" noValidate onSubmit={event => { event.preventDefault(); continueCheckout(); }}>
              <fieldset disabled={isProcessing} className="checkout-fields">
                {step === 0 && <p className="checkout-step-intro">{user ? t('Proverite kontakt podatke za ovu porudžbinu.') : <>{t('Kupujete kao gost. Nalog možete sačuvati nakon poručivanja.')} <button type="button" onClick={() => showAuth('login')} className="checkout-text-button">{t('Već imate nalog? Prijavite se')}</button></>}</p>}
                {step === 1 && <ShippingSection shippingMethod={shippingMethod} setShippingMethod={setShippingMethod} isFreeShipping={isFreeShipping} COURIER_COST={380} money={money} />}
                <div hidden={step === 2 || (step === 1 && shippingMethod === 'pickup')}>
                  <DeliveryForm formData={formData} setFormData={setFormData} errors={errors} handleChange={handleChange} handleBlur={handleBlur} user={user} getInputClass={name => errors[name] ? 'input-error' : ''} requiredForCourier={shippingMethod === 'courier'} section={step === 0 ? 'contact' : 'address'} />
                </div>
                {step === 2 && <>
                  <PaymentSection shippingMethod={shippingMethod} />
                  <div className="checkout-review">
                    <section><div className="checkout-review-heading"><h3>{t('Kontakt podaci')}</h3><button type="button" className="checkout-text-button" onClick={() => changeStep(0)}>{t('Izmeni')}</button></div><p>{formData.name} {formData.surname}</p><p>{formData.email}</p><p>{formData.phone}</p></section>
                    <section><div className="checkout-review-heading"><h3>{t('Isporuka')}</h3><button type="button" className="checkout-text-button" onClick={() => changeStep(1)}>{t('Izmeni')}</button></div><p>{t(shippingMethod === 'pickup' ? 'Preuzimanje u prodavnici' : 'Isporuka kurirskom službom')}</p><p>{shippingMethod === 'pickup' ? t('Obrenovićeva bb, Podzemni prolaz, lokal C31, 18105 Niš') : formatDeliveryAddress(formData.address, formData.addressDetails)}</p>{shippingMethod !== 'pickup' && <p>{formData.postalCode} {formData.city}</p>}</section>
                  </div>
                  <p className="checkout-terms">{t('Potvrdom porudžbine prihvatate')} <Link to="/terms">{t('uslove kupovine')}</Link>. <Link to="/privacy">{t('Politika privatnosti')}</Link>.</p>
                </>}
                {submitError && <div className="checkout-inline-error" role="alert">{t(submitError)} <Link to="/cart">{t('Pregledaj korpu')}</Link></div>}
                <div className="checkout-step-actions">
                  {step > 0 && <button type="button" className="checkout-back-button" onClick={() => changeStep(step - 1)} disabled={busy}><ArrowLeft size={17} />{t('Nazad')}</button>}
                  <button type="submit" className="checkout-action" disabled={actionDisabled} aria-busy={isProcessing}>{t(actionLabel)}<ArrowRight size={18} /></button>
                </div>
              </fieldset>
            </form>}
          </div>
          <aside className="checkout-right" aria-label={t('Pregled porudžbine')}>
            <OrderSummary items={orderData?.items || items} total={orderData?.subtotal ?? total} finalShipping={orderData?.shippingCost ?? finalShipping} finalTotal={orderData?.finalTotal ?? finalTotal} money={money} availability={availability} isCheckingAvailability={isChecking} onCheckAvailability={checkAvailability} promoCode={orderData ? orderData.promoCode : appliedPromo?.code} discountAmount={orderData?.discountAmount ?? discountAmount} confirmed={!!orderData} />
          </aside>
        </div>
        {!orderData && <div className="checkout-mobile-action"><div><span>{t('Ukupno za plaćanje')}</span><strong>{moneyRsd(finalTotal)}</strong></div><button type="submit" form="checkout-form" className="checkout-action" disabled={actionDisabled} aria-busy={isProcessing}>{t(step === 2 ? actionLabel : 'Nastavi')}<ArrowRight size={18} /></button></div>}
      </>}
    </div>
  );
}
