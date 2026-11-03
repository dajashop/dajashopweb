import { useEffect, useRef, useState } from 'react';
import { Reorder, motion } from 'framer-motion';
import { UploadCloud, Trash2, GripHorizontal, Plus, Loader2, ImageIcon, LinkIcon, RotateCcw } from 'lucide-react';
import { useStorefront } from '../../../localization/StorefrontContext.jsx';
import { generateSlug } from '../utils/generators';
import { uploadProductImage } from '../../../services/r2ImageService';
import { resizeToWebP, generateSeoFilename } from '../../../utils/imageProcessing';
import { mediaApi } from '../../../services/dajaPlatform';

const MAX_CONCURRENT_UPLOADS = 1;

export default function ImageManager({ images, onChange, onImageClick, productSlug, productName,
  department, onRemoteUploadSuccess, disabled = false, onBusyChange }) {
  const { t } = useStorefront();
  const fileInputRef = useRef(null);
  const [urlInput, setUrlInput] = useState('');
  const [jobs, setJobs] = useState([]);
  const queue = useRef([]);
  const active = useRef(0);
  const nextPosition = useRef(images.length);
  const mounted = useRef(true);
  const current = useRef({});
  current.current = { images, onChange, onRemoteUploadSuccess, onBusyChange };
  const imagesRef = useRef(images);
  const receivedImagesRef = useRef(images);
  // Local job-status renders can still receive the previous parent props.
  // Do not overwrite an image list already advanced by a completed upload.
  if (receivedImagesRef.current !== images) {
    receivedImagesRef.current = images;
    imagesRef.current = images;
  }

  const discard = image => {
    if (image?.mediaId) void mediaApi.discardUpload(image.mediaId).catch(error =>
      console.error('Brisanje privremene slike nije uspelo:', error));
  };
  const releasePreview = job => {
    if (job.preview) { URL.revokeObjectURL(job.preview); job.preview = null; }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const job of queue.current) {
        releasePreview(job);
        if (job.status === 'ready') discard(job.image);
      }
      queue.current = [];
    };
  }, []);

  // Update refs before notifying the parent: two completions can share one render.
  const publishImages = nextImages => {
    imagesRef.current = nextImages;
    current.current.onChange(nextImages);
  };
  const notify = () => {
    if (!mounted.current) return;
    setJobs(queue.current.map(job => ({ ...job })));
    // Failed slots must be retried or removed before the product can be saved.
    current.current.onBusyChange?.(active.current > 0 || queue.current.length > 0);
  };
  const flushReady = () => {
    const ready = [];
    while (queue.current.length && ['ready', 'cancelled'].includes(queue.current[0].status)) {
      const job = queue.current.shift();
      if (job.status === 'ready') ready.push({ ...job.image, altText: job.altText || '' });
      releasePreview(job);
    }
    if (ready.length) {
      const nextImages = [...imagesRef.current, ...ready];
      publishImages(nextImages);
      // Only the actual first gallery image may update the cover fields.
      if (nextImages[0]?.mediaId === ready[0].mediaId) {
        current.current.onRemoteUploadSuccess?.({ mainImageUrl: ready[0].url,
          thumbnailUrl: ready[0].thumb || ready[0].url });
      }
    }
  };
  const uploadJob = async job => {
    if (job.file) {
      let file = job.file;
      if (job.department === 'naocare') {
        const blob = await resizeToWebP(file, 2400, 0.85, { square: true });
        file = new File([blob], generateSeoFilename(job.slug, job.position, 'original'), { type: 'image/webp' });
      }
      return uploadProductImage(job.slug, file, job.position);
    }
    let asset;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (!mounted.current || job.status === 'cancelled') return null;
      try {
        asset = await mediaApi.registerExternal(job.sourceUrl, { productSlug: job.slug, imageIndex: job.position + 1 });
        break;
      } catch (error) {
        if (attempt === 3 || ![429, 503].includes(error.status)) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(60_000, Math.max(1000, error.retryAfterMs || 3000))));
      }
    }
    const image = { mediaId: asset.id || asset.mediaId, url: asset.mainImageUrl || asset.publicUrl || asset.public_url,
      thumb: asset.thumbnailUrl || asset.thumbnail_url || asset.publicUrl || asset.public_url };
    if (!image.mediaId || !image.url) throw new Error(t('Server nije vratio podatke slike.'));
    return image;
  };
  const pump = () => {
    if (!mounted.current) return;
    while (active.current < MAX_CONCURRENT_UPLOADS) {
      const job = queue.current.find(item => item.status === 'queued');
      if (!job) break;
      job.status = 'uploading'; active.current += 1;
      void uploadJob(job).then(image => {
        if (!mounted.current || job.status === 'cancelled' || !queue.current.includes(job)) {
          discard(image); return;
        }
        job.image = image; job.status = 'ready';
      }).catch(error => {
        if (job.status !== 'cancelled') { job.status = 'failed'; job.error = error?.message || t('Otpremanje nije uspelo.'); }
      }).finally(() => {
        active.current -= 1;
        if (!mounted.current) return;
        flushReady(); pump(); notify();
      });
    }
    notify();
  };
  const enqueue = entries => {
    if (disabled || !entries.length) return;
    const slug = productSlug || (productName ? generateSlug(productName) : '');
    if (!slug) { alert(t('Unesite naziv ili slug pre dodavanja slika.')); return; }
    nextPosition.current = Math.max(nextPosition.current, imagesRef.current.length);
    for (const entry of entries) {
      queue.current.push({ ...entry, id: crypto.randomUUID(), slug, department,
        position: nextPosition.current++, status: 'queued', error: null, altText: '',
        preview: entry.file ? URL.createObjectURL(entry.file) : null });
    }
    // Reserve the slots and block Save synchronously, before either request starts.
    current.current.onBusyChange?.(true);
    pump();
  };
  const handleUpload = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    enqueue(files.map(file => ({ file })));
  };
  const handleUrlUpload = () => {
    const sourceUrls = urlInput.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (!sourceUrls.length || disabled) return;
    try { for (const sourceUrl of sourceUrls) if (!['http:', 'https:'].includes(new URL(sourceUrl).protocol)) throw new Error(); }
    catch { alert(t('Unesite direktan HTTP ili HTTPS link slike.')); return; }
    enqueue(sourceUrls.map(sourceUrl => ({ sourceUrl })));
    setUrlInput('');
  };
  const removeJob = id => {
    const job = queue.current.find(item => item.id === id);
    if (!job) return;
    if (job.status === 'ready') discard(job.image);
    job.status = 'cancelled'; releasePreview(job);
    flushReady(); pump(); notify();
  };
  const retryJob = id => {
    const job = queue.current.find(item => item.id === id);
    if (!job || job.status !== 'failed') return;
    job.status = 'queued'; job.error = null; pump();
  };
  const updateJobAlt = (id, altText) => {
    const job = queue.current.find(item => item.id === id);
    if (!job || job.status === 'cancelled') return;
    job.altText = altText;
    notify();
  };
  const visibleJobs = jobs.filter(job => job.status !== 'cancelled');
  const busy = jobs.length > 0;

  return <fieldset className="space-y-4 min-w-0" disabled={disabled}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
    onDrop={event => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      enqueue(Array.from(event.dataTransfer.files).map(file => ({ file })));
    }}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('Galerija')}</span>
      <button type="button" onClick={() => fileInputRef.current?.click()}
        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
        <UploadCloud size={14} />{t('Dodaj sa računara')}
      </button>
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
    <p className="text-xs text-neutral-500">{t('Izaberite ili prevucite sve slike odjednom. Obrađuju se redom, jedna po jedna.')}</p>
    <p className="text-xs text-neutral-500">{t('Pri dodavanju se priprema velika AVIF slika. Ostale tri verzije obrađuju se od 03:00 do 07:00 po vremenu u Srbiji.')}</p>
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <textarea rows={2} value={urlInput} onChange={event => setUrlInput(event.target.value)}
          placeholder={t('Nalepi linkove slika, svaki u novom redu (http...)')}
          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none" />
      </div>
      <button type="button" onClick={handleUrlUpload} disabled={!urlInput.trim()}
        className="bg-neutral-900 text-white p-2.5 rounded-xl disabled:opacity-50" title={t('Preuzmi sliku')}>
        <Plus size={16} />
      </button>
    </div>
    {busy && <p className="text-xs text-blue-700" role="status">{t('Možete dodati još slika dok traje otpremanje. Redosled dodavanja se čuva.')} {t('Na čekanju:')} {visibleJobs.filter(job => job.status === 'queued').length}</p>}
    <Reorder.Group axis="y"
      values={images} onReorder={nextImages => { if (!disabled && !busy) publishImages(nextImages); }} className="space-y-2 max-h-75 overflow-y-auto custom-scrollbar pr-1">
      {images.map((image, index) => <Reorder.Item key={image.linkId || image.mediaId || image.url} value={image}
        dragListener={!disabled && !busy} className={disabled || busy ? '' : 'cursor-grab active:cursor-grabbing'}>
        <motion.div layout className="flex items-center gap-3 p-2 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="p-2 text-neutral-300"><GripHorizontal size={18} /></div>
          <button type="button" className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-50 shrink-0"
            onClick={() => onImageClick(index)}>
            <img src={image.thumb || image.url || '/placeholder.png'} alt=""
              className={`h-full w-full ${department === 'naocare' ? 'object-contain bg-white p-1' : 'object-cover'}`} />
          </button>
          <div className="flex-1 min-w-0">
            {index === 0 && <span className="text-xs font-semibold text-emerald-700">{t('Glavna slika')}</span>}
            <input value={image.altText || ''} placeholder={`${t('Alt tekst slike')} ${index + 1}`}
              aria-label={`${t('Alt tekst slike')} ${index + 1}`} maxLength={240}
              onPointerDown={event => event.stopPropagation()}
              onChange={event => publishImages(imagesRef.current.map(item =>
                (item.linkId || item.mediaId || item.url) === (image.linkId || image.mediaId || image.url)
                  ? { ...item, altText: event.target.value } : item))}
              className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" />
          </div>
          <button type="button" disabled={busy} title={t('Ukloni sliku')}
            onClick={() => publishImages(imagesRef.current.filter(item => item !== image))}
            className="p-2 text-neutral-400 hover:text-red-500"><Trash2 size={16} /></button>
        </motion.div>
      </Reorder.Item>)}
    </Reorder.Group>
    {visibleJobs.length > 0 && <div className="space-y-2" aria-live="polite">
      {visibleJobs.map((job, index) => <div key={job.id} className={`flex items-center gap-3 rounded-xl border p-3 ${job.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50/50'}`}>
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white flex items-center justify-center">
          {(job.preview || job.image?.thumb || job.image?.url) ? <img loading="lazy" decoding="async" src={job.preview || job.image?.thumb || job.image?.url} alt="" className="h-full w-full object-contain" /> : <ImageIcon size={22} className="text-neutral-400" />}
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <p className="truncate font-semibold">{job.file?.name || `${t('Slika sa linka')} ${images.length + index + 1}`}</p>
          {!images.length && index === 0 && <p className="font-semibold text-emerald-700">{t('Rezervisano mesto glavne slike')}</p>}
          <p>{t(job.status === 'uploading' ? 'Otpremanje i obrada slike…' : job.status === 'ready' ? 'Spremna — čeka prethodnu sliku.' : job.status === 'failed' ? 'Otpremanje nije uspelo. Pokušajte ponovo ili uklonite sliku.' : 'Čeka početak otpremanja…')}</p>
          {job.status === 'failed' && job.error && <p className="mt-1 break-words text-red-700">{job.error}</p>}
          <input value={job.altText || ''} placeholder={`${t('Alt tekst slike')} ${images.length + index + 1}`}
            aria-label={`${t('Alt tekst slike')} ${images.length + index + 1}`} maxLength={240}
            onChange={event => updateJobAlt(job.id, event.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700" />
        </div>
        {job.status === 'uploading' && <Loader2 size={16} className="animate-spin text-blue-600" />}
        {job.status === 'failed' && <button type="button" onClick={() => retryJob(job.id)} title={t('Pokušaj ponovo')} className="p-2 text-blue-700"><RotateCcw size={16} /></button>}
        <button type="button" onClick={() => removeJob(job.id)} title={t('Ukloni sliku')} className="p-2 text-neutral-400 hover:text-red-600"><Trash2 size={16} /></button>
      </div>)}
    </div>}
    {!images.length && !visibleJobs.length && <button type="button" onClick={() => fileInputRef.current?.click()}
      className="w-full border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center text-neutral-400 gap-2">
      <ImageIcon size={24} /><span className="text-sm">{t('Nema slika')}</span>
    </button>}
  </fieldset>;
}
