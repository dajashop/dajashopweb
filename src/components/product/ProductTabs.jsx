import React, { useState } from 'react';
import { Truck, ShieldCheck, Package } from 'lucide-react';
import './ProductTabs.css';
import { descriptionHtml } from '../description.js';
import '../rich-description.css';
import { formatProductSpecLabel, visibleProductSpecs } from '../../utils/catalogPresentation.js';
// [NOVO] Importujemo recenzije
import ProductReviews from './ProductReviews.jsx';
import { commerceSeoConfig } from '../../config/seo.js';
import { money } from '../../utils/currency.js';

export default function ProductTabs({ product, hideSpecs = false }) {
  const [activeTab, setActiveTab] = useState('desc');
  const specs = visibleProductSpecs(product?.specs);

  return (
    <div className="product-tabs-container">
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'desc' ? 'active' : ''}`}
          onClick={() => setActiveTab('desc')}
        >
          Opis
        </button>

        {!hideSpecs && (
          <button
            className={`tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            Specifikacije
          </button>
        )}

        {/* [NOVO] Tab za Recenzije */}
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Recenzije
        </button>

        <button
          className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          Isporuka
        </button>
      </div>

      <div className="tab-content">
        {/* OPIS */}
        {activeTab === 'desc' && (
          <div className="tab-text-content">
            <h2 className="sr-only">Opis proizvoda</h2>
            {product.description ? (
              <div className="rich-description" dangerouslySetInnerHTML={{ __html: descriptionHtml(product.description) }} />
            ) : (
              <p className="empty-text">Nema opisa.</p>
            )}
          </div>
        )}

        {/* SPECIFIKACIJE */}
        {!hideSpecs && (
          <div className="specs-wrapper" hidden={activeTab !== 'specs'}>
            <h2 className="sr-only">Specifikacije proizvoda</h2>
            {Object.keys(specs).length > 0 ? (
              <table className="specs-table">
                <tbody>
                  {Object.entries(specs).map(([k, v]) => (
                    <tr key={k} className="specs-table-row">
                      <td className="spec-cell-key">{formatProductSpecLabel(k)}</td>
                      <td className="spec-cell-val">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-text">Nema specifikacija.</p>
            )}
          </div>
        )}

        {/* [NOVO] RECENZIJE */}
        {activeTab === 'reviews' && <section>
          <h2 className="sr-only">Recenzije proizvoda</h2>
          <ProductReviews product={product} />
        </section>}

        {/* ISPORUKA */}
        {(
          <div className="delivery-info" hidden={activeTab !== 'delivery'}>
            <h2 className="sr-only">Isporuka i garancija</h2>
            <div className="delivery-item">
              <div className="del-icon">
                <Truck size={20} />
              </div>
              <div>
                <h3>Besplatna Isporuka</h3>
                <p>Za porudžbine od {money(commerceSeoConfig.freeShippingThreshold)} nakon popusta.</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="del-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3>2 Godine Garancije</h3>
                <p>Zvanična garancija na mehanizam.</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="del-icon">
                <Package size={20} />
              </div>
              <div>
                <h3>Originalno Pakovanje</h3>
                <p>Sat stiže u originalnoj kutiji.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
