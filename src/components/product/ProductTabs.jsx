import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useState } from 'react';
import { Truck, ShieldCheck, Package } from 'lucide-react';
import './ProductTabs.css';
import { descriptionHtml } from '../description.js';
import '../rich-description.css';
import ProductSpecs from './ProductSpecs.jsx';
// [NOVO] Importujemo recenzije
import ProductReviews from './ProductReviews.jsx';
import { commerceSeoConfig } from '../../config/seo.js';


export default function ProductTabs({ product, hideSpecs = false }) {
  const { t: translateText, money, language } = useStorefront();

  const [selectedTab, setActiveTab] = useState('desc');
  const activeTab = hideSpecs && selectedTab === 'specs' ? 'desc' : selectedTab;
  const translatedDescription = product.attributes?._translations?.[language]?.description;
  const description = typeof translatedDescription === 'string' && translatedDescription.trim() ? translatedDescription : product.description;

  return (
    <div className="product-tabs-container">
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'desc' ? 'active' : ''}`}
          onClick={() => setActiveTab('desc')}
        >{translateText("Opis")}</button>

        {!hideSpecs && (
          <button
            className={`tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >{translateText("Specifikacije")}</button>
        )}

        {/* [NOVO] Tab za Recenzije */}
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >{translateText("Recenzije")}</button>

        <button
          className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >{translateText("Isporuka")}</button>
      </div>

      <div className="tab-content">
        {/* OPIS */}
        {activeTab === 'desc' && (
          <div className="tab-text-content">
            <h2 className="sr-only">{translateText("Opis proizvoda")}</h2>
            {description ? (
              <div>
                {language === 'en' && !translatedDescription && <p className="muted">{translateText('Ovaj opis je dostupan na srpskom jeziku.')}</p>}
                <div className={`rich-description${product.department === 'baterije' ? ' battery-description' : ''}`} lang={language === 'en' && !translatedDescription ? 'sr' : language} dangerouslySetInnerHTML={{ __html: descriptionHtml(description) }} />
              </div>
            ) : (
              <p className="empty-text">{translateText("Nema opisa.")}</p>
            )}
          </div>
        )}

        {/* SPECIFIKACIJE */}
        {!hideSpecs && (
          <div className="specs-wrapper" hidden={activeTab !== 'specs'}>
            <ProductSpecs product={product} embedded />
          </div>
        )}

        {/* [NOVO] RECENZIJE */}
        {activeTab === 'reviews' && <section>
          <h2 className="sr-only">{translateText("Recenzije proizvoda")}</h2>
          <ProductReviews key={product.id} product={product} />
        </section>}

        {/* ISPORUKA */}
        {(
          <div className="delivery-info" hidden={activeTab !== 'delivery'}>
            <h2 className="sr-only">{translateText("Isporuka i garancija")}</h2>
            <div className="delivery-item">
              <div className="del-icon">
                <Truck size={20} />
              </div>
              <div>
                <h3>{translateText("Besplatna Isporuka")}</h3>
                <p>{translateText("Za porudžbine od ")}{money(commerceSeoConfig.freeShippingThreshold)}{translateText(" nakon popusta.")}</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="del-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3>{translateText("2 Godine Garancije")}</h3>
                <p>{translateText("Zvanična garancija na mehanizam.")}</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="del-icon">
                <Package size={20} />
              </div>
              <div>
                <h3>{translateText("Originalno Pakovanje")}</h3>
                <p>{translateText("Sat stiže u originalnoj kutiji.")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
