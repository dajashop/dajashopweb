import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import { Truck, RefreshCw, Lock } from 'lucide-react';
import './ProductTrust.css';

const benefits = [
  { icon: Truck, title: 'Dostava' },
  { icon: RefreshCw, title: 'Zamena i povrat' },
  { icon: Lock, title: 'Sigurna kupovina' },
];

export default function ProductTrust() {
  const { t: translateText } = useStorefront();

  return (
    <div className="product-trust">
      {benefits.map(({ icon: Icon, title }) => (
        <div className="trust-item" key={title}>
          <span className="trust-icon-box">
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="trust-title">{translateText(title)}</span>
        </div>
      ))}
    </div>
  );
}
