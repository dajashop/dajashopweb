import React from 'react';
import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { batteryPackaging, batteryQuantityOptions } from '../../utils/batteryPackaging.js';

export default function BatteryQuantityChoice({ product, quantity, quantityInCart = 0, onChange }) {
  const { t, money } = useStorefront();
  const choices = batteryQuantityOptions(product);
  if (!choices.length) return null;
  const unitPrice = batteryPackaging(product).price;
  const available = Math.max(0, Number(product.availability?.availableQuantity ?? product.availableQuantity ?? 0) - quantityInCart);
  return <fieldset className="battery-quantity-choice">
    <legend className="variants-title">{t('Izaberite količinu baterija')}</legend>
    <div className="variants-grid battery-pack-options">
      {choices.map(count => <button type="button" key={count}
        className={`variant-card battery-quantity-button${count === quantity ? ' active' : ''}`}
        aria-pressed={count === quantity} disabled={available < count} onClick={() => onChange(count)}>
        <span className="battery-pack-option-copy">
          <strong>{t(count === 1 ? '1 komad' : '5 komada')}</strong>
          <span>{money(unitPrice * count)}</span>
          {count > 1 && <small>{count} × {money(unitPrice)}</small>}
          {available < count && <span>{t('Trenutno nije dostupna ova količina')}</span>}
        </span>
      </button>)}
    </div>
    {quantityInCart > 0 && <small>{t('Već u korpi: {count} kom.', { count: quantityInCart })}</small>}
  </fieldset>;
}
