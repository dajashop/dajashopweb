import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from 'react';
import './HomeProductCard.css';
import Link from '../ProductLink.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useFlash } from '../../hooks/useFlash.js';


/**
 * Minimal product card for the Home page.
 * Intentionally lighter than the global ProductCard.
 */
export default function HomeProductCard({ product }) {
  const { t: translateText, money } = useStorefront();

  const { dispatch } = useCart();
  const { flash } = useFlash();

  if (!product) return null;

  const {
    id,
    name,
    brand,
    price,
    slug,
    thumbnailUrl,
    images,
    image,
    productId,
    variantId,
    variants,
    gender,
    category,
  } = product;

  const primaryImg =
    thumbnailUrl ||
    images?.[0]?.url ||
    image ||
    '/images/product-placeholder.svg';

  const handleAdd = () => {
    dispatch({
      type: 'ADD',
      item: {
        id,
        productId: productId || id,
        variantId: variantId || variants?.[0]?.id,
        name,
        price,
        image: primaryImg,
        brand,
        slug,
      },
    });
    flash('Dodato u korpu', `${name} je u korpi.`, 'cart');
  };

  return (
    <article className={`homeCard${product.department === 'naocare' ? ' homeCard--eyewear' : ''}`}>
      <Link to={`/product/${slug}`} className="homeCard__img">
        <img src={primaryImg} alt={translateText(name)} loading="lazy" />
      </Link>

      <div className="homeCard__body">
        <div className="homeCard__meta">
          {brand && <span className="homeCard__brand">{translateText(brand)}</span>}
          {(gender || category) && (
            <span className="homeCard__pill">
              {translateText(gender || 'Unisex')}
              {translateText(category ? ` · ${category}` : '')}
            </span>
          )}
        </div>

        <Link to={`/product/${slug}`} className="homeCard__name">
          {translateText(name)}
        </Link>

        <div className="homeCard__foot">
          <span className="homeCard__price">{money(price)}</span>
          <div className="homeCard__actions">
            <Link to={`/product/${slug}`} className="btn btn--ghost-sm">{translateText("Detalji")}</Link>
            <button type="button" className="btn btn--primary-sm" onClick={handleAdd}>{translateText("Dodaj")}</button>
          </div>
        </div>
      </div>
    </article>
  );
}
