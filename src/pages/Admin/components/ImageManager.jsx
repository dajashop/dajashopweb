// src/pages/Admin/components/ImageManager.jsx
import { useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Trash2,
  GripHorizontal,
  Plus,
  Loader2,
  ImageIcon,
  LinkIcon,
} from 'lucide-react';

import { generateSlug } from '../utils/generators';
import UploadProgressBar from '../../../components/UploadProgressBar';
import { uploadImages } from '../../../services/products';

import {
  uploadRemoteImage, // <--- DODAJ OVO
  generateThumbnail,
} from '../../../services/admin';

// --- 2. Image Manager (SA CLICK EVENTOM) ---
// --- 2. Image Manager (SA URL UPLOADOM) ---
/**
 * ImageManager komponenta za upravljanje slikama proizvoda.
 * Omogućava dodavanje slika sa računara ili putem URL-a,
 * prikaz liste slika sa mogućnošću reorder-a i brisanja.
 * @param {Object} props - Props za komponentu.
 * @param {Array} props.images - Niz slika (objekti sa url i path).
 * @param {Function} props.onChange - Funkcija koja se poziva pri promeni niza slika.
 * @param {Function} props.onImageClick - Funkcija koja se poziva pri kliku na sliku (za prikaz u većem formatu).
 * @param {string} props.productSlug - Slug proizvoda za imenovanje foldera u skladištu.
 * @param {string} props.productName - Naziv proizvoda (koristi se ako slug nije dostupan).
 * @param {Function} props.onRemoteUploadSuccess - Funkcija koja se poziva nakon uspešnog URL upload-a (za ažuriranje thumbnail i mainImage URL-ova).
 */
