import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react';
import ProgressiveImage from '../ui/ProgressiveImage.jsx';

export default function ImageGalleryModal({ images, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  const isDraggingRef = useRef(false);

  // --- KAMERA EFEKAT ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const invertedX = useTransform(x, (v) => v);
  const invertedY = useTransform(y, (v) => v);

  // Resetuj samo zum i poziciju kad se promeni slika
  useEffect(() => {
    setIsZoomed(false);
    setIsImgLoaded(false);
    x.set(0);
    y.set(0);
  }, [currentIndex]);

  // --- PRELOADING ---
  useEffect(() => {
    if (!images || images.length === 0) return;
    const preloadImg = (idx) => {
      const img = new Image();
      img.src = images[idx]?.url;
    };
    const len = images.length;
    preloadImg((currentIndex + 1) % len);
    preloadImg((currentIndex + 2) % len);
    preloadImg((currentIndex - 1 + len) % len);
  }, [currentIndex, images]);

  // Navigacija tastaturom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (!isZoomed) {
        if (e.key === 'ArrowLeft') changeImage('prev');
        if (e.key === 'ArrowRight') changeImage('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isZoomed]);

  // --- GLAVNA PROMENA: RESETUJEMO LOAD STATE OVDE ---
  const changeImage = (direction) => {
    setIsImgLoaded(false); // Prvo sakrij staru
    setIsZoomed(false); // Odzumiraj

    if (direction === 'next') {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const toggleZoom = (e) => {
    e?.stopPropagation();
    if (!isImgLoaded) return;
    x.set(0);
    y.set(0);
    setIsZoomed(!isZoomed);
  };

  const handleDraggerClick = (e) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    toggleZoom(e);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-200 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-250"
        >
          <X size={24} />
        </button>

        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-10 overflow-hidden">
          {/* Strelice */}
          {images.length > 1 && !isZoomed && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  changeImage('prev');
                }}
                className="absolute left-4 md:left-8 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-40 hidden md:flex items-center justify-center border border-white/10"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  changeImage('next');
                }}
                className="absolute right-4 md:right-8 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-40 hidden md:flex items-center justify-center border border-white/10"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loader */}
            {!isImgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}

            {/* SLIKA */}
            <motion.div
              key={`img-${currentIndex}`}
              animate={{ scale: isZoomed ? 2.5 : 1 }}
              style={{
                x: isZoomed ? invertedX : 0,
                y: isZoomed ? invertedY : 0,
                touchAction: 'none',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`
                max-w-[90vw] max-h-[80vh] rounded-lg shadow-2xl select-none transition-opacity duration-300
                ${isImgLoaded ? 'opacity-100' : 'opacity-0'}
                ${isZoomed ? '' : 'cursor-zoom-in'}
              `}
            >
              <ProgressiveImage
                src={images[currentIndex].url || '/placeholder.png'}
                thumbSrc={images[currentIndex].thumb}
                alt="Gallery preview"
                onLoad={() => setIsImgLoaded(true)}
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
              />
            </motion.div>

            {/* Dragger */}
            {isZoomed && isImgLoaded && (
              <motion.div
                className="fixed -inset-[200%] z-200 cursor-grab active:cursor-grabbing"
                style={{ x, y }}
                drag
                dragElastic={0.2}
                dragMomentum={true}
                dragTransition={{ power: 0.05, timeConstant: 100 }}
                onDragStart={() => {
                  isDraggingRef.current = true;
                }}
                onDragEnd={() => {
                  setTimeout(() => {
                    isDraggingRef.current = false;
                  }, 50);
                }}
                onClick={handleDraggerClick}
              />
            )}

            {!isZoomed && isImgLoaded && (
              <div
                className="absolute inset-0 z-10 cursor-zoom-in"
                onClick={toggleZoom}
              />
            )}

            {isImgLoaded && (
              <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1.5 rounded-full text-white text-xs font-medium pointer-events-none flex items-center gap-2 backdrop-blur-sm border border-white/10 z-210">
                {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                {isZoomed ? 'Klikni za izlaz' : 'Klikni za zum'}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && !isZoomed && (
          <div
            className="w-full h-24 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2 p-4 overflow-x-auto z-40 absolute bottom-0 border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImgLoaded(false);
                  setCurrentIndex(idx);
                }}
                className={`relative h-14 w-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  currentIndex === idx
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={img.thumb || img.url || '/placeholder.png'}
                  className="w-full h-full object-cover"
                  alt={`thumbnail-${idx}`}
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
