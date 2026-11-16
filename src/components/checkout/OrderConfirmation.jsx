import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, MapPin, UserRoundPlus } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { customerApi } from '../../services/dajaPlatform.js';
import { PASSWORD_RULE } from '../../data/validationRules.js';

export default function OrderConfirmation({ order }) {
  const { t } = useStorefront();
  const { user, register, showAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [createdAccount, setCreatedAccount] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const customer = order.customer || {};
  const pickup = order.shippingMethod === 'pickup';
  const needsAccount = !user && !createdAccount;
  const canSaveAddress = !pickup && customer.address && customer.city && customer.postalCode;

  const saveDetails = async (event) => {
    event.preventDefault();
    if (savingRef.current || saved) return;
    if (needsAccount && !PASSWORD_RULE.regex.test(password)) {
      setError(PASSWORD_RULE.message);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    let accountAvailable = !needsAccount;
    try {
      if (needsAccount) {
        await register({ identity: customer.email, password, name: [customer.name, customer.surname].filter(Boolean).join(' ') });
        accountAvailable = true;
        setCreatedAccount(true);
        setPassword('');
      }
      if (canSaveAddress) {
        const payload = {
          label: 'Kuća', icon: 'home', name: [customer.name, customer.surname].filter(Boolean).join(' '),
          address: customer.address, city: customer.city, zip: customer.postalCode, phone: customer.phone,
        };
        const normalize = value => String(value || '').trim().toLowerCase();
        const addresses = await customerApi.listAddresses();
        const exists = addresses.some(address => ['name', 'address', 'city', 'zip', 'phone'].every(key => normalize(address[key]) === normalize(payload[key])));
        if (!exists) await customerApi.addAddress(payload);
      }
      setSaved(true);
    } catch (err) {
      setError(accountAvailable ? 'Nalog je dostupan, ali adresa nije sačuvana. Pokušajte ponovo.' : err.status === 409
        ? 'Nalog sa ovom email adresom već postoji. Prijavite se da biste sačuvali adresu.'
        : err.message || 'Nalog nije kreiran. Pokušajte ponovo.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <div className="checkout-confirmation">
    <div className="checkout-success-message" role="status">
      <span className="checkout-success-check"><Check size={34} strokeWidth={2.5} /></span>
      <div><p className="checkout-order-number">{t('Broj porudžbine')} <strong>#{order.id}</strong></p><p>{t('Hvala na poverenju! Vaša porudžbina je uspešno primljena.')}</p></div>
    </div>
    {customer.email && <p className="checkout-confirmation-email">{t('Potvrda porudžbine stići će na')} <strong>{customer.email}</strong>. {t('Proverite i spam folder.')}</p>}
    <div className="checkout-receipt-delivery"><MapPin size={20} /><div><h3>{t(pickup ? 'Preuzimanje u prodavnici' : 'Adresa za isporuku')}</h3><p>{customer.name} {customer.surname}</p><p>{pickup ? t('Obrenovićeva bb, Podzemni prolaz, lokal C31, 18105 Niš') : customer.address}</p>{!pickup && <p>{customer.postalCode} {customer.city}</p>}<p>{customer.phone}</p><p className="checkout-payment-note">{t(pickup ? 'Plaćanje prilikom preuzimanja u prodavnici.' : 'Plaćanje kuriru prilikom preuzimanja.')}</p></div></div>
    {(needsAccount || createdAccount || canSaveAddress) && <section className="checkout-save-details" aria-labelledby="checkout-save-heading">
      <div className="checkout-save-heading">{saved ? <CheckCircle2 size={23} /> : <UserRoundPlus size={23} />}<h3 id="checkout-save-heading">{t(saved ? 'Spremni za sledeću kupovinu' : needsAccount ? 'Sačuvajte podatke za sledeći put' : 'Sačuvajte adresu za sledeći put')}</h3></div>
      {saved ? <p role="status">{t(canSaveAddress ? 'Adresa je sačuvana u vašem nalogu za lakšu sledeću porudžbinu.' : 'Nalog je kreiran. Sledeću kupovinu započnite prijavom.')}</p> : <>
        <p>{t(needsAccount ? canSaveAddress ? 'Dodajte lozinku i sačuvajte nalog i adresu. Podatke ne morate ponovo da unosite.' : 'Dodajte lozinku i kreirajte nalog za sledeću kupovinu.' : 'Ova adresa će biti dostupna pri sledećoj porudžbini.')}</p>
        <form onSubmit={saveDetails} className="checkout-save-form">
          {needsAccount && <><label htmlFor="checkout-new-password">{t('Lozinka za novi nalog')}</label><input id="checkout-new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => { setPassword(event.target.value); setError(''); }} aria-describedby="checkout-password-help" disabled={saving} /><small id="checkout-password-help">{t(PASSWORD_RULE.message)}</small><p className="checkout-account-email">{customer.email}</p></>}
          {error && <p className="checkout-inline-error" role="alert">{t(error)}</p>}
          <button type="submit" className="checkout-action" disabled={saving} aria-busy={saving}>{t(saving ? 'Čuvanje…' : needsAccount ? canSaveAddress ? 'Sačuvaj nalog i adresu' : 'Kreiraj nalog' : 'Sačuvaj adresu')}</button>
          {needsAccount && <button type="button" className="checkout-text-button" onClick={() => showAuth('login')} disabled={saving}>{t('Već imate nalog? Prijavite se')}</button>}
        </form>
      </>}
      {createdAccount && <p className="checkout-verify-note">{t('Na email smo poslali link za potvrdu naloga. Otvorite ga da potvrdite email adresu.')}</p>}
    </section>}
    <Link to="/catalog" className="checkout-back-link">{t('Nastavi kupovinu')}</Link>
  </div>;
}
