import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { money } from '../../utils/currency';
import './RelatedProducts.css';

export default function RelatedProducts({ currentProduct, allProducts }) {
  const navigate = useNavigate();
  const sliderRef = useRef(null);

  // State za drag funkcionalnost
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false); // Da znamo da li vučemo ili klikćemo

  const relatedItems = useMemo(() => {
    if (!currentProduct || !allProducts) return [];

    return allProducts
      .filter((item) => {
        if (item.id === currentProduct.id) return false;
        if (item.brand !== currentProduct.brand) return false;
        if ((item.gender || '') !== (currentProduct.gender || '')) return false;

        const minPrice = currentProduct.price - 1000;
        const maxPrice = currentProduct.price + 1000;

        if (item.price < minPrice || item.price > maxPrice) return false;

        return true;
      })
      .slice(0, 12);
  }, [currentProduct, allProducts]);

  if (relatedItems.length === 0) return null;

  // --- DRAG HANDLERS ---
  const handleMouseDown = (e) => {
    setIsDown(true);
    setIsDragging(false);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
    // Malo kašnjenje da resetujemo dragging status da ne bi okinuo klik odmah
    setTimeout(() => setIsDragging(false), 0);
  };

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Brzina skrolovanja (* 2 je brže)
    sliderRef.current.scrollLeft = scrollLeft - walk;

    // Ako se pomerio više od 5px, računamo to kao drag, a ne klik
    if (Math.abs(walk) > 5) {
      setIsDragging(true);
    }
  };

  const handleCardClick = (slug) => {
    // Ako smo vukli (dragovali), ne radi navigaciju
    if (isDragging) return;

    navigate(`/product/${slug}`);
    window.scrollTo(0, 0);
  };

  return (
    <div className="related-products-container">
      <h3 className="related-title">Možda će vas zanimati</h3>

      <div
        className={`related-scroll-container ${isDown ? 'active' : ''}`}
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {relatedItems.map((item) => (
          <div
            key={item.id}
            className="related-card"
            onClick={(e) => {
              // Sprečavamo default da slika ne bi postala "ghost image" pri dragovanju
              e.preventDefault();
              handleCardClick(item.slug);
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
              <h4 className="related-name">{item.name}</h4>
              <div className="related-price">{money(item.price)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
