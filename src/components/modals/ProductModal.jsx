import React, { useState, useRef, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UploadCloud,
  Loader2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { saveProduct, uploadImages } from '../../services/products';
import UploadProgressBar from '../UploadProgressBar'; // Proveri putanju ako je drugačija

export default function ProductModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [form, setForm] = useState({
    brand: '',
    name: '',
    price: '',
    category: '',
    gender: 'MUŠKI',
    slug: '',
  });

  // Resetovanje stanja pri zatvaranju
  const close = () => {
    setForm({
      brand: '',
      name: '',
      price: '',
      category: '',
      gender: 'MUŠKI',
      slug: '',
    });
    setSelectedFiles([]);
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url)); // Očisti memoriju
      return [];
    });
    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') {
      setForm((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/[^\w-]+/g, ''),
      }));
    }
  };

  // --- RUKOVANJE SLIKAMA ---

  const handleFileSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Generiši preview URL-ove
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const urlToRemove = prev[index];
      URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Cleanup preview URL-ova kada se komponenta unmountuje
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  // --- SLANJE ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    try {
      const newId = `${form.brand.toLowerCase()}-${Date.now()}`;
      let uploadedImages = [];
      let imageUrl = '/placeholder.png';

      // Ako ima slika, otpremi ih
      if (selectedFiles.length > 0) {
        setIsUploading(true);

        // Pravi mapu file -> index UNAPRED (izbegava indexOf koji je O(n))
        const fileIndexMap = new Map();
        Array.from(selectedFiles).forEach((file, idx) => {
          fileIndexMap.set(file, idx);
        });

        // Praćenje progresa za svaki fajl pojedinačno da bismo dobili prosečan total
        const fileProgressMap = new Array(selectedFiles.length).fill(0);

        uploadedImages = await uploadImages(
          newId,
          selectedFiles,
          ({ file, progress }) => {
            // Koristi prethodno kreiranu mapu (O(1) lookup)
            const idx = fileIndexMap.get(file);
            if (idx !== undefined) {
              fileProgressMap[idx] = progress;
              const total = fileProgressMap.reduce((a, b) => a + b, 0);
              setUploadProgress(Math.round(total / selectedFiles.length));
            }
          },
        );

        if (uploadedImages.length > 0) {
          imageUrl = uploadedImages[0].url; // Prva slika je glavna
        }
        setIsUploading(false);
      }

      // Čuvanje u bazu
      await saveProduct({
        id: newId,
        ...form,
        price: Number(form.price),
        image: imageUrl, // Glavna slika (string)
        images: uploadedImages, // Niz svih slika (array objects)
        novo: true,
        specs: {},
      });

      close();
    } catch (error) {
      console.error(error);
      alert('Greška pri čuvanju.');
      setIsUploading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-md p-4">
          <motion.div
            // Glass card stilizovan sa tvojim varijablama
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
                Novi proizvod
              </h2>
              <button
                onClick={close}
                className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-bg)] text-[var(--color-muted)] transition hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* PROGRESS BAR (Prikazuje se samo tokom uploada) */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                >
                  <UploadProgressBar
                    progress={uploadProgress}
                    label={`Otpremanje ${selectedFiles.length} slika...`}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="grid gap-5">
              {/* RED 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Brend
                  </label>
                  <input
                    required
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    placeholder="npr. CASIO"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] placeholder:text-neutral-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Kategorija
                  </label>
                  <input
                    required
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="npr. RETRO"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] placeholder:text-neutral-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* RED 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Naziv modela
                </label>
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Unesi naziv modela"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] placeholder:text-neutral-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none transition"
                />
              </div>

              {/* RED 3 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Cena (RSD)
                  </label>
                  <input
                    required
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] placeholder:text-neutral-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Pol
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none transition"
                  >
                    <option value="MUŠKI">MUŠKI</option>
                    <option value="ŽENSKI">ŽENSKI</option>
                    <option value="UNISEX">UNISEX</option>
                  </select>
                </div>
              </div>

              {/* UPLOAD SEKCIJA */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Slike proizvoda{' '}
                  {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </label>

                {/* Drop zona */}
                <div
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/50 py-6 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple // <-- Omogućava više fajlova
                    hidden
                    onChange={handleFileSelect}
                  />
                  <UploadCloud
                    className="mb-2 text-[var(--color-muted)] transition group-hover:text-[var(--color-primary)]"
                    size={32}
                  />
                  <span className="text-sm font-medium text-[var(--color-muted)] group-hover:text-[var(--color-text)]">
                    Klikni za odabir slika (može više)
                  </span>
                </div>

                {/* PREVIEW GRID */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {previews.map((src, i) => (
                      <div
                        key={src}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]"
                      >
                        <img
                          src={src}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        {/* Dugme za brisanje */}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                          title="Ukloni sliku"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SUBMIT DUGME */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 font-bold text-[var(--color-onPrimary,white)] shadow-lg shadow-[var(--color-primary)]/20 transition active:scale-95 disabled:opacity-70 hover:bg-[var(--color-primary-dark)]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  `Dodaj proizvod ${
                    selectedFiles.length > 1
                      ? `(${selectedFiles.length} slika)`
                      : ''
                  }`
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
