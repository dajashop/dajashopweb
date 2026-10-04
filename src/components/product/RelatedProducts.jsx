import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../../utils/currency';
import './RelatedProducts.css';

export default function RelatedProducts({ currentProduct, allProducts }) {
  const sliderRef = useRef(null);

  // State za drag funkcionalnost
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const isDragging = useRef(false); // Drag suppression must survive mouseup until the click.

  const relatedItems = useMemo(() => {
    if (!currentProduct || !allProducts) return [];

    return allProducts
      .filter((item) => {
        if (item.id === currentProduct.id) return false;
        // The API applies similarity and the 12-product limit before transfer.
        return true;
      })
      .slice(0, 12);
  }, [currentProduct, allProducts]);

  if (relatedItems.length === 0) return null;

  // --- DRAG HANDLERS ---
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDown(true);
    isDragging.current = false;
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Brzina skrolovanja (* 2 je brže)
    sliderRef.current.scrollLeft = scrollLeft - walk;

    // Ako se pomerio više od 5px, računamo to kao drag, a ne klik
    if (Math.abs(walk) > 5) {
      isDragging.current = true;
    }
  };

  return (
    <div className="related-products-container">
      <h2 className="related-title">Možda će vas zanimati</h2>

      <div
        className={`related-scroll-container ${isDown ? 'active' : ''}`}
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {relatedItems.map((item) => (
          <Link
            key={item.id}
            to={`/product/${item.slug}`}
            className="related-card"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => {
              if (e.detail !== 0 && isDragging.current) e.preventDefault();
            }}
          >
            <div className="related-image-box">
              <img
                src={
                  item.thumbnailUrl ||
                  item.images?.[0]?.thumb ||
                  item.images?.[0]?.url ||
                  item.image
                }
                alt={item.name}
                className="related-img"
                draggable="false" // Bitno: Da se slika ne vuče kao fajl
              />
            </div>

            <div className="related-info">
              <span className="related-brand">{item.brand}</span>
              <h3 className="related-name">{item.name}</h3>
              <div className="related-price">{money(item.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
