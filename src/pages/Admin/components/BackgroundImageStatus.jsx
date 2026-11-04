import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useStorefront } from '../../../localization/StorefrontContext.jsx';
import { backgroundImageJobs, resumeBackgroundImages, pauseBackgroundImages, subscribeImageQueues, retryImageJob, removeImageJob } from '../../../services/backgroundImageQueue.js';

export default function BackgroundImageStatus() {
  const { user, staffReady } = useAuth();
  const { t } = useStorefront();
  const [, renderImages] = useState(0);
  const [imageQueueError, setImageQueueError] = useState('');
  const ownerId = user?.id;
  useEffect(() => {
    if (!ownerId || !staffReady) return undefined;
    let active = true;
    const unsubscribe = subscribeImageQueues(() => renderImages(value => value + 1));
    void resumeBackgroundImages(ownerId).catch(error => { if (active) setImageQueueError(error.message); });
    return () => { active = false; unsubscribe(); pauseBackgroundImages(); };
  }, [ownerId, staffReady]);
  const imageJobs = ownerId && staffReady ? backgroundImageJobs(ownerId) : [];
  const pending = imageJobs.some(job => !['failed', 'offline'].includes(job.status));
  useEffect(() => {
    if (!pending) return undefined;
    const preventUnload = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [pending]);
  if (!ownerId || !staffReady || (!imageJobs.length && !imageQueueError)) return null;
  return createPortal(<div className="pointer-events-none fixed bottom-28 right-5 z-[4100] flex max-h-[60vh] w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-3 overflow-y-auto md:bottom-5">
      {imageQueueError && <p role="alert" className="pointer-events-auto rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{imageQueueError}</p>}
      {imageJobs.length > 0 && <div role="status" aria-live="polite" className="pointer-events-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
        <p className="text-sm font-bold">{t('Slike u pozadini')} · {imageJobs.length}</p>
        <p className="mt-1 text-xs text-neutral-500">{t('Proizvod je sačuvan. Slike se dodaju automatski kada obrada završi.')}</p>
        <div className="mt-3 max-h-56 space-y-3 overflow-y-auto">{imageJobs.map(job => {
          const failed = ['failed', 'offline'].includes(job.status);
          return <div key={job.id} className="flex items-start gap-2 text-xs">
            {failed ? <CircleAlert size={16} className="shrink-0 text-red-600" /> : <LoaderCircle size={16} className="shrink-0 animate-spin text-neutral-500" />}
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{job.productName || job.slug} · {t('Slika:')} {job.targetPosition + 1}</p>
              <p className={failed ? 'mt-1 break-words text-red-700' : 'mt-1 text-neutral-500'}>{failed ? t(job.error || 'Otpremanje nije uspelo.') : t(job.status === 'attaching' ? 'Povezivanje slike sa proizvodom…' : job.status === 'ready' ? 'Spremna — čeka prethodnu sliku.' : job.status === 'queued' ? 'Čeka početak otpremanja…' : 'Otpremanje i obrada slike…')}</p>
              {failed && <div className="mt-2 flex gap-3"><button type="button" className="font-semibold underline" onClick={() => { void retryImageJob(job.scope, job.id).catch(error => setImageQueueError(error.message)); }}>{t('Pokušaj ponovo')}</button>
                <button type="button" className="underline" onClick={() => { void removeImageJob(job.scope, job.id).catch(error => setImageQueueError(error.message)); }}>{t('Ukloni sliku')}</button></div>}
            </div>
          </div>;
        })}</div>
      </div>}
  </div>, document.body);
}
