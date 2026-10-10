import React from 'react';
import './ProductSpecs.css';
import { formatProductSpecLabel, visibleProductSpecs } from '../../utils/catalogPresentation.js';
import { eyewearDisplayValue, isEyewearDepartment } from '../../utils/eyewearCatalog.js';

export default function ProductSpecs({ product }) {
  const specs = visibleProductSpecs(product?.specs, product?.department);
  const eyewear = isEyewearDepartment(product?.department);

  // Ako nema specifikacija, ne prikazuj ništa
  if (Object.keys(specs).length === 0) {
    return null;
  }

  return (
    <div className="product-specs-standalone card">
      <h2 className="specs-heading">Specifikacije</h2>
      <div className="specs-table-wrapper">
        <table className="specs-table">
          <tbody>
            {Object.entries(specs).map(([k, v]) => (
              <tr key={k} className="specs-table-row">
                <td className="spec-cell-key">{formatProductSpecLabel(k, product?.department)}</td>
                <td className="spec-cell-val">{eyewear ? eyewearDisplayValue(k, v) : v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
