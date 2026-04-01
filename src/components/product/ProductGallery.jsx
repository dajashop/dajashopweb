import React, { useState, useMemo } from 'react';
import { Box, Maximize2, Image as ImageIcon } from 'lucide-react';
import Watch3DViewer from '../Watch3DViewer.jsx';
import ImageGalleryModal from '../modals/ImageGalleryModal.jsx';
import './ProductGallery.css';
export default function ProductGallery({ product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Priprema liste medija (3D + Slike)
  const mediaList = useMemo(() => {
    if (!product) return [];
    const list = [];
    if (product.model3DUrl) {
      list.push({ type: '3d', src: product.model3DUrl, id: 'model-3d' });
    }
    const images =
      product.images && product.images.length > 0
        ? product.images
        : product.image
          ? [{ url: product.image }]
          : [];
    images.forEach((img, i) => {
      list.push({ type: 'image', src: img.url, id: `img-${i}`, imageIndex: i });
    });
    return list;
  }, [product]);

  const galleryImages = useMemo(
    () =>
      mediaList.filter((m) => m.type === 'image').map((m) => ({ url: m.src })),
    [mediaList],
  );

  const activeItem = mediaList[activeIndex] || mediaList[0];
  const currentGalleryIndex = galleryImages.findIndex(
    (img) => img.url === activeItem?.src,
  );
  const defaultAlt = `${product.brand || ''} ${product.name || ''}`.trim();
  const mainImageAlt = product.seo?.imageAltText || defaultAlt || product.name;

  if (!product) return null;

  return (
    <div className="product__gallery">
      {isGalleryOpen && (
        <ImageGalleryModal
          images={galleryImages}
          initialIndex={Math.max(0, currentGalleryIndex)}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      {/* Glavni Prikaz */}
      <div className="product__main-view card relative group">
        {activeItem?.type === '3d' ? (
          <div className="view-3d-wrapper" data-lenis-prevent>
            <Watch3DViewer modelUrl={activeItem.src} />
          </div>
        ) : (
          <div
            className="view-image-wrapper cursor-zoom-in relative overflow-hidden"
            onClick={() => setIsGalleryOpen(true)}
          >
            <img
              src={activeItem?.src}
              alt={mainImageAlt}
              className="product__img-full transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
              <Maximize2 size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {mediaList.length > 1 && (
        <div className="product__thumbs">
          {mediaList.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={item.id}
                onClick={() => setActiveIndex(index)}
                className={`thumb-btn ${isActive ? 'is-active' : ''}`}
              >
                {item.type === '3d' ? (
                  <div className="thumb-icon">
                    <Box size={20} strokeWidth={1.5} />
                    <span>3D</span>
                  </div>
                ) : (
                  <img
                    src={item.src}
                    alt={`${product.name} - slika ${(item.imageIndex || 0) + 1}`}
                    className="thumb-img"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
