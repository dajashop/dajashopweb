import React, { useState } from 'react';
import { Truck, ShieldCheck, Package } from 'lucide-react';
import './ProductTabs.css';
import { visibleProductSpecs } from '../../utils/catalogPresentation.js';
// [NOVO] Importujemo recenzije
import ProductReviews from './ProductReviews.jsx';

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
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <p className="empty-text">Nema opisa.</p>
            )}
          </div>
        )}

        {/* SPECIFIKACIJE */}
        {!hideSpecs && activeTab === 'specs' && (
          <div className="specs-wrapper">
            {Object.keys(specs).length > 0 ? (
              <table className="specs-table">
                <tbody>
                  {Object.entries(specs).map(([k, v]) => (
                    <tr key={k} className="specs-table-row">
                      <td className="spec-cell-key">{k}</td>
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
        {activeTab === 'reviews' && <ProductReviews product={product} />}

        {/* ISPORUKA */}
        {activeTab === 'delivery' && (
          <div className="delivery-info">
            <div className="delivery-item">
              <div className="del-icon">
                <Truck size={20} />
              </div>
              <div>
                <h4>Besplatna Isporuka</h4>
                <p>Za porudžbine iznad 10.000 RSD.</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="del-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4>2 Godine Garancije</h4>
                <p>Zvanična garancija na mehanizam.</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="del-icon">
                <Package size={20} />
              </div>
              <div>
                <h4>Originalno Pakovanje</h4>
                <p>Sat stiže u originalnoj kutiji.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
