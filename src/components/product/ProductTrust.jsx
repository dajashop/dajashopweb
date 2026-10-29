import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import { Award, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import './ProductTrust.css';

export default function ProductTrust({ department }) {
  const { t: translateText } = useStorefront();
  const isBattery = (department?.slug || department) === 'baterije';

  return (
    <div className="product-trust">
      {/* 1. Originalnost */}
      <div className="trust-item">
        <div className="trust-icon-box">
          <Award size={20} strokeWidth={1.5} />
        </div>
        <div className="trust-content">
          <span className="trust-title">{translateText("100% Original")}</span>
          <span className="trust-subtitle">{translateText("Sa deklaracijom")}</span>
        </div>
      </div>

      {/* 2. Garancija */}
      <div className="trust-item">
        <div className="trust-icon-box">
          <ShieldCheck size={20} strokeWidth={1.5} />
        </div>
        <div className="trust-content">
          <span className="trust-title">{translateText(isBattery ? 'Izbor baterije' : 'Garancija 24 meseca ')}</span>
          <span className="trust-subtitle">{translateText(isBattery ? 'Proverite oznaku i napon' : 'Garancija na mehanizam i bateriju')}</span>
        </div>
      </div>

      {/* 3. Povrat */}
      <div className="trust-item">
        <div className="trust-icon-box">
          <RefreshCw size={20} strokeWidth={1.5} />
        </div>
        <div className="trust-content">
          <span className="trust-title">{translateText("Povrat 14 dana")}</span>
          <span className="trust-subtitle">{translateText("Bez suvišnih pitanja")}</span>
        </div>
      </div>

      {/* 4. Sigurnost */}
      <div className="trust-item">
        <div className="trust-icon-box">
          <Lock size={20} strokeWidth={1.5} />
        </div>
        <div className="trust-content">
          <span className="trust-title">{translateText("Sigurna kupovina")}</span>
          <span className="trust-subtitle">{translateText("SSL zaštita podataka")}</span>
        </div>
      </div>
    </div>
  );
}
