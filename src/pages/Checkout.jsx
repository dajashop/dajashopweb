import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { User, MapPin, Check, ArrowLeft, ArrowRight, Truck } from 'lucide-react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';
import { usePromo } from '../hooks/usePromo.js';
import { useFormValidator } from '../hooks/useFormValidator.js';
import { useCheckoutAvailability, CHECKOUT_UNAVAILABLE_MESSAGE } from '../hooks/useCheckoutAvailability.js';
import { ordersApi, customerApi } from '../services/dajaPlatform.js';
import { PASSWORD_RULE, FORM_RULES } from '../data/validationRules.js';
import { commerceSeoConfig } from '../config/seo.js';
import DeliveryForm from '../components/checkout/DeliveryForm';
import EngravingSummary from '../components/engraving/EngravingSummary';
import { formatDeliveryAddress } from '../components/checkout/deliveryAddress.js';
import { postalCodeForCity } from '../data/serbiaPostalCodes.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import './Checkout.css';
import './CheckoutFlow.css';
const addressFields = ['address','city','postalCode'];
const fieldsToSkipForStep = target => target === 1 ? addressFields : [];
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
 const [addresses,setAddresses]=useState(null), [password,setPassword]=useState(''), [saveBusy,setSaveBusy]=useState(false), [saveMessage,setSaveMessage]=useState(''), [saved,setSaved]=useState(false), [dismissed,setDismissed]=useState(false);
 const [submitCount,setSubmitCount]=useState(0);
 const lock=useRef(false), touched=useRef(false), auto=useRef(false), linked=useRef(false), heading=useRef(null);
 const reduce=useReducedMotion();
 useEffect(() => {
   // A refreshed deep step has no form draft; restart safely without a submit.
   if (step > 0 && !form.formData.name && !form.formData.email && !user) {
     navigate(location.pathname + location.search, { replace: true, state: { ...location.state, checkoutStep: 0 } });
   }
 }, [authReady]);
 useEffect(() => {
   heading.current?.focus({ preventScroll: true });
 }, [step]);
 const discount=promo.appliedPromo?.amount || 0;
 const shipping=promo.appliedPromo?.freeShipping || total-discount>=commerceSeoConfig.freeShippingThreshold ? 0 : 380;
 const amount=order?.finalTotal ?? total-discount+shipping;
 const address=formatDeliveryAddress(form.formData.address,form.formData.addressDetails);
 const sameAddress=a=>a.address?.trim().toLowerCase()===address.trim().toLowerCase() && a.city?.trim().toLowerCase()===form.formData.city.trim().toLowerCase() && a.zip===form.formData.postalCode && a.name===`${form.formData.name} ${form.formData.surname}`.trim() && a.phone===form.formData.phone;
 useEffect(()=>{ if(user && addresses?.length && !auto.current && !touched.current && form.isValid()){auto.current=true;setStep(2);} },[user,addresses,form.formData]);
 const go=n=>{touched.current=true;setError('');setStep(n);requestAnimationFrame(()=>{heading.current?.focus();if (heading.current?.getBoundingClientRect().top < 0) heading.current.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});});};
 const savedAddressChoices = user ? addresses ?? [] : [];
 const selectedAddress = savedAddressChoices.find(savedAddress =>
   savedAddress.address === address && savedAddress.city === form.formData.city &&
   (savedAddress.zip || postalCodeForCity(savedAddress.city)) === form.formData.postalCode
 );
 const chooseDeliveryAddress = event => {
   const id = event.target.value;
   const choice = savedAddressChoices.find(savedAddress => String(savedAddress.id) === id);
   if (!choice && id !== 'new') return;

   touched.current = true;
   const deliveryFields = {
     address: choice?.address || '',
     addressDetails: '',
     city: choice?.city || '',
     postalCode: choice?.zip || postalCodeForCity(choice?.city),
   };
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
 async function next(){
  if(lock.current)return;
  if(step<2){navigateToStep(step+1);return;}
  if(!form.validateAll()){go(0);return;}
  lock.current=true;setBusy(true);setError('');
  try {
   if(!items.length)throw new Error(t('Vaša korpa je prazna.'));
   if(!(await health.checkAvailability()))throw new Error(t(CHECKOUT_UNAVAILABLE_MESSAGE));
   const result=await ordersApi.create({customer:{...form.formData,address,uid:user?.uid||'guest'},items,subtotal:total,discountAmount:discount,subtotalAfterDiscount:total-discount,shippingCost:shipping,finalTotal:amount,promoCode:promo.appliedPromo?.code||null,shippingMethod:'courier',paymentMethod:'cod',note});
   setOrder(result);promo.removePromo();dispatch({type:'CLEAR'});requestAnimationFrame(()=>heading.current?.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'}));
  }catch(e){setError(t(e.message)||t(CHECKOUT_UNAVAILABLE_MESSAGE));}finally{lock.current=false;setBusy(false);}
 }
 async function save(){
  if(saveBusy)return;setSaveBusy(true);setSaveMessage('');
  try{
   if(!user){if(!PASSWORD_RULE.regex.test(password))throw new Error(t(PASSWORD_RULE.message));await register({identity:form.formData.email,password,name:`${form.formData.name} ${form.formData.surname}`});setPassword('');}
   if(order.claimToken&&!linked.current){await ordersApi.claim(order.docId,order.claimToken);linked.current=true;}
   const existing=await customerApi.listAddresses();
   if(!existing.some(sameAddress))await customerApi.addAddress({label:'Kuća',icon:'home',name:`${form.formData.name} ${form.formData.surname}`,phone:form.formData.phone,address,city:form.formData.city,zip:form.formData.postalCode,isDefault:existing.length===0});
   setSaved(true);setSaveMessage(t('Podaci su sačuvani. Proverite email za potvrdu naloga.'));
  }catch(e){setSaveMessage(t(e.message)||t('Čuvanje nije uspelo. Pokušajte ponovo.'));}finally{setSaveBusy(false);}
 }
 const price=value=><>{moneyRsd(value)}{displayCurrency!=='RSD'&&<small> ({money(value)})</small>}</>;
 const summary=<><h2>{t('Pregled porudžbine')}</h2><div className="flow-products">{(order?.items||items).map((item,i)=><div className="flow-product" key={item.lineId||`${item.id}-${i}`}><img src={item.image||item.thumb} alt=""/><div><strong>{item.name}</strong><p>{item.qty||item.quantity||1} × {price(item.price)}</p>{item.engraving&&<EngravingSummary item={item}/>}</div></div>)}</div><dl><div><dt>{t('Međuzbir')}</dt><dd>{price(order?.subtotal??total)}</dd></div>{(order?.discountAmount??discount)>0&&<div><dt>{t('Popust')}</dt><dd>−{price(order?.discountAmount??discount)}</dd></div>}<div><dt>{t('Isporuka')}</dt><dd>{(order?.shippingCost??shipping)===0?t('Besplatna'):price(order?.shippingCost??shipping)}</dd></div><div className="flow-total"><dt>{t('Ukupno')}</dt><dd>{price(amount)}</dd></div></dl><p className="flow-muted">{t('Plaćanje se vrši u dinarima (RSD).')}</p></>;
 const action=<button type="button" className="flow-primary" disabled={busy||promo.loading||!items.length} onClick={next}>{t(busy?'Slanje porudžbine…':step===0?'Nastavi na adresu':step===1?'Nastavi na potvrdu':'Potvrdi porudžbinu')}<ArrowRight size={18}/></button>;
 return <div className="checkout-page checkout-flow"><SEOHead title={t('Plaćanje')} noIndex/><div className="flow-layout"><div className="flow-left"><div ref={heading} tabIndex={-1} className="flow-heading">
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
 </div>{!order&&<details className="flow-mobile-summary"><summary>{t('Pregled porudžbine')} · {price(amount)}</summary>{summary}</details>}
 {!order?<><form autoComplete="off" onSubmit={event=>event.preventDefault()} className={`flow-form flow-step-${step}`} onChangeCapture={()=>{touched.current=true;}}><DeliveryForm {...form} user={user} step={step} shippingMethod="courier" requiredForCourier getInputClass={n=>form.errors[n]?'input-error':''} submitCount={submitCount} onAddressesReady={setAddresses} setShowRegPopover={()=>{}} popoverDismissed showRegPopover={false} showSuccessModal={false}/></form>{step===1&&<details className="flow-note"><summary>{t('Dodaj napomenu kuriru')}</summary><label htmlFor="courier-note">{t('Napomena kuriru (opciono)')}</label><textarea id="courier-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={200} placeholder={t('Na primer: interfon ne radi, pozovite me.')} /></details>}{step===2&&<section className="flow-review flow-review-confirm"><div className="flow-review-title"><Check size={22}/><h2>{t('Proverite podatke')}</h2></div><p className="flow-muted">{t('Još jedan pogled i porudžbina je spremna.')}</p><p>{form.formData.name} {form.formData.surname}<br/>{form.formData.email}<br/>{form.formData.phone}</p><button type="button" onClick={()=>go(0)}>{t('Izmeni podatke')}</button><hr/>
 <div className="flow-address-choice">
  <label htmlFor="review-delivery-address">{t('Adresa za dostavu')}</label>
  <select id="review-delivery-address" value={selectedAddress?.id ?? ''} onChange={chooseDeliveryAddress} disabled={busy}>
   <option value="" disabled>{t('Trenutno uneta adresa')}</option>
   {savedAddressChoices.map(savedAddress => (
    <option key={savedAddress.id} value={savedAddress.id}>
     {[savedAddress.label, savedAddress.address, [savedAddress.zip, savedAddress.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
    </option>
   ))}
   <option value="new">{t('Unesi novu adresu')}</option>
  </select>
 </div>
<p>{address}<br/>{form.formData.postalCode} {form.formData.city}</p><button type="button" onClick={()=>go(1)}>{t('Izmeni adresu')}</button><hr/><p><Truck size={18}/> {t('Isporuka kurirskom službom')}</p><p className="flow-payment-badge">{t('Plaćanje pouzećem')}</p>{note&&<p>{note}</p>}</section>}{error&&<p role="alert" className="flow-error">{error}</p>}{step>0&&<button className="flow-back" type="button" onClick={()=>go(step-1)}><ArrowLeft size={16}/>{t('Nazad')}</button>}<div className="flow-mobile-action"><div><small>{t('Ukupno')}</small><strong>{price(amount)}</strong></div>{action}</div></>:<><section className="flow-review flow-receipt">
  <h2>{t('Podaci za isporuku')}</h2>
  <div className="flow-receipt-grid">
   <div><MapPin size={20}/><div><strong>{order.customer?.name} {order.customer?.surname}</strong><p>{order.customer?.address}<br/>{order.customer?.postalCode} {order.customer?.city}</p></div></div>
   <div><Truck size={20}/><div><strong>{t('Isporuka kurirskom službom')}</strong><p>{t('Plaćanje pouzećem')}</p>{order.note&&<p>{order.note}</p>}</div></div>
  </div>
 </section>{!dismissed&&(!user||order.claimToken||!addresses?.some(sameAddress))&&<section className="flow-save"><h2>{t('Sačuvaj podatke za sledeću kupovinu')}</h2>{!saved&&<>{!user&&<><label htmlFor="save-password">{t('Lozinka')}</label><input id="save-password" type="password" autoComplete="new-password" placeholder={t('Najmanje 8 karaktera, veliko slovo i broj')} value={password} onChange={e=>setPassword(e.target.value)}/></>}<button type="button" className="flow-primary" disabled={saveBusy} onClick={save}>{t(saveBusy?'Čuvanje…':user?'Sačuvaj adresu':'Sačuvaj nalog i adresu')}</button>{!user&&<button type="button" onClick={()=>showAuth('login')}>{t('Već imate nalog? Prijavite se')}</button>}<button type="button" onClick={()=>setDismissed(true)}>{t('Preskoči')}</button></>}{saveMessage&&<p role="status">{saveMessage}</p>}</section>}<div className="flow-mobile-summary">{summary}</div><div className="flow-receipt-actions">
  {user && (!order.claimToken || linked.current) && <Link to="/orders"><Truck size={18}/>{t('Moje porudžbine')}</Link>}
  <Link to="/catalog">{t('Nastavi kupovinu')}<ArrowRight size={18}/></Link>
 </div></>}
 </div><aside className="flow-summary">{summary}{!order&&action}</aside></div></div>;
}
