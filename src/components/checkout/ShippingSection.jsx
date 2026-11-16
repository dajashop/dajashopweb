import React from 'react';
import { Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import GoogleMapEmbed from '../privacy/GoogleMapEmbed.jsx';

export default function ShippingSection({ shippingMethod, setShippingMethod, isFreeShipping, COURIER_COST, money }) {
  const { t } = useStorefront();
  return <section className="checkout-section checkout-shipping">
    <fieldset className="checkout-fields"><legend>{t('Način isporuke')}</legend><div className="shipping-options">
      {[{ value: 'courier', title: 'Isporuka kurirskom službom', description: 'Na adresu koju izaberete', Icon: Truck }, { value: 'pickup', title: 'Preuzimanje u prodavnici', description: 'DAJA Shop, Niš', Icon: MapPin }].map(({ value, title, description, Icon }) => <label className={'radio-card ' + (shippingMethod === value ? 'selected' : '')} key={value}>
        <input type="radio" name="shipping" value={value} checked={shippingMethod === value} className="checkout-choice-input" onChange={() => setShippingMethod(value)} />
        <div className="radio-info"><Icon size={23} /><div><span className="radio-title">{t(title)}</span><span className="radio-desc">{t(description)}</span></div></div>
        <span className={'radio-price ' + (value === 'pickup' || isFreeShipping ? 'checkout-free' : '')}>{value === 'pickup' || isFreeShipping ? t('Besplatna') : money(COURIER_COST)}</span>
        <div className="radio-check"><CheckCircle2 size={16} /></div>
      </label>)}
    </div></fieldset>
    {shippingMethod === 'pickup' && <div className="checkout-pickup-location"><h3>{t('Lokacija prodavnice:')}</h3><p>{t('Obrenovićeva bb, Podzemni prolaz, lokal C31, 18105 Niš')}</p><details><summary>{t('Prikaži lokaciju na mapi')}</summary><div className="map-container"><GoogleMapEmbed title={t('Daja Shop Lokacija')} width="100%" height="240" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></div></details></div>}
  </section>;
}
