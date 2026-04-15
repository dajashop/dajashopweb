import React, { Suspense, lazy, useState, useMemo, useEffect } from 'react';
import { Box, Maximize2, Image as ImageIcon } from 'lucide-react';
import ImageGalleryModal from '../modals/ImageGalleryModal.jsx';
import ProgressiveImage from '../ui/ProgressiveImage.jsx';
import './ProductGallery.css';

const Watch3DViewer = lazy(() => import('../Watch3DViewer.jsx'));

function ViewerSpinner() {
  return (
    <div
      className="flex items-center justify-center min-h-90"
      role="status"
      aria-live="polite"
      aria-label="Ucitavanje 3D prikaza"
    >
      <span className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ProductGallery({ product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [totalTabs, setTotalTabs] = useState(4); // default: 4 taba za manje ekrane

  // Breakpoint logika: 700-999 => 8 taba, 1000-1299 => 7 taba, 1300+ => 10 taba
  useEffect(() => {
    const calcTabs = (w) => {
      if (w >= 1300) return 10;
      if (w >= 1000) return 7;
      if (w >= 700) return 8;
      return 4;
    };
    const update = () => {
      if (typeof window === 'undefined') return;
      setTotalTabs(calcTabs(window.innerWidth));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Priprema liste medija (3D + Slike)
  const mediaList = useMemo(() => {
    if (!product) return [];
    const list = [];
    if (product.model3DUrl) {
      list.push({ type: '3d', src: product.model3DUrl, id: 'model-3d' });
    }
    const images =
      product.images && product.images.length > 0
        ? product.images.map((img) =>
            typeof img === 'string' ? { url: img } : img,
          )
        : product.image
          ? [{ url: product.image }]
          : [];
    images.forEach((img, i) => {
      list.push({
        type: 'image',
        src: img.url,
        thumb:
          img.thumb || (i === 0 ? product.thumbnailUrl || img.url : img.url),
        id: `img-${i}`,
        imageIndex: i,
      });
    });
    // Dodajemo indeks da bismo ga sačuvali čak i kada neke thumb-ove sakrijemo
    return list.map((item, idx) => ({ ...item, mediaIndex: idx }));
  }, [product]);

  // Thumbs: brojimo samo slike u limit (3D se prikazuje ali ne "pojede" slot)
  const imageItems = mediaList.filter((item) => item.type === 'image');
  const nonImageItems = mediaList.filter((item) => item.type !== 'image');

  const hasOverflow = imageItems.length > totalTabs;
  const visibleImages = hasOverflow
    ? imageItems.slice(0, totalTabs - 1)
    : imageItems;
  const hiddenImages = hasOverflow ? imageItems.slice(totalTabs - 1) : [];
  const hasHiddenImages = hiddenImages.length > 0;

  // Kombinujemo: prvo 3D ili drugi ne-image, pa vidljive slike
  const visibleThumbs = [...nonImageItems, ...visibleImages];

  const galleryImages = useMemo(
    () =>
      mediaList
        .filter((m) => m.type === 'image')
        .map((m) => ({ url: m.src, thumb: m.thumb || m.src })),
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
            <Suspense fallback={<ViewerSpinner />}>
              <Watch3DViewer modelUrl={activeItem.src} />
            </Suspense>
          </div>
        ) : (
          <div
            className="view-image-wrapper cursor-zoom-in relative overflow-hidden"
            onClick={() => setIsGalleryOpen(true)}
          >
            <ProgressiveImage
              src={activeItem?.src}
              thumbSrc={activeItem?.thumb}
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
          {visibleThumbs.map((item) => {
            const isActive = activeIndex === item.mediaIndex;
            return (
              <button
                key={item.id}
                onClick={() => setActiveIndex(item.mediaIndex)}
                className={`thumb-btn ${isActive ? 'is-active' : ''}`}
              >
                {item.type === '3d' ? (
                  <div className="thumb-icon">
                    <Box size={20} strokeWidth={1.5} />
                    <span>3D</span>
                  </div>
                ) : (
                  <img
                    src={item.thumb || item.src}
                    alt={`${product.name} - slika ${(item.imageIndex || 0) + 1}`}
                    className="thumb-img"
                  />
                )}
              </button>
            );
          })}

          {hasHiddenImages && (
            <button
              type="button"
              className="thumb-btn more-thumb"
              onClick={() => {
                // Pozicioniramo se na prvu sakrivenu sliku i odmah otvaramo fullscreen
                setActiveIndex(hiddenImages[0].mediaIndex);
                setIsGalleryOpen(true);
              }}
            >
              <div className="more-thumb__overlay">
                <ImageIcon size={18} strokeWidth={1.5} />
                <span>+{hiddenImages.length}</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