function ImageManager({
  images,
  onChange,
  onImageClick,
  productSlug,
  productName,
  onRemoteUploadSuccess,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- NOVI STATE ZA URL ---
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // --- POSTOJEĆI UPLOAD (LOKALNI FAJLOVI) ---
  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const isFirstImageUpload = images.length === 0;

    let storageFolderName = productSlug;
    if (!storageFolderName && productName) {
      storageFolderName = generateSlug(productName);
    }

    if (!storageFolderName) {
      alert("Molim vas unesite 'Naziv' ili 'Slug' pre ubacivanja slika.");
      e.target.value = null;
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadImages(
        storageFolderName,
        files,
        ({ progress }) => setProgress(progress),
      );
      onChange([...images, ...uploaded]);

      if (isFirstImageUpload && uploaded[0]?.path) {
        setThumbnailLoading(true);
        try {
          const res = await generateThumbnail(uploaded[0].path);
          onRemoteUploadSuccess?.(res);
        } catch (thumbnailError) {
          console.error('Thumbnail generation failed', thumbnailError);
        } finally {
          setThumbnailLoading(false);
        }
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Greška pri otpremanju slika.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // --- NOVO: URL UPLOAD HANDLER ---
  const handleUrlUpload = async () => {
    const sanitizedUrlInput = urlInput.trim();
    if (!sanitizedUrlInput) {
      alert('Molim vas unesite validan URL slike.');
      return;
    }

    let storageFolderName = productSlug;
    if (!storageFolderName && productName) {
      storageFolderName = generateSlug(productName);
    }

    if (!storageFolderName) {
      alert("Molim vas unesite 'Naziv' pre preuzimanja slike sa linka.");
      return;
    }

    setUrlLoading(true);
    try {
      // Pozivamo Cloud Function koja sada vraća thumbnailUrl i mainImageUrl kao zasebne atribute
      const res = await uploadRemoteImage(sanitizedUrlInput, storageFolderName);

      if (res.success) {
        // BITNA KOREKCIJA: Filtriramo niz rezultata (res.results) da bismo isključili
        // auto-generisani thumbnail (500x500 sliku), jer on ne treba da bude u reorder listi.
        const additionalImages = (res.results || [])
          .filter(
            (r) => r.success && !r.storagePath.includes('resized_500x500_'),
          )
          .map((r) => ({
            url: r.newUrl, // Ovo je sada ORIGINALNA slika i sve dodatne slike
            path: r.storagePath,
          }));

        if (additionalImages.length > 0) {
          // onChange sada šalje listu slika za reorder listu (samo originalne i dodatne)
          onChange([...images, ...additionalImages]);
          setUrlInput(''); // Reset polja

          // KLJUČNA IZMENA: Šaljemo ceo odgovor nazad roditelju
          onRemoteUploadSuccess?.(res);
        } else {
          alert('Server nije uspeo da preuzme validnu sliku. Proverite link.');
        }
      } else {
        alert('Došlo je do greške pri preuzimanju slike.');
      }
    } catch (error) {
      console.error('Greška na serveru prilikom preuzimanja:', error);
      alert('Greška na serveru prilikom preuzimanja.');
    } finally {
      setUrlLoading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          Galerija
        </span>
        {/* Dugme za lokalni upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          <UploadCloud size={14} /> Dodaj sa računara
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* --- NOVO: URL UPLOAD SEKCIJA --- */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <LinkIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
            placeholder="Nalepi direktan link slike (http...)"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-neutral-800 focus:ring-2 focus:ring-neutral-200 outline-none transition-all placeholder:text-neutral-400"
            disabled={urlLoading}
          />
        </div>
        <button
          onClick={handleUrlUpload}
          disabled={urlLoading || !urlInput}
          className="bg-neutral-900 text-white p-2.5 rounded-xl disabled:opacity-50 hover:bg-black transition-colors shadow-sm"
          title="Preuzmi sliku"
        >
          {urlLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
        </button>
      </div>

      {/* --- PROGRES BAROVI --- */}
      <AnimatePresence>
        {/* Lokalni upload progress */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <UploadProgressBar
              progress={progress}
              label="Otpremanje sa računara..."
            />
          </motion.div>
        )}

        {thumbnailLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 p-2">
              <div className="flex justify-between text-xs mb-1 text-emerald-700 font-medium">
                <span>Generisanje thumbnail-a...</span>
                <Loader2 size={12} className="animate-spin" />
              </div>
              <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* URL upload "fake" progress (jer cloud function ne vraća stream procenata) */}
        {urlLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            {/* Koristimo tvoj UploadProgressBar, ali pošto je server-side proces, 
                 stavljamo animirani loading text ili statični progress */}
            <div className="w-full rounded-2xl border border-blue-100 bg-blue-50/50 p-2">
              <div className="flex justify-between text-xs mb-1 text-blue-700 font-medium">
                <span>Preuzimanje sa servera...</span>
                <Loader2 size={12} className="animate-spin" />
              </div>
              <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LISTA SLIKA (Reorder) --- */}
      <Reorder.Group
        axis="y"
        values={images}
        onReorder={onChange}
        className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1"
      >
        {images.map((img, idx) => (
          <Reorder.Item
            key={img.url}
            value={img}
            className="cursor-grab active:cursor-grabbing"
          >
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-2 bg-white border border-neutral-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group relative"
            >
              <div className="p-2 text-neutral-300 group-hover:text-neutral-400">
                <GripHorizontal size={18} />
              </div>

              {/* Thumbnail */}
              <div
                className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-50 shrink-0 cursor-zoom-in relative"
                onClick={() => onImageClick(idx)}
              >
                <img
                  src={img.url || '/placeholder.png'}
                  alt=""
                  className="h-full w-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-500 truncate font-mono">
                  {img.path ? (
                    img.path.split('/').pop()
                  ) : (
                    <span className="text-emerald-600">Preuzeto sa linka</span>
                  )}
                </p>
                {/* Prikaz originalnog URL-a kao tooltip ili mali tekst ako želiš */}
              </div>
              <button
                type="button"
                onClick={() => removeImage(images.indexOf(img))}
                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {images.length === 0 && !uploading && !urlLoading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center justify-center text-neutral-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer gap-2"
        >
          <ImageIcon size={24} />
          <span className="text-sm font-medium">Nema slika</span>
        </div>
      )}
    </div>
  );
}

export default ImageManager;
