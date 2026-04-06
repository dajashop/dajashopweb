import { useEffect, useMemo, useState } from 'react';
import './ProductCard.css';
import { Link } from 'react-router-dom';
import { money } from '../utils/currency.js';
import { useCart } from '../hooks/useCart.js';
import { useFlash } from '../hooks/useFlash.js';
import { useWishlist } from '../context/WishlistProvider.jsx';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Edit3, Heart, Trash2, Star, Eye, EyeOff } from 'lucide-react'; // Dodate ikonice
import { auth, ADMIN_EMAILS } from '../services/firebase';
import { deleteProduct, saveProduct } from '../services/products';

// Uvozimo Modal
import AdminProductModal from '../pages/Admin/components/AdminProductModal.jsx';
import ConfirmModal from '../components/modals/ConfirmModal.jsx';

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 1000 : -1000, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

export default function ProductCard({ p }) {
  const { dispatch } = useCart();
  const { flash } = useFlash();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isLiked = isInWishlist(p.id);

  // Stanja za modale
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Slider
  const [[page, direction], setPage] = useState([0, 0]);

  const imgs = useMemo(() => {
    const arr = p.images ?? (p.image ? [{ url: p.image }] : []);
    return Array.isArray(arr) ? arr : [];
  }, [p.images, p.image]);

  const imageIndex = Math.abs(page % imgs.length);

  const paginate = (newDirection) => {
    if (imgs.length <= 1) return;
    setPage([page + newDirection, newDirection]);
  };

  const setIndex = (index) => {
    const newDirection = index > imageIndex ? 1 : -1;
    setPage([index, newDirection]);
  };

  const showSliderControls = imgs.length > 1;

  // Admin check
  const [userEmail, setUserEmail] = useState(
    () => auth?.currentUser?.email ?? null
  );
  useEffect(() => {
    const unsub = auth?.onAuthStateChanged?.((u) =>
      setUserEmail(u?.email ?? null)
    );
    return () => unsub?.();
  }, []);

  const isAdmin = useMemo(
    () => !!userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()),
    [userEmail]
  );

  // Handleri
  const addToCart = () => {
    dispatch({
      type: 'ADD',
      item: {
        id: p.id,
        name: p.name,
        price: p.price,
        image: imgs?.[0]?.url ?? p.image,
        brand: p.brand,
        slug: p.slug,
      },
    });
    flash('Dodato u korpu', `${p.name} je u vašoj korpi.`, 'cart');
  };

  // --- ADMIN FUNKCIJE ---
  const toggleNovo = async () => {
    try {
      await saveProduct({ id: p.id, novo: !p.novo });
      flash(
        'Uspeh',
        `Status 'Novo' je ${!p.novo ? 'uključen' : 'isključen'}.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      flash('Greška', 'Nije uspelo menjanje statusa.', 'error');
    }
  };

  // NOVA FUNKCIJA: Toggle Vidljivosti
  const toggleVisibility = async () => {
    try {
      // Ako je undefined, podrazumeva se da je vidljiv (true)
      const currentStatus = p.isVisible !== false;
      await saveProduct({ id: p.id, isVisible: !currentStatus });
      flash(
        'Uspeh',
        `Proizvod je sada ${!currentStatus ? 'vidljiv' : 'sakriven'}.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      flash('Greška', 'Nije uspelo menjanje vidljivosti.', 'error');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteProduct(deleteId);
        flash('Obrisano', 'Proizvod je trajno uklonjen.', 'success');
      } catch (error) {
        console.error(error);
        flash('Greška', 'Nije uspelo brisanje.', 'error');
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <>
      <motion.div
        className={`product-card card relative overflow-hidden max-w-full md:max-w-full w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${
          p.isVisible === false ? 'opacity-75 grayscale-[0.5]' : ''
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Bedž NOVO */}
        {(p.novo ?? false) && (
          <div className="pointer-events-none absolute left-2 top-2 z-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-xl 
              bg-white/70 dark:bg-black/50 border border-white/40 shadow-sm text-zinc-800 dark:text-white"
            >
              ✨ NOVO
            </motion.div>
          </div>
        )}

        {/* Indikator da je proizvod SAKRIVEN (vidljiv adminu) */}
        {p.isVisible === false && (
          <div className="pointer-events-none absolute right-2 top-2 z-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full p-2 backdrop-blur-xl 
              bg-black/60 text-white border border-white/20 shadow-sm"
              title="Proizvod je sakriven"
            >
              <EyeOff size={14} />
            </motion.div>
          </div>
        )}

        {/* Slider */}
        <div className="relative aspect-4/5 w-full overflow-hidden bg-white ">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              drag={showSliderControls ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) paginate(1);
                else if (swipe > swipeConfidenceThreshold) paginate(-1);
              }}
              className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
            >
              <Link
                to={`/product/${p.slug}`}
                className="block w-full h-full"
                draggable={false}
              >
                <img
                  src={
                    imageIndex === 0 && p.thumbnailUrl // Proveravamo da li je prva slika I da li thumbnail postoji
                      ? p.thumbnailUrl // Ako jeste, koristimo optimizovani thumbnail
                      : imgs[imageIndex]?.url ?? p.image // U suprotnom, vraćamo se na punu rezoluciju iz slajdera
                  }
                  alt={p.name}
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </Link>
            </motion.div>
          </AnimatePresence>

          <LayoutGroup>
            <div className="slider-dots absolute inset-x-0 bottom-0 p-3 pointer-events-none">
              <div className="pointer-events-auto">
                {imgs.length > 1 && (
                  <div className="flex justify-center items-center gap-2">
                    {imgs.map((_, idx) => {
                      const active = idx === imageIndex;
                      return (
                        <motion.button
                          key={idx}
                          layout
                          onClick={(e) => {
                            e.preventDefault();
                            setIndex(idx);
                          }}
                          className="relative h-2.5 rounded-full backdrop-blur-sm shadow-sm transition-all duration-300 border border-zinc-500"
                          animate={{
                            width: active ? 24 : 6,
                            backgroundColor: active
                              ? 'rgba(255, 255, 255, 1)'
                              : 'rgba(255, 255, 255, 0.4)',
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </LayoutGroup>
        </div>

        <div className="product-card__body relative bg-zinc-100 z-10 p-4">
          <div className="flex justify-between items-start mb-1 gap-2">
            <div className="product-card__brand text-xs uppercase tracking-wider text-zinc-500 flex-1 min-w-0 truncate pt-1">
              {p.brand}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: imgs?.[0]?.url ?? p.image,
                  brand: p.brand,
                  slug: p.slug,
                });
              }}
              className="p-1.5 rounded-full hover:bg-zinc-200 transition-colors text-zinc-400 hover:text-zinc-600 -mr-1"
              title={isLiked ? 'Ukloni iz želja' : 'Dodaj u želje'}
            >
              <Heart
                size={18}
                className={isLiked ? 'fill-red-500 text-red-500' : ''}
              />
            </button>
          </div>

          <div className="product-card__name font-bold text-lg text-zinc-800 mb-1 leading-tight">
            <Link
              to={`/product/${p.slug}`}
              className="hover:text-blue-600 transition-colors"
            >
              {p.name}
            </Link>
          </div>

          <div className="product-card__footer">
            <div className="product-card__price text-zinc-900 dark:text-white font-medium">
              {money(p.price)}
            </div>

            <button
              className="product-card__btn w-full py-2 bg-neutral-300 text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-400 transition-all hover:shadow-md active:scale-95"
              onClick={addToCart}
            >
              Dodaj u korpu
            </button>
          </div>

          {/* --- ADMIN KONTROLE NA KARTICI --- */}
          {isAdmin && (
            // Izmenjeno u grid-cols-4 da stane i dugme za hide
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 grid grid-cols-4 gap-2">
              {/* 1. Toggle Novo */}
              <button
                onClick={toggleNovo}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                  p.novo
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : 'bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-yellow-50 hover:text-yellow-600'
                }`}
                title="Označi kao Novo"
              >
                <Star size={16} fill={p.novo ? 'currentColor' : 'none'} />
              </button>

              {/* 2. Toggle Vidljivosti (NOVO DUGME) */}
              <button
                onClick={toggleVisibility}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                  p.isVisible === false
                    ? 'bg-zinc-200 text-zinc-500 border border-zinc-300' // Stil kad je sakriven
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' // Stil kad je vidljiv
                }`}
                title={
                  p.isVisible === false ? 'Prikaži proizvod' : 'Sakrij proizvod'
                }
              >
                {p.isVisible === false ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>

              {/* 3. Izmeni */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                title="Izmeni"
              >
                <Edit3 size={16} />
              </button>

              {/* 4. Obriši */}
              <button
                onClick={() => setDeleteId(p.id)}
                className="flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                title="Obriši"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modali */}
      <AnimatePresence>
        {isEditModalOpen && (
          <AdminProductModal
            product={p}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={() => setIsEditModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Obriši proizvod?"
        description="Ova akcija je nepovratna."
        confirmText="Obriši"
        isDanger={true}
      />
    </>
  );
}
