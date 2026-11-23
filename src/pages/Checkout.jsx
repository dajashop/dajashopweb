import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { User, MapPin, Check, ArrowLeft, ArrowRight, Truck, ShoppingBag, ChevronDown, Banknote } from 'lucide-react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';
import { usePromo } from '../hooks/usePromo.js';
import { useFormValidator } from '../hooks/useFormValidator.js';
import { useCheckoutAvailability, CHECKOUT_UNAVAILABLE_MESSAGE } from '../hooks/useCheckoutAvailability.js';
import { ordersApi, customerApi } from '../services/dajaPlatform.js';
import { beginCheckoutAttempt, checkoutCartHash, forgetCheckoutAttempt, readCheckoutAttempt } from '../services/checkoutAttempt.js';
import { PASSWORD_RULE, FORM_RULES } from '../data/validationRules.js';
import { commerceSeoConfig } from '../config/seo.js';
import CartProductImage from '../components/CartProductImage.jsx';
import DeliveryForm from '../components/checkout/DeliveryForm';
import EngravingSummary from '../components/engraving/EngravingSummary';
import { formatDeliveryAddress, sameDeliveryAddress, savedAddressFields } from '../components/checkout/deliveryAddress.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import './Checkout.css';
import './CheckoutFlow.css';
const addressFields = ['address','city','postalCode'];
const fieldsToSkipForStep = target => target === 1 ? addressFields : [];
const noAddresses = [];
const normalizeEmail = email => (email || '').trim().toLowerCase();
export default function Checkout() {
 const { t, money, moneyRsd, displayCurrency } = useStorefront();
 const { items, total, dispatch } = useCart();
 const { user, authReady, register, showAuth } = useAuth();
 const promo = usePromo({user,authReady,items,total});
 const health = useCheckoutAvailability();
 const form = useFormValidator({name:'',surname:'',email:'',phone:'',address:'',addressDetails:'',city:'',postalCode:''});
 const location = useLocation();
 const navigate = useNavigate();
 const step = [0,1,2].includes(location.state?.checkoutStep) ? location.state.checkoutStep : 0;
 const setStep = n => {
   if (n < step) { navigate(n - step); return; }
   for (let i = step + 1; i <= n; i++) navigate(location.pathname + location.search, { state: { ...location.state, checkoutStep: i }, preventScrollReset: true });
 };
 const [order,setOrder]=useState(null), [note,setNote]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
 const [addressBook, setAddressBook] = useState(null);
 const [addressReload, setAddressReload] = useState(0);
 const [receiptOwner, setReceiptOwner] = useState(null);
 const [linked, setLinked] = useState(false);
 const [password, setPassword] = useState('');
 const [registered, setRegistered] = useState(false);
 const [verifyEmail, setVerifyEmail] = useState(false);
 const [saveBusy, setSaveBusy] = useState(false);
 const [saveNotice, setSaveNotice] = useState(null);
 const [saved, setSaved] = useState(false);
 const [dismissed, setDismissed] = useState(false);
 const [submitCount,setSubmitCount]=useState(0);
 const lock=useRef(false), saveLock=useRef(false), touched=useRef(false), auto=useRef(false), heading=useRef(null);
 const reduce=useReducedMotion();
 const accountId = user?.id || user?.uid;
 const checkoutActive = useRef(true);
 const checkoutContext = useRef({ accountId, items, clearPromo: promo.removePromo });
 checkoutContext.current = { accountId, items, clearPromo: promo.removePromo };
 useEffect(() => {
   checkoutActive.current = true;
   return () => { checkoutActive.current = false; };
 }, []);
 const currentAddressBook = accountId && addressBook?.accountId === accountId && addressBook.reload === addressReload ? addressBook : null;
 const savedAddressChoices = currentAddressBook?.addresses ?? noAddresses;
 useEffect(() => {
   if (!accountId) {
     setAddressBook(null);
     return undefined;
   }
   let cancelled = false;
   customerApi.listAddresses().then(addresses => {
     if (!cancelled) setAddressBook({ accountId, reload: addressReload, addresses });
   }).catch(() => {
     if (!cancelled) setAddressBook({ accountId, reload: addressReload, error: true });
   });
   return () => { cancelled = true; };
 }, [accountId, addressReload]);

 useEffect(() => {
   // The history entry survives a reload, but the form draft does not.
   if (step > 0 && !order && !form.formData.name && !form.formData.email) {
     navigate(location.pathname + location.search, { replace: true, state: { ...location.state, checkoutStep: 0 } });
   }
 }, [step, order, form.formData.name, form.formData.email, location.pathname, location.search, location.state, navigate]);
 useEffect(() => {
   heading.current?.focus({ preventScroll: true });
 }, [step]);
 const discount=promo.appliedPromo?.amount || 0;
 const shipping=promo.appliedPromo?.freeShipping || total-discount>=commerceSeoConfig.freeShippingThreshold ? 0 : 380;
 const amount=order?.finalTotal ?? total-discount+shipping;
 const address=formatDeliveryAddress(form.formData.address,form.formData.addressDetails);
 const selectedAddress = savedAddressChoices.find(savedAddress =>
   sameDeliveryAddress(savedAddress, { address, city: form.formData.city, zip: form.formData.postalCode })
 );
 useEffect(() => {
   if (!order && step < 2 && selectedAddress && !auto.current && !touched.current && form.isValid()) {
     auto.current = true;
     setStep(2);
   }
 }, [order, step, selectedAddress, form.formData]);
 const go=n=>{touched.current=true;setError('');setStep(n);requestAnimationFrame(()=>{heading.current?.focus();if (heading.current?.getBoundingClientRect().top < 0) heading.current.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});});};
 const onAddressSaved = savedAddress => setAddressBook(current => current?.accountId === accountId
   ? { ...current, addresses: [savedAddress, ...(current.addresses ?? noAddresses)] }
   : current);
 const chooseDeliveryAddress = event => {
   const id = event.target.value;
   const choice = savedAddressChoices.find(savedAddress => String(savedAddress.id) === id);
   if (!choice && id !== 'new') return;

   touched.current = true;
   const deliveryFields = savedAddressFields(choice);
   form.setFormData(previous => ({ ...previous, ...deliveryFields }));
   if (addressFields.some(key => !FORM_RULES[key].regex.test(deliveryFields[key]))) go(1);
 };
 const navigateToStep = target => {
   if (lock.current || target === step) return;
   if (target > step && !form.validateAll(fieldsToSkipForStep(target))) {
     setSubmitCount(v=>v+1);
     requestAnimationFrame(()=>document.querySelector('.checkout-flow .input-error input')?.focus());
     return;
   }
   go(target);
 };
 async function acceptOrder(result, attempt, owner, active, cartHash = attempt?.cartHash) {
   const latest = checkoutContext.current;
   const currentHash = attempt && await checkoutCartHash(latest.items, attempt.proof).catch(() => null);
   const clearCart = !attempt || (cartHash && currentHash === cartHash);
   if (!active() || checkoutContext.current.accountId !== owner) return;
   forgetCheckoutAttempt(owner, attempt);
   setReceiptOwner(owner);
   setError('');
   setOrder(result);
   if (clearCart && checkoutContext.current.items === latest.items) {
     checkoutContext.current.clearPromo();
     dispatch({type:'CLEAR'});
   }
   requestAnimationFrame(() => heading.current?.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'}));
 }
 useEffect(() => {
   if (!authReady || order) return undefined;
   const attempt = readCheckoutAttempt(accountId);
   if (!attempt) return undefined;
   const controller = new AbortController();
   let checking = false;
   const active = () => !controller.signal.aborted && !lock.current &&
     readCheckoutAttempt(accountId)?.key === attempt.key;
   async function recover() {
     if (checking || !active()) return;
     checking = true;
     try {
       const result = await ordersApi.recoverAttempt(attempt, controller.signal);
       if (result && active()) await acceptOrder(result, attempt, accountId, active);
     } catch {
       // Keep the attempt available for the next explicit check.
     } finally {
       checking = false;
     }
   }
   void recover();
   window.addEventListener('online', recover);
   return () => {
     controller.abort();
     window.removeEventListener('online', recover);
   };
 }, [authReady, accountId, order, dispatch, reduce]);

 async function next() {
   if (lock.current) return;
   if (step < 2) { navigateToStep(step + 1); return; }
   if (!form.validateAll()) { go(form.isValid(addressFields) ? 1 : 0); return; }
   lock.current = true;
   setBusy(true);
   setError('');
   let attempt = readCheckoutAttempt(accountId);
   const isCurrent = () => checkoutActive.current && checkoutContext.current.accountId === accountId;
   try {
     if (attempt) {
       const receipt = await ordersApi.recoverAttempt(attempt);
       if (!isCurrent()) return;
       if (receipt) {
         await acceptOrder(receipt, attempt, accountId, isCurrent);
         return;
       }
     }
     if (!items.length) throw new Error('Vaša korpa je prazna.');
     if (!(await health.checkAvailability())) throw new Error(CHECKOUT_UNAVAILABLE_MESSAGE);
     if (!isCurrent()) return;
     const payload = {
       customer: { ...form.formData, address, uid: user?.uid || 'guest' },
       items, confirmCatalogPrice: true, subtotal: total, discountAmount: discount, subtotalAfterDiscount: total - discount,
       shippingCost: shipping, finalTotal: amount, promoCode: promo.appliedPromo?.code || null,
       shippingMethod: 'courier', paymentMethod: 'cod', note,
     };
     if (!attempt && !health.supportsCheckoutAttempts()) {
       const result = await ordersApi.create(payload);
       await acceptOrder(result, null, accountId, isCurrent);
       return;
     }
     let submittedCartHash;
     if (attempt) {
       submittedCartHash = await checkoutCartHash(items, attempt.proof);
     } else {
       attempt = await beginCheckoutAttempt(accountId, items);
       submittedCartHash = attempt.cartHash;
     }
     if (!isCurrent()) return;
     let result;
     try {
       result = await ordersApi.createAttempt(payload, attempt);
     } catch (error) {
       if (error.status && error.status < 500 && error.code !== 'CHECKOUT_ATTEMPT_CONFLICT') throw error;
       const receipt = await ordersApi.recoverAttempt(attempt).catch(() => null);
       if (!receipt) throw new Error('Prijem porudžbine još nije potvrđen. Pokušajte ponovo da proverite isti zahtev.');
       await acceptOrder(receipt, attempt, accountId, isCurrent);
       return;
     }
     await acceptOrder(result, attempt, accountId, isCurrent, submittedCartHash);
   } catch (error) {
     if (isCurrent()) {
       const prices = error.code === 'CHECKOUT_PRICE_CHANGED' ? error.details?.prices : null;
       if (Array.isArray(prices) && prices.length === items.length && prices.every(price => typeof price === 'number' && price >= 0) &&
           checkoutContext.current.items === items) {
         dispatch({ type: 'REPRICE', prices, items });
       }
       setError(t(error.message) || t(CHECKOUT_UNAVAILABLE_MESSAGE));
     }
   } finally {
     lock.current = false;
     setBusy(false);
   }
 }
 const receiptCustomer = order?.customer;
 const receiptEmail = normalizeEmail(receiptCustomer?.email);
 const receiptAddress = receiptCustomer && {
   name: [receiptCustomer.name, receiptCustomer.surname].filter(Boolean).join(' '),
   phone: receiptCustomer.phone,
   address: receiptCustomer.address,
   city: receiptCustomer.city,
   zip: receiptCustomer.postalCode,
 };
 const guestOrder = Boolean(order?.claimToken);
 const matchesOrderEmail = Boolean(accountId && receiptEmail && receiptEmail === normalizeEmail(user?.email));
 const ownsOrder = Boolean(order && accountId && (guestOrder ? linked && matchesOrderEmail : receiptOwner === accountId));
 const offerRegistration = guestOrder && authReady && !accountId && !registered;
 const offerLink = guestOrder && !linked && matchesOrderEmail;
 const offerAddress = ownsOrder && receiptAddress && currentAddressBook?.addresses && !saved &&
   !savedAddressChoices.some(entry => sameDeliveryAddress(entry, receiptAddress));
 const receiptAction = offerRegistration ? 'register' : offerLink ? 'link' : offerAddress ? 'address' : null;
 const useDifferentEmail = guestOrder && accountId && !matchesOrderEmail && !linked;
 const canRetryAddresses = ownsOrder && !saved && currentAddressBook?.error;
 const receiptActionLabels = {
   register: 'Sačuvaj nalog i adresu', link: 'Poveži porudžbinu sa nalogom', address: 'Sačuvaj adresu',
 };

 async function save() {
   if (saveLock.current || !receiptAction || !receiptAddress) return;
   saveLock.current = true;
   setSaveBusy(true);
   setSaveNotice(null);

   try {
     if (receiptAction === 'register') {
       if (!PASSWORD_RULE.regex.test(password)) throw new Error(t(PASSWORD_RULE.message));
       const result = await register({ identity: receiptEmail, password, name: receiptAddress.name });
       setRegistered(true);
       setVerifyEmail(result === 'email-verify');
       setPassword('');
     }
     if (receiptAction === 'register' || receiptAction === 'link') {
       await ordersApi.claim(order.docId, order.claimToken);
       setLinked(true);
       setSaveNotice({ text: 'Porudžbina je povezana sa nalogom.' });
     }
     if (receiptAction !== 'link') {
       const existing = await customerApi.listAddresses();
       if (!existing.some(entry => sameDeliveryAddress(entry, receiptAddress))) {
         await customerApi.addAddress({ label: 'Kuća', icon: 'home', ...receiptAddress, isDefault: existing.length === 0 });
       }
       setSaved(true);
       setSaveNotice({ text: 'Adresa je sačuvana za sledeću kupovinu.' });
     }
   } catch (e) {
     setSaveNotice({ text: e.message || 'Čuvanje nije uspelo. Pokušajte ponovo.', error: true });
   } finally {
     saveLock.current = false;
     setSaveBusy(false);
   }
 }
 const price=value=><>{moneyRsd(value)}{displayCurrency!=='RSD'&&<small> ({money(value)})</small>}</>;
 const summaryTitle = t('Pregled porudžbine');
 const summary = <>
  <div className="flow-products">
   {(order?.items || items).map((item, i) => (
    <div className="flow-product" key={item.lineId || `${item.id}-${i}`}>
     <CartProductImage item={item} className="flow-product-image" showPlaceholder />
     <div>
      <strong>{item.name}</strong>
      <p>{item.qty || item.quantity || 1} × {price(item.price)}</p>
      {item.engraving && <EngravingSummary item={item} />}
     </div>
    </div>
   ))}
  </div>
  <dl>
   <div><dt>{t('Međuzbir')}</dt><dd>{price(order?.subtotal ?? total)}</dd></div>
   {(order?.discountAmount ?? discount) > 0 && (
    <div><dt>{t('Popust')}</dt><dd>−{price(order?.discountAmount ?? discount)}</dd></div>
   )}
   <div><dt>{t('Isporuka')}</dt><dd>{(order?.shippingCost ?? shipping) === 0 ? t('Besplatna') : price(order?.shippingCost ?? shipping)}</dd></div>
   <div className="flow-total"><dt>{t('Ukupno')}</dt><dd>{price(amount)}</dd></div>
  </dl>
  <p className="flow-muted">{t('Plaćanje se vrši u dinarima (RSD).')}</p>
 </>;
 const actionLabel = ['Nastavi na adresu', 'Nastavi na potvrdu', 'Potvrdi porudžbinu'][step];
 const action = (
  <button type="button" className="flow-primary" disabled={!authReady || busy || promo.loading || !items.length} onClick={next}>
   {t(busy ? 'Slanje porudžbine…' : actionLabel)}
   <ArrowRight size={18} aria-hidden="true" />
  </button>
 );
 return <div className={`checkout-page checkout-flow${!order && step === 2 ? ' flow-confirmation' : ''}`}><SEOHead title={t('Plaćanje')} noIndex/><div className="flow-layout"><div className="flow-left"><div ref={heading} tabIndex={-1} className="flow-heading">
 <div className={order ? 'flow-success' : undefined}>
  {!order && <h1>{t('Završite kupovinu')}</h1>}
  <nav className={`flow-progress ${order ? 'flow-progress--complete' : ''}`} aria-label={t('Koraci kupovine')}>
   <div className="flow-track"><motion.div animate={{width: order ? '100%' : `${step * 50}%`}} transition={{duration: reduce ? 0 : .25}}/></div>
   {[User,MapPin,Check].map((Icon,i) => (
    <button type="button" key={i} aria-current={!order && step===i?'step':undefined} aria-hidden={order ? true : undefined}
     disabled={Boolean(order) || busy || (i > step && !form.isValid(fieldsToSkipForStep(i)))} onClick={()=>navigateToStep(i)} className={i<=step?'active':''}>
     <span>{order ? i===1 && <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       initial={{pathLength: reduce ? 1 : 0}} animate={{pathLength: 1}} transition={{delay:reduce?0:.42,duration:reduce?0:.24}}/>
     </svg> : i<step?<Check size={20}/>:<Icon size={20}/>}</span>
     <small>{t(['Podaci','Adresa','Potvrda'][i])}</small>
    </button>
   ))}
  </nav>
  {order && <div role="status" className="flow-success-copy">
   <h1>{t('Porudžbina je uspešno primljena')}</h1>
   <strong className="flow-order-number">#{order.displayId || order.id}</strong>
   {order.customer?.email && <p>{t('Potvrda porudžbine stići će na')} <strong>{order.customer.email}</strong></p>}
  </div>}
 </div>
 </div>
 {!order && <details className="flow-mobile-summary">
  <summary>
   <span className="flow-summary-icon"><ShoppingBag size={19} aria-hidden="true" /></span>
   <span>{summaryTitle}</span>
   <strong>{price(amount)}</strong>
   <ChevronDown className="flow-summary-chevron" size={18} aria-hidden="true" />
  </summary>
  <div className="flow-mobile-summary-body">{summary}</div>
 </details>}
 {!order ? <>
 <form autoComplete="off" onSubmit={event => event.preventDefault()} className={`flow-form flow-step-${step}`} onChangeCapture={() => { touched.current = true; }}>
  <DeliveryForm {...form} user={user} step={step} shippingMethod="courier" requiredForCourier
   getInputClass={n => form.errors[n] ? 'input-error' : ''} submitCount={submitCount}
   savedAddresses={savedAddressChoices} onAddressSaved={onAddressSaved}
   setShowRegPopover={() => {}} popoverDismissed showRegPopover={false} showSuccessModal={false} />
 </form>
 {step === 1 && <details className="flow-note">
  <summary>{t('Dodaj napomenu kuriru')}</summary>
  <label htmlFor="courier-note">{t('Napomena kuriru (opciono)')}</label>
  <textarea id="courier-note" value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder={t('Na primer: interfon ne radi, pozovite me.')} />
 </details>}
 {step === 2 && <section className="flow-review flow-review-confirm" aria-labelledby="flow-review-title">
  <div className="flow-review-title"><Check size={20} aria-hidden="true" /><h2 id="flow-review-title">{t('Proverite podatke')}</h2></div>
  <div className="flow-review-group">
   <div className="flow-review-group-heading">
    <h3>{t('Kontakt')}</h3>
    <button type="button" onClick={() => go(0)}>{t('Izmeni podatke')}</button>
   </div>
   <p><strong>{form.formData.name} {form.formData.surname}</strong><br />{form.formData.email}<br />{form.formData.phone}</p>
  </div>
  <div className="flow-review-group">
   <div className="flow-review-group-heading">
    {savedAddressChoices.length > 0
     ? <label htmlFor="review-delivery-address">{t('Adresa za dostavu')}</label>
     : <h3>{t('Adresa za dostavu')}</h3>}
    <button type="button" onClick={() => go(1)}>{t('Izmeni adresu')}</button>
   </div>
   <p>{address}<br />{form.formData.postalCode} {form.formData.city}</p>
   {savedAddressChoices.length > 0 && <select id="review-delivery-address" value={selectedAddress?.id ?? ''} onChange={chooseDeliveryAddress} disabled={busy}>
    <option value="" disabled>{t('Trenutno uneta adresa')}</option>
    {savedAddressChoices.map(savedAddress => (
     <option key={savedAddress.id} value={savedAddress.id}>
      {[savedAddress.label, savedAddress.address, [savedAddress.zip, savedAddress.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
     </option>
    ))}
    <option value="new">{t('Unesi novu adresu')}</option>
   </select>}
  </div>
  <div className="flow-review-group flow-review-methods">
   <p><Truck size={18} aria-hidden="true" />{t('Isporuka kurirskom službom')}</p>
   <p><Banknote size={18} aria-hidden="true" />{t('Plaćanje pouzećem')}</p>
   {note && <p className="flow-muted">{note}</p>}
  </div>
 </section>}
 {error && <p role="alert" className="flow-error">{error}</p>}
 {step > 0 && <button className="flow-back" type="button" onClick={() => go(step - 1)}><ArrowLeft size={16} />{t('Nazad')}</button>}
 <div className="flow-mobile-action"><div><small>{t('Ukupno')}</small><strong>{price(amount)}</strong></div>{action}</div>
 </> : <><section className="flow-review flow-receipt">
  <h2>{t('Podaci za isporuku')}</h2>
  <div className="flow-receipt-grid">
   <div><MapPin size={20}/><div><strong>{order.customer?.name} {order.customer?.surname}</strong><p>{order.customer?.address}<br/>{order.customer?.postalCode} {order.customer?.city}</p></div></div>
   <div><Truck size={20}/><div><strong>{t('Isporuka kurirskom službom')}</strong><p>{t('Plaćanje pouzećem')}</p>{order.note&&<p>{order.note}</p>}</div></div>
  </div>
 </section>
 {!dismissed && (receiptAction || saveBusy || useDifferentEmail || canRetryAddresses || saveNotice || verifyEmail) && (
  <section className="flow-save">
   {receiptAction && <>
    <h2>{t(receiptAction === 'link' ? 'Porudžbina na vašem nalogu' : 'Sačuvaj podatke za sledeću kupovinu')}</h2>
    {receiptAction === 'register' && <>
     <label htmlFor="save-password">{t('Lozinka')}</label>
     <input id="save-password" type="password" autoComplete="new-password" placeholder={t('Najmanje 8 karaktera, veliko slovo i broj')}
      value={password} onChange={e => setPassword(e.target.value)} disabled={saveBusy} />
    </>}
   </>}
   {(receiptAction || saveBusy) && <button type="button" className="flow-primary" disabled={saveBusy} onClick={save}>
    {t(saveBusy ? 'Čuvanje…' : receiptActionLabels[receiptAction])}
   </button>}
   {receiptAction === 'register' && <button type="button" disabled={saveBusy} onClick={() => showAuth('login')}>
    {t('Već imate nalog? Prijavite se')}
   </button>}
   {useDifferentEmail && <p>{t('Za povezivanje porudžbine prijavite se sa email adresom iz porudžbine.')}</p>}
   {canRetryAddresses && <>
    <p>{t('Nismo mogli da učitamo sačuvane adrese.')}</p>
    <button type="button" onClick={() => setAddressReload(value => value + 1)}>{t('Pokušaj ponovo')}</button>
   </>}
   {(receiptAction || canRetryAddresses || useDifferentEmail) && <button type="button" disabled={saveBusy} onClick={() => setDismissed(true)}>{t('Preskoči')}</button>}
   {saveNotice && <p className="flow-save-notice" role={saveNotice.error ? 'alert' : 'status'}>{t(saveNotice.text)}</p>}
   {verifyEmail && <p className="flow-save-notice">{t('Proverite email za potvrdu naloga.')}</p>}
  </section>
 )}
 <div className="flow-mobile-summary"><h2>{summaryTitle}</h2>{summary}</div><div className="flow-receipt-actions">
  {ownsOrder && <Link to="/orders"><Truck size={18}/>{t('Moje porudžbine')}</Link>}
  <Link to="/catalog">{t('Nastavi kupovinu')}<ArrowRight size={18}/></Link>
 </div></>}
 </div><aside className="flow-summary"><h2>{summaryTitle}</h2>{summary}{!order&&action}</aside></div></div>;
}
