import { useEffect, useRef, useState } from 'react';
import { Reorder, motion } from 'framer-motion';
import { UploadCloud, Trash2, GripHorizontal, Plus, Loader2, ImageIcon, LinkIcon, RotateCcw } from 'lucide-react';
import { useStorefront } from '../../../localization/StorefrontContext.jsx';
import { generateSlug } from '../utils/generators';
import { imageQueue, loadImageQueue, reloadImageQueue, subscribeImageQueues, enqueueImages, retryImageJob, removeImageJob, forgetDraftImage, updateImageJobAlt } from '../../../services/backgroundImageQueue';

const imageKey = image => image.linkId || image.mediaId || image.url;

export function keepImageClipboardShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
    // Keep the input's native clipboard action without sending it to modal shortcuts.
    event.stopPropagation();
  }
}

export default function ImageManager({ images, onChange, onImageClick, productSlug, productName,
  department, onRemoteUploadSuccess, disabled = false, galleryReady = true, onBusyChange, uploadQueueScope }) {
  const { t } = useStorefront();
  const fileInputRef = useRef(null);
  const [urlInput, setUrlInput] = useState('');
  const [, render] = useState(0);
  const current = useRef({});
  current.current = { images, onChange, onRemoteUploadSuccess, onBusyChange };
  const state = imageQueue(uploadQueueScope);
  const hydrated = state.hydrated;
  const storageError = state.error;
  const jobs = state.jobs;
  const publishImages = next => {
    current.current.images = next;
    current.current.onChange(next);
  };
  useEffect(() => {
    if (disabled || !galleryReady) return undefined;
    // A reopened editor starts from server/draft images, not the previous
    // component's unpublished gallery state.
    imageQueue(uploadQueueScope).jobs.forEach(job => { job.published = false; });
    const update = () => {
      const q = imageQueue(uploadQueueScope);
      if (!q.saving) {
        const ready = [];
        for (const job of q.jobs) {
          if (job.targetProductId || job.operation === 'remove') continue;
          if (job.status !== 'ready') break;
          if (job.published) continue;
          job.published = true;
          if (!current.current.images.some(image => image.mediaId === job.image.mediaId)) ready.push({ ...job.image, altText: job.altText || '' });
        }
        if (ready.length) {
          const next = [...current.current.images, ...ready];
          current.current.images = next;
          current.current.onChange(next);
          if (next[0]?.mediaId === ready[0].mediaId) current.current.onRemoteUploadSuccess?.({ mainImageUrl: ready[0].url, thumbnailUrl: ready[0].thumb || ready[0].url });
        }
      }
      // Save waits only for durable local storage, not image optimization.
      current.current.onBusyChange?.(!q.hydrated || Boolean(q.persisting || q.removing || q.error));
      render(value => value + 1);
    };
    const unsubscribe = subscribeImageQueues(update);
    void loadImageQueue(uploadQueueScope).then(update).catch(update);
    return unsubscribe;
  }, [uploadQueueScope, disabled, galleryReady]);
  const enqueue = async entries => {
    if (disabled || !galleryReady || !hydrated || !entries.length) return;
    const slug = productSlug || (productName ? generateSlug(productName) : '');
    if (!slug) { alert(t('Unesite naziv ili slug pre dodavanja slika.')); return; }
    try { await enqueueImages(uploadQueueScope, entries, { slug, department, productName, imageCount: images.length }); }
    catch (error) { state.error = error.message; render(value => value + 1); onBusyChange?.(true); }
  };
  const handleUpload = event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    void enqueue(files.map(file => ({ file })));
  };
  const handleUrlUpload = () => {
    const sourceUrls = urlInput.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (!sourceUrls.length || disabled) return;
    try { for (const sourceUrl of sourceUrls) if (!['http:', 'https:'].includes(new URL(sourceUrl).protocol)) throw new Error(); }
    catch { alert(t('Unesite direktan HTTP ili HTTPS link slike.')); return; }
    void enqueue(sourceUrls.map(sourceUrl => ({ sourceUrl }))); setUrlInput('');
  };
  const action = operation => { void operation.catch(error => { state.error = error.message; render(value => value + 1); }); };
  const retryJob = id => action(retryImageJob(uploadQueueScope, id));
  const removeJob = id => action(removeImageJob(uploadQueueScope, id));
  const removeImage = image => action((async () => {
    if (image.mediaId) await forgetDraftImage(uploadQueueScope, image.mediaId);
    publishImages(current.current.images.filter(item => imageKey(item) !== imageKey(image)));
  })());
  const updateJobAlt = (id, text) => action(updateImageJobAlt(uploadQueueScope, id, text));
  const reloadQueue = () => action(reloadImageQueue(uploadQueueScope).then(() => {
    onBusyChange?.(Boolean(imageQueue(uploadQueueScope).error));
    render(value => value + 1);
  }));
  const visibleJobs = jobs.filter(job => !job.published);
  const busy = visibleJobs.length > 0 || !hydrated || state.removing;

  return <fieldset className="space-y-4 min-w-0" disabled={disabled}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
    onDrop={event => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      enqueue(Array.from(event.dataTransfer.files).map(file => ({ file })));
    }}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('Galerija')}</span>
      <button type="button" disabled={!hydrated || !galleryReady} onClick={() => fileInputRef.current?.click()}
        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
        <UploadCloud size={14} />{t('Dodaj sa računara')}
      </button>
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
    <p className="text-xs text-neutral-500">{t('Izaberite ili prevucite sve slike odjednom. Red se čuva u ovom pregledaču i nastavlja posle osvežavanja kada se veza vrati.')}</p>
    {storageError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
      <p>{t(storageError)}</p><button type="button" onClick={reloadQueue} className="mt-2 font-semibold underline">{t('Pokušaj ponovo')}</button>
    </div>}
    {!hydrated && !storageError && <p role="status" className="text-xs text-neutral-500">{t('Proveravam sačuvani red slika…')}</p>}
    <p className="text-xs text-neutral-500">{t('Original se čuva odmah. Optimizovane verzije stižu čim se obrada završi.')}</p>
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <textarea rows={2} value={urlInput} onChange={event => setUrlInput(event.target.value)}
          placeholder={t('Nalepi linkove slika, svaki u novom redu (http...)')}
          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none" />
      </div>
      <button type="button" onClick={handleUrlUpload} disabled={!urlInput.trim() || !hydrated || !galleryReady}
        className="bg-neutral-900 text-white p-2.5 rounded-xl disabled:opacity-50" title={t('Preuzmi sliku')}>
        <Plus size={16} />
      </button>
    </div>
    {busy && <p className="text-xs text-blue-700" role="status">{t('Možete sačuvati proizvod dok se slike obrađuju. Napredak i greške prikazuju se pri dnu ekrana.')} {t('Na čekanju:')} {visibleJobs.filter(job => job.status === 'queued').length}</p>}
    <Reorder.Group axis="y"
      values={images} onReorder={nextImages => { if (!disabled && !busy) publishImages(nextImages); }} className="space-y-2 max-h-75 overflow-y-auto custom-scrollbar pr-1">
      {images.map((image, index) => <Reorder.Item key={imageKey(image)} value={image}
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
              onKeyDown={keepImageClipboardShortcut}
              onChange={event => publishImages(current.current.images.map(item =>
                imageKey(item) === imageKey(image)
                  ? { ...item, altText: event.target.value } : item))}
              className="w-full select-text rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" />
          </div>
          <button type="button" disabled={!hydrated || state.removing} title={t('Ukloni sliku')}
            onClick={() => removeImage(image)}
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
          <p>{t(job.status === 'uploading' ? 'Otpremanje i obrada slike…' : job.status === 'ready' ? 'Spremna — čeka prethodnu sliku.' : job.status === 'offline' ? 'Nema veze sa serverom. Red će nastaviti kada internet proradi.' : job.status === 'removing' ? 'Čeka potvrdu brisanja sa servera…' : job.status === 'failed' ? 'Otpremanje nije uspelo. Pokušajte ponovo ili uklonite sliku.' : 'Čeka početak otpremanja…')}</p>
          {job.status === 'failed' && job.error && <p className="mt-1 break-words text-red-700">{job.error}</p>}
          <input value={job.altText || ''} placeholder={`${t('Alt tekst slike')} ${images.length + index + 1}`}
            aria-label={`${t('Alt tekst slike')} ${images.length + index + 1}`} maxLength={240}
            onKeyDown={keepImageClipboardShortcut}
            onChange={event => updateJobAlt(job.id, event.target.value)}
            className="mt-2 w-full select-text rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700" />
        </div>
        {job.status === 'uploading' && <Loader2 size={16} className="animate-spin text-blue-600" />}
        {(job.status === 'failed' || job.status === 'offline') && <button type="button" onClick={() => retryJob(job.id)} title={t('Pokušaj ponovo')} className="p-2 text-blue-700"><RotateCcw size={16} /></button>}
        <button type="button" disabled={['uploading', 'attaching', 'removing'].includes(job.status)} onClick={() => void removeJob(job.id)} title={t('Ukloni sliku')} className="p-2 text-neutral-400 hover:text-red-600 disabled:opacity-50"><Trash2 size={16} /></button>
      </div>)}
    </div>}
    {!images.length && !visibleJobs.length && <button type="button" onClick={() => fileInputRef.current?.click()}
      className="w-full border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center text-neutral-400 gap-2">
      <ImageIcon size={24} /><span className="text-sm">{t('Nema slika')}</span>
    </button>}
  </fieldset>;
}
