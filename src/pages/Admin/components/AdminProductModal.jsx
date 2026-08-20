// src/pages/Admin/components/AdminProductModal.jsx

import { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, Reorder } from 'framer-motion';
// [IZMENA] Dodat Trash2 za brisanje redova
import { X, Save, Plus, Trash2 } from 'lucide-react';
import {
  brandService,
  categoryService,
  departmentService,
  specKeyService,
} from '../../../services/admin';
import { saveProduct } from '../../../services/products';
import { mediaApi, inventoryApi } from '../../../services/dajaPlatform';
import { adminCatalogApi } from '../../../services/dajaPlatform';
import FlashModal from '../../../components/modals/FlashModal.jsx';
// --- NOVI IMPORT ---
import ImageGalleryModal from '../../../components/modals/ImageGalleryModal.jsx';
import ImageManager from './ImageManager.jsx';
import { generateSlug } from '../utils/generators.js';
import CustomSelect from './CustomSelect.jsx';
import ProductOperationsPanel from './ProductOperationsPanel.jsx';

// --- 1. Custom Select ---

// --- 3. Main Modal Component ---
/**
 * Admin Product Modal
 * ... (dokumentacija ostaje ista) ...
 */
export default function AdminProductModal({ product, onClose, onSuccess }) {
  const buildSeoDefaults = (baseProduct = {}) => {
    const baseTitle =
      `${baseProduct.brand || ''} ${baseProduct.name || ''}`.trim();
    return {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      ogImage: '',
      imageAltText: baseTitle,
    };
  };

  const cleanSeoPayload = (seo = {}) => {
    const normalized = {
      metaTitle: (seo.metaTitle || '').trim(),
      metaDescription: (seo.metaDescription || '').trim(),
      metaKeywords: (seo.metaKeywords || '').trim(),
      ogImage: (seo.ogImage || '').trim(),
      imageAltText: (seo.imageAltText || '').trim(),
    };

    return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v));
  };

  const [brands, setBrands] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [cats, setCats] = useState([]);
  const [specKeys, setSpecKeys] = useState([]);
  const [isSeoOpen, setIsSeoOpen] = useState(true);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    price: '',
    images: [],
    description: '',
    gender: '',
    department: 'satovi',
    specs: {},
    variants: [],
    sku: '',
    barcode: '',
    epc: '',
    locationId: '',
    quantity: '1',
    currency: 'RSD',
    // [NOVO] Niz za custom kartice (naslov + podnaslov)
    features: [],
    model3DUrl: '',
    slug: '',
    thumbnailUrl: '',
    mainImageUrl: '',
    seo: buildSeoDefaults(),
    active: true,
    published: true,
  });

  // State za Image Gallery Modal
  const [galleryIndex, setGalleryIndex] = useState(null);

  const [tempSpecKey, setTempSpecKey] = useState('');
  const [tempSpecVal, setTempSpecVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [pendingPrice, setPendingPrice] = useState(null);
  const [flash, setFlash] = useState({ open: false });

  useEffect(() => {
    setDeletedVariantIds([]);
    const sub1 = brandService.subscribe(setBrands);
    const sub2 = categoryService.subscribe(setCats);
    const sub3 = specKeyService.subscribe(setSpecKeys);
    const sub4 = departmentService.subscribe(setDepartments);

    if (product) {
      let loadedImages = [];
      if (product.images && Array.isArray(product.images)) {
        loadedImages = product.images.map((img, idx) => {
          if (typeof img === 'string') {
            return {
              url: img,
              thumb: idx === 0 ? product.thumbnailUrl || img : img,
            };
          }

          return {
            ...img,
            thumb:
              img.thumb ||
              (idx === 0 ? product.thumbnailUrl || img.url : img.url),
          };
        });
      } else if (product.image) {
        loadedImages = [
          { url: product.image, thumb: product.thumbnailUrl || product.image },
        ];
      }

      setForm({
        ...product,
        images: loadedImages,
        specs: product.specs || {},
        variants: Array.isArray(product.variants) ? product.variants.map((variant) => ({
          ...variant,
          price: variant.price ?? (variant.currentPriceAmount ? variant.currentPriceAmount / 100 : ''),
        })) : [],
        sku: product.variants?.[0]?.sku || product.sku || '',
        barcode: product.variants?.[0]?.barcode || product.barcode || '',
        currency: product.variants?.[0]?.currency || product.currency || 'RSD',
        // [NOVO] Učitavamo postojeće features ili postavljamo jedan prazan red
        features:
          product.features && product.features.length > 0
            ? product.features
            : [{ title: '', subtitle: '' }],
        model3DUrl: product.model3DUrl || '',
        department: product.department || 'satovi',
        slug: product.slug || '',
        // [NOVO] Učitavamo postojeće URL-ove ako ih proizvod već ima
        thumbnailUrl: product.thumbnailUrl || '',
        mainImageUrl: product.mainImageUrl || '',
        seo: {
          ...buildSeoDefaults(product),
          ...(product.seo || {}),
        },
      });
    } else {
      // [NOVO] Reset za novi proizvod - dodajemo jedan prazan red da bude spremno
      setForm((prev) => ({
        ...prev,
        features: [{ title: '', subtitle: '' }],
        // [NOVO] Učitavamo postojeće URL-ove ako ih proizvod već ima
        thumbnailUrl: '',
        mainImageUrl: '',
        seo: buildSeoDefaults(),
      }));
    }

    return () => {
      sub1();
      sub2();
      sub3();
      sub4();
    };
  }, [product]);

  useEffect(() => {
    inventoryApi.locations().then(setLocations).catch((error) => console.error('Učitavanje lokacija nije uspelo:', error));
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'department') {
        // A department change must never keep relations from the previous one.
        next.brand = '';
        next.brandId = null;
        next.category = '';
        next.primaryCategoryId = null;
      }
      if (field === 'brand') {
        next.brandId = value
          ? brands.find((brand) => brand.name === value)?.id || null
          : null;
        next.category = '';
        next.primaryCategoryId = null;
      }
      if (field === 'category') {
        next.primaryCategoryId = value
          ? cats.find((category) => category.name === value)?.id || null
          : null;
      }
      return next;
    });
  };

  // --- [NOVO] Funkcije za upravljanje Feature karticama ---
  const handleFeatureChange = (index, field, val) => {
    const newFeatures = [...(form.features || [])];
    if (!newFeatures[index]) newFeatures[index] = { title: '', subtitle: '' };
    newFeatures[index][field] = val;
    setForm((prev) => ({ ...prev, features: newFeatures }));
  };

  const addFeatureRow = () => {
    setForm((prev) => ({
      ...prev,
      features: [...(prev.features || []), { title: '', subtitle: '' }],
    }));
  };

  const removeFeatureRow = (index) => {
    const newFeatures = (form.features || []).filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, features: newFeatures }));
  };
  // --------------------------------------------------------

  const addSpec = () => {
    if (!tempSpecKey || !tempSpecVal) return;
    const def = specKeys.find((k) => k.name === tempSpecKey);
    let finalVal = tempSpecVal;
    if (def?.unit && !tempSpecVal.endsWith(def.unit)) {
      finalVal = `${tempSpecVal} ${def.unit}`;
    }
    setForm((prev) => ({
      ...prev,
      specs: { ...prev.specs, [tempSpecKey]: finalVal },
    }));
    setTempSpecKey('');
    setTempSpecVal('');
  };

  const removeSpec = (key) => {
    const newSpecs = { ...form.specs };
    delete newSpecs[key];
    setForm((prev) => ({ ...prev, specs: newSpecs }));
  };

  // The database keeps one internal sellable record, but the admin UI treats
  // it as the product's own SKU/barcode rather than a user-managed variant.
  const updateVariant = (index, field, value) => setForm((prev) => ({
    ...prev,
    variants: prev.variants.map((variant, currentIndex) => currentIndex === index ? { ...variant, [field]: value } : variant),
  }));


  const handleSubmit = async () => {
    if (!form.name || !form.price) return alert('Naziv i cena su obavezni.');
    setLoading(true);
    try {
      const finalSlug = form.slug || generateSlug(form.name);

      // [NOVO] Filtriramo prazne redove pre čuvanja
      const cleanFeatures = (form.features || []).filter(
        (f) => f.title && f.title.trim() !== '',
      );

      const payload = {
        ...form,
        price: Number(form.price),
        image: form.mainImageUrl || form.images[0]?.url || '',
        slug: finalSlug,
        features: cleanFeatures, // [NOVO] Dodajemo u payload
        seo: cleanSeoPayload(form.seo),
        variants: [{
          ...(form.variants?.[0]?.id ? { id: form.variants[0].id } : {}),
          sku: form.sku || finalSlug,
          barcode: form.barcode || null,
          price: Number(form.price),
          currency: form.currency || 'RSD',
          gender: form.gender || null,
          attributes: form.specs || {},
          active: form.active !== false,
          published: form.published === true,
        }],
      };

      if (!Object.keys(payload.seo).length) {
        delete payload.seo;
      }

      // Preserve relations from older catalogue responses that contained the
      // display name but not the canonical relation IDs.
      const selectedDepartment = departments.find(
        (department) => department.slug === form.department,
      );
      const selectedBrand = brands.find((brand) => brand.name === form.brand);
      const selectedCategory = cats.find((category) => category.name === form.category);
      if (payload.published && !selectedDepartment?.id) {
        throw new Error('Izaberi važeće odeljenje pre objavljivanja proizvoda.');
      }
      // Department is independent from brand. This is essential for products
      // such as batteries that deliberately do not have a brand.
      payload.departmentId = selectedDepartment?.id || null;
      if (selectedBrand?.id) {
        payload.brandId = selectedBrand.id;
      }
      else payload.brandId = null;
      if (selectedCategory?.id) {
        payload.primaryCategoryId = selectedCategory.id;
      }
      else payload.primaryCategoryId = null;

      if (!product) delete payload.id;
      else payload.id = product.id;

      const savedProductId = await saveProduct(payload);
      if (savedProductId && pendingPrice) {
        const savedVariants = await adminCatalogApi.listVariants(savedProductId);
        if (savedVariants[0]?.id) await adminCatalogApi.addVariantPrice(savedVariants[0].id, { amountMinor: Math.round(Number(pendingPrice.amount) * 100), currency: form.currency || 'RSD', priceType: pendingPrice.type, validFrom: pendingPrice.from ? new Date(pendingPrice.from).toISOString() : undefined, validUntil: pendingPrice.until ? new Date(pendingPrice.until).toISOString() : null });
        setPendingPrice(null);
      }
      if (savedProductId && form.locationId && Number(form.quantity) !== 0) {
        const savedVariants = await adminCatalogApi.listVariants(savedProductId);
        const primaryVariant = savedVariants[0];
        if (primaryVariant?.id) {
          await inventoryApi.adjust({
            variantId: primaryVariant.id,
            locationId: form.locationId,
            quantityDelta: Number(form.quantity),
            sourceType: 'admin_product_save',
          });
        }
      }
      await Promise.all(deletedVariantIds.map((variantId) => adminCatalogApi.deleteVariant(variantId)));
      setDeletedVariantIds([]);
      const pendingMedia = (form.images || []).filter((image) => image.mediaId && !image.linkId);
      if (savedProductId && pendingMedia.length) {
        const linked = await Promise.all(
          pendingMedia.map((image, index) =>
            mediaApi.attachToProduct(savedProductId, image.mediaId, {
              position: index,
              isPrimary: index === 0,
            }),
          ),
        );
        setForm((previous) => ({
          ...previous,
          images: previous.images.map((image) => {
            const link = linked.find((item) => item.mediaId === image.mediaId);
            return link ? { ...image, linkId: link.id } : image;
          }),
        }));
      }
      await onSuccess?.();

      setFlash({ open: true, title: 'Uspešno sačuvano!', ok: true });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      setFlash({ open: true, title: 'Greška', ok: false });
    } finally {
      setLoading(false);
    }
  };

  // [NOVO] DEDICIRANI HANDLER ZA SVE PROMENE U NIZU SLIKA (Reorder, Delete, Local Upload)
  // Ovo implementira logiku da se Thumbnail/Main URL menja samo ako se promeni index 0.
  // src/pages/Admin/components/AdminProductModal.jsx

  const handleImageChange = (newImages) => {
    if (product?.id) {
      const retained = new Set(newImages.map((image) => image.linkId).filter(Boolean));
      const removed = (form.images || []).filter((image) => image.linkId && !retained.has(image.linkId));
      if (removed.length) {
        void Promise.all(removed.map((image) => mediaApi.detachFromProduct(product.id, image.linkId)))
          .catch((error) => console.error('Brisanje veze slike nije uspelo:', error));
      }
    }
    setForm((prev) => {
      // URL prve slike pre i posle promene
      const oldPrimaryUrl = prev.images[0]?.url || '';
      const newPrimaryUrl = newImages[0]?.url || '';

      const isPrimaryImageUnchanged = newPrimaryUrl === oldPrimaryUrl;
      const isListNowEmpty = newImages.length === 0;

      let nextThumbnailUrl = prev.thumbnailUrl;
      let nextMainImageUrl = prev.mainImageUrl;

      if (!isPrimaryImageUnchanged && !isListNowEmpty) {
        // SLUČAJ 1: Slika na indexu 0 se promenila (reorderovana ili zamenjena novim LOKALNIM fajlom).
        // GUBIMO link na posvećeni resize URL, pa resetujemo oba na URL nove prve slike.
        nextMainImageUrl = newPrimaryUrl;
        nextThumbnailUrl = newImages[0]?.thumb || newPrimaryUrl;
      } else if (isListNowEmpty) {
        // SLUČAJ 2: Niz je prazan. Resetujemo sve.
        nextMainImageUrl = '';
        nextThumbnailUrl = '';
      } else {
        // SLUČAJ 3: Slika na indexu 0 je ista (promene na indexima > 0).
        // ZADRŽAVAMO postojeće dedicated URL-ove.
        nextMainImageUrl = prev.mainImageUrl;
        nextThumbnailUrl = prev.thumbnailUrl;
      }

      return {
        ...prev,
        images: newImages,
        mainImageUrl: nextMainImageUrl,
        thumbnailUrl: nextThumbnailUrl,
      };
    });
  };

  const handleRemoteImageSuccess = (res) => {
    // očekujemo da backend pošalje različite URL-ove:
    // thumbnailUrl = 500x500, mainImageUrl = original
    if (res.thumbnailUrl && res.mainImageUrl) {
      setForm((prev) => {
        const currentPrimaryUrl = prev.images?.[0]?.url || null;

        // Ako nema slika, tretiramo kao postavljanje prve (primarne) slike
        if (!currentPrimaryUrl) {
          return {
            ...prev,
            thumbnailUrl: res.thumbnailUrl,
            mainImageUrl: res.mainImageUrl,
          };
        }

        // Ako se backend-ov mainImageUrl poklapa sa URL-om slike na indexu 0,
        // znači da upravo ta slika jeste primarna → sme da se override-uje.
        if (currentPrimaryUrl === res.mainImageUrl) {
          return {
            ...prev,
            thumbnailUrl: res.thumbnailUrl,
            mainImageUrl: res.mainImageUrl,
          };
        }

        // U svim ostalim slučajevima (dodavanje slika na index > 0) NE diramo primarne URL-ove
        return prev;
      });

      setFlash({
        open: true,
        title: 'Slika preuzeta i optimizovana!',
        ok: true,
      });
    }
  };

  // Filteri
  const filteredBrands = useMemo(() => {
    const departmentId = departments.find((department) => department.slug === form.department)?.id;
    return departmentId ? brands.filter((brand) => brand.departmentId === departmentId) : brands;
  }, [brands, departments, form.department]);

  const brandOptions = [
    { value: '', label: 'Bez brenda' },
    ...filteredBrands.map((b) => ({
    value: b.name,
    label: b.name,
    id: b.id,
    })),
  ];

  const filteredCats = useMemo(() => {
    const selectedBrand = brands.find((brand) => brand.name === form.brand);
    const departmentId = departments.find((department) => department.slug === form.department)?.id;
    return cats.filter((category) => {
      if (departmentId && category.departmentId !== departmentId) return false;
      return selectedBrand?.id
        ? category.brandId === selectedBrand.id
        : !category.brandId;
    });
  }, [cats, brands, departments, form.brand, form.department]);

  const catOptions = filteredCats.map((c) => ({
    value: c.name,
    label: c.name,
    id: c.id,
  }));

  const filteredSpecs = useMemo(() => {
    const departmentId = departments.find(
      (department) => department.slug === form.department,
    )?.id;

    // New records are related through departmentId; the fallback preserves
    // support for older records that stored the department slug directly.
    return specKeys.filter((specKey) =>
      departmentId
        ? String(specKey.departmentId) === String(departmentId)
        : specKey.department === form.department,
    );
  }, [specKeys, departments, form.department]);

  const specOptions = filteredSpecs.map((k) => ({
    value: k.name,
    label: k.name,
    id: k.id,
    unit: k.unit,
  }));

  const departmentOptions = useMemo(() => {
    if (departments.length) {
      return departments
        .filter((department) => department.slug)
        .map((department) => ({ value: department.slug, label: department.name }));
    }
    return [
      { value: 'satovi', label: 'Satovi' },
      { value: 'daljinski', label: 'Daljinski' },
      { value: 'baterije', label: 'Baterije' },
      { value: 'naocare', label: 'Naočare' },
    ];
  }, [departments]);

  const genderOptions = [
    { value: '', label: 'Unisex' },
    { value: 'MUŠKI', label: 'Muški' },
    { value: 'ŽENSKI', label: 'Ženski' },
  ];

  const activeUnit =
    specOptions.find((o) => o.value === tempSpecKey)?.unit || '';

  const fallbackSeoTitle = `${form.brand || ''} ${form.name || ''}`.trim();
  const fallbackSeoDescription = (form.description || '').trim();
  const effectiveSeoTitle =
    (form.seo?.metaTitle || '').trim() || fallbackSeoTitle;
  const effectiveSeoDescription =
    (form.seo?.metaDescription || '').trim() || fallbackSeoDescription;
  const googlePreviewUrl = `dajashop.rs/product/${form.slug || generateSlug(form.name) || 'proizvod'}`;
  const titleLen = (form.seo?.metaTitle || '').length;
  const descLen = (form.seo?.metaDescription || '').length;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <FlashModal
        {...flash}
        onClose={() => setFlash({ ...flash, open: false })}
      />

      {/* --- IMAGE GALLERY MODAL --- */}
      {galleryIndex !== null && (
        <ImageGalleryModal
          images={form.images}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        data-lenis-prevent
        className="w-full max-w-5xl bg-[#f5f5f7] border border-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-5 border-b border-neutral-200/60 bg-white/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              {product ? 'Izmena proizvoda' : 'Novi proizvod'}
            </h2>
            <p className="text-sm text-neutral-500">
              Popuni detalje i upravljaj inventarom.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-neutral-900 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto custom-scrollbar p-8"
          data-lenis-prevent
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                      Naziv
                    </span>
                    <input
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-400 transition-all font-medium"
                      placeholder="Unesi naziv proizvoda..."
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                      Šifra proizvoda
                    </span>
                    <input
                      value={form.sku || ''}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-sm text-neutral-600 font-mono outline-none focus:ring-2 focus:ring-neutral-200"
                      placeholder="npr. ECB-900DB-1BER"
                    />
                  </label>
                </div>
                <div>
                  <label className="block"><span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Barkod</span><input value={form.barcode || ''} onChange={(e) => handleChange('barcode', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3" placeholder="Barkod" /></label>
                </div>
                <div>
                  <label className="block"><span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">EPC</span><input value={form.epc || ''} onChange={(e) => handleChange('epc', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-mono" placeholder="RFID EPC" /></label>
                </div>
                <div className="md:col-span-1">
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                      Cena (RSD)
                    </span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-mono outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
                      placeholder="0"
                    />
                  </label>
                </div>
                <div className="md:col-span-1">
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                      Opis (Opciono)
                    </span>
                    <input
                      value={form.description || ''}
                      onChange={(e) =>
                        handleChange('description', e.target.value)
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
                      placeholder="Kratak opis..."
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                <CustomSelect
                  label="Odeljenje"
                  value={form.department}
                  options={departmentOptions}
                  onChange={(v) => handleChange('department', v)}
                />
                <CustomSelect
                  label="Brend"
                  value={form.brand}
                  options={brandOptions}
                  onChange={(v) => handleChange('brand', v)}
                  placeholder={
                    brandOptions.length === 1
                      ? 'Nema brendova'
                      : 'Izaberi brend (opciono)'
                  }
                />
                <CustomSelect
                  label="Kategorija"
                  value={form.category}
                  options={catOptions}
                  onChange={(v) => handleChange('category', v)}
                  placeholder={
                    catOptions.length === 0
                      ? form.brand
                        ? 'Nema kategorija za ovaj brend'
                        : 'Nema opštih kategorija'
                      : 'Izaberi kategoriju (opciono)'
                  }
                  disabled={catOptions.length === 0}
                />
                <CustomSelect
                  label="Pol"
                  value={form.gender}
                  options={genderOptions}
                  onChange={(v) => handleChange('gender', v)}
                />
                <CustomSelect label="Lokacija" value={form.locationId || ''} options={locations.map((location) => ({ value: location.id, label: location.name || location.code }))} onChange={(value) => handleChange('locationId', value)} placeholder="Izaberi lokaciju" />
                <label className="block"><span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Količina</span><input type="number" value={form.quantity || ''} onChange={(e) => handleChange('quantity', e.target.value)} placeholder="0" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3" /></label>
                <div className="md:col-span-3">
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                      3D Model URL (.glb)
                    </span>
                    <input
                      value={form.model3DUrl}
                      onChange={(e) =>
                        handleChange('model3DUrl', e.target.value)
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-400 transition-all font-medium"
                      placeholder="/models/moj-sat.glb (iz Storage-a)"
                    />
                  </label>
                </div>
                <div className="md:col-span-3 flex flex-wrap gap-6 text-sm pt-1">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.active !== false} onChange={(e) => handleChange('active', e.target.checked)} /> Aktivan proizvod</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.published !== false} onChange={(e) => handleChange('published', e.target.checked)} /> Objavi proizvod</label>
                </div>
              </div>

              {false && <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">SKU i prodajni podaci</h3>
                    <p className="text-xs text-neutral-500 mt-1">SKU, cena, pol i status se čuvaju zasebno za svaku varijantu.</p>
                  </div>
                </div>
                <div className="md:col-span-3 flex gap-6 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.active !== false} onChange={(e) => handleChange('active', e.target.checked)} /> Aktivan proizvod</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.published === true} onChange={(e) => handleChange('published', e.target.checked)} /> Objavi proizvod</label>
                </div>
                {(form.variants || []).length === 0 && <p className="text-sm text-neutral-400">Nema dodatnih varijanti. Cena iznad ostaje glavna varijanta proizvoda.</p>}
                <div className="space-y-3">
                  {[form.variants?.[0] || {}].map((variant, index) => (
                    <div key={variant.id || index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                      <input value={form.sku || ''} onChange={(e) => handleChange('sku', e.target.value)} placeholder="SKU" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                      <input value={variant.name || ''} onChange={(e) => updateVariant(index, 'name', e.target.value)} placeholder="Naziv varijante" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                      <input value={form.barcode || ''} onChange={(e) => handleChange('barcode', e.target.value)} placeholder="Barkod" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                      <input type="number" value={variant.price ?? ''} onChange={(e) => updateVariant(index, 'price', e.target.value)} placeholder="Cena RSD" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                      <input value={form.currency || 'RSD'} onChange={(e) => handleChange('currency', e.target.value.toUpperCase())} placeholder="Valuta" maxLength={3} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                      <select value={variant.gender || ''} onChange={(e) => updateVariant(index, 'gender', e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                        {genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <div className="flex items-center justify-between gap-2"><span><label className="text-xs flex items-center gap-1"><input type="checkbox" checked={variant.active !== false} onChange={(e) => updateVariant(index, 'active', e.target.checked)} /> Aktivna</label><label className="text-xs flex items-center gap-1"><input type="checkbox" checked={variant.published !== false} onChange={(e) => updateVariant(index, 'published', e.target.checked)} /> Objavljena</label></span></div>
                    </div>
                  ))}
                </div>
              </div>}

              {false && <ProductOperationsPanel productId={product?.id} variants={form.variants || []} />}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 order-last">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                      SEO / Meta Tagovi
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Ova polja su opciona. Ako ostavite prazno, automatski će
                      se koristiti naziv i opis proizvoda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSeoOpen((prev) => !prev)}
                    className="text-xs font-bold text-neutral-700 bg-neutral-100 px-3 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    {isSeoOpen ? 'Sakrij sekciju' : 'Prikaži sekciju'}
                  </button>
                </div>

                {isSeoOpen && (
                  <div className="space-y-5">
                    <label className="block"><span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">URL slug</span><input value={form.slug || generateSlug(form.name)} onChange={(e) => handleChange('slug', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono" placeholder="automatski iz naziva" /><span className="text-[10px] text-neutral-400 ml-1">Ovo je link proizvoda. Ako je prazno, generiše se iz naziva.</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block md:col-span-2">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                          SEO Naslov
                        </span>
                        <input
                          value={form.seo?.metaTitle || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              seo: { ...prev.seo, metaTitle: e.target.value },
                            }))
                          }
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
                          placeholder="Automatski iz brenda i naziva"
                        />
                        <div className="text-[11px] text-neutral-400 mt-1 text-right">
                          {titleLen}/60
                        </div>
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                          SEO Opis
                        </span>
                        <textarea
                          value={form.seo?.metaDescription || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              seo: {
                                ...prev.seo,
                                metaDescription: e.target.value,
                              },
                            }))
                          }
                          rows={3}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200 resize-y"
                          placeholder="Automatski iz opisa proizvoda"
                        />
                        <div className="text-[11px] text-neutral-400 mt-1 text-right">
                          {descLen}/160
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                          Ključne Reči
                        </span>
                        <input
                          value={form.seo?.metaKeywords || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              seo: {
                                ...prev.seo,
                                metaKeywords: e.target.value,
                              },
                            }))
                          }
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
                          placeholder="sat, casio, g-shock, muški sat"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                          OG Slika URL
                        </span>
                        <input
                          value={form.seo?.ogImage || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              seo: { ...prev.seo, ogImage: e.target.value },
                            }))
                          }
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
                          placeholder="Ostavi prazno za glavnu sliku proizvoda"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                          Alt Tekst Slike
                        </span>
                        <input
                          value={form.seo?.imageAltText || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              seo: {
                                ...prev.seo,
                                imageAltText: e.target.value,
                              },
                            }))
                          }
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
                          placeholder="Automatski iz brenda i naziva"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold mb-2">
                        Google Preview
                      </p>
                      <p className="text-base leading-snug text-blue-700 font-medium line-clamp-2">
                        {effectiveSeoTitle || 'Naslov proizvoda'}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {googlePreviewUrl}
                      </p>
                      <p className="text-sm text-neutral-600 mt-2 line-clamp-3">
                        {effectiveSeoDescription ||
                          'Opis proizvoda će biti prikazan ovde.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* --- [NOVO] MANUAL FEATURE TEXT SEKCIJA --- */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                      Istaknute Kartice (Technology)
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Dodaj kartice sa tekstom koje će se prikazati u mreži.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addFeatureRow}
                    className="flex items-center gap-2 text-xs font-bold bg-neutral-100 px-3 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    <Plus size={14} /> Dodaj red
                  </button>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {(form.features || []).map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-3 items-start"
                      >
                        <div className="flex-1">
                          <input
                            placeholder="Naslov (npr. Shock Resist)"
                            value={feature.title}
                            onChange={(e) =>
                              handleFeatureChange(
                                index,
                                'title',
                                e.target.value,
                              )
                            }
                            className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold placeholder:font-normal"
                          />
                        </div>
                        <div className="flex-[1.5]">
                          <input
                            placeholder="Podnaslov (npr. Zaštita od udaraca...)"
                            value={feature.subtitle}
                            onChange={(e) =>
                              handleFeatureChange(
                                index,
                                'subtitle',
                                e.target.value,
                              )
                            }
                            className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFeatureRow(index)}
                          className="p-3 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              {/* --- KRAJ MANUAL FEATURE --- */}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900 mb-4">
                  Tehničke Specifikacije
                </h3>
                <div className="flex gap-3 items-end mb-6 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  <div className="flex-1 min-w-[140px]">
                    <CustomSelect
                      label="Osobina"
                      value={tempSpecKey}
                      options={specOptions}
                      onChange={setTempSpecKey}
                      placeholder={
                        specOptions.length === 0 ? 'Nema opcija' : 'Izaberi...'
                      }
                    />
                  </div>
                  <div className="flex-1 relative">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 block">
                      Vrednost
                    </span>
                    <input
                      value={tempSpecVal}
                      onChange={(e) => setTempSpecVal(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl pl-4 pr-10 py-3 text-sm outline-none focus:border-neutral-400"
                      placeholder="npr. 200"
                    />
                    {activeUnit && (
                      <span className="absolute right-3 top-32px text-neutral-400 text-xs font-bold pointer-events-none">
                        {activeUnit}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={addSpec}
                    disabled={!tempSpecKey || !tempSpecVal}
                    className="bg-neutral-900 text-white p-3 rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-neutral-200"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {Object.entries(form.specs).map(([key, val]) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex justify-between items-center p-3 bg-neutral-50 border border-neutral-100 rounded-xl group"
                      >
                        <div>
                          <span className="text-xs text-neutral-400 block uppercase font-bold">
                            {key}
                          </span>
                          <span className="text-sm font-medium text-neutral-800">
                            {val}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSpec(key)}
                          className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {Object.keys(form.specs).length === 0 && (
                  <div className="text-center py-6 text-neutral-400 text-sm border-2 border-dashed border-neutral-100 rounded-xl">
                    Nema dodatih specifikacija
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                {/* PROSLEĐUJEMO onImageClick */}
                <ImageManager
                  images={form.images}
                  onChange={handleImageChange} // KORISTIMO DEDICIRANI HANDLER
                  onImageClick={(index) => setGalleryIndex(index)} // OTVARA GALERIJU
                  productSlug={form.slug} // <--- Dodato
                  productName={form.name} // <--- Dodato
                  onRemoteUploadSuccess={handleRemoteImageSuccess}
                />
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                  <p className="flex gap-2 items-start">
                    <span className="text-lg">💡</span>
                    <span>
                      Klikni na sliku za pregled. Prva slika je glavna.
                    </span>
                  </p>
                </div>
              </div>
              <ProductOperationsPanel productId={product?.id} variants={form.variants || []} basePrice={form.price} onBasePriceChange={(value) => handleChange('price', value)} onPendingPrice={setPendingPrice} />
            </div>
          </div>
        </div>

        <div className="px-8 py-5 bg-white border-t border-neutral-100 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-neutral-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black hover:shadow-lg hover:shadow-neutral-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {loading ? (
              'Čuvanje...'
            ) : (
              <>
                <Save size={18} /> Sačuvaj promene
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
