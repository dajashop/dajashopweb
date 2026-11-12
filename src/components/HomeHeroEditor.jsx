import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, ImagePlus, PencilLine, Plus, Trash2, X } from 'lucide-react';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import { homeHeroApi, mediaApi } from '../services/dajaPlatform.js';
import { uploadStorefrontImage } from '../services/r2ImageService.js';
import { useFlash } from '../hooks/useFlash.js';
import './HomeHeroEditor.css';

const imagePositions = {
  center: 'Sredina',
  top: 'Gornja ivica',
  bottom: 'Donja ivica',
  left: 'Leva ivica',
  right: 'Desna ivica',
};

function makeSlide() {
  return {
    id: crypto.randomUUID(), title: '', active: true, desktopSrc: '', mobileSrc: '',
    alt: '', altEn: '', to: '', desktopFrame: { width: 1534, height: 678 },
    mobileFrame: { width: 750, height: 1000 }, fit: 'contain', zoom: 102, animation: true,
  };
}

function ImageField({ kind, slide, busy, onChange, onUpload }) {
  const { t } = useStorefront();
  const frameKey = `${kind}Frame`;
  const positionKey = `${kind}Position`;
  const frame = slide[frameKey];
  const position = slide[positionKey] || 'center';
  const source = slide[`${kind}Src`];
  const ratio = Number(frame.width) / Number(frame.height);
  const previewRatio = Number.isFinite(ratio) && ratio > 0 ? Math.min(5, Math.max(0.25, ratio)) : 1;

  return (
    <fieldset className="homeHeroImageField">
      <legend>{t(kind === 'desktop' ? 'Slika za računar' : 'Slika za telefon')}</legend>
      <div className="homeHeroImageField__stage">
        <div className="homeHeroImageField__preview" style={{
          aspectRatio: previewRatio,
          maxWidth: `${Math.round(previewRatio * 160)}px`,
        }}>
          {source
            ? <img src={source} alt="" style={{
              objectFit: slide.fit, objectPosition: position,
              transform: `scale(${slide.animation ? slide.zoom / 100 : 1})`,
            }} />
            : <span>{t('Slika nije izabrana')}</span>}
        </div>
      </div>
      <label className="homeHeroImageField__upload">
        <ImagePlus size={16} aria-hidden="true" />
        {t(source ? 'Zameni sliku' : 'Izaberi sliku')}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy}
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(kind, file); }} />
      </label>
      <div className="homeHeroImageField__frame">
        {['width', 'height'].map(dimension => (
          <label key={dimension}>
            {t(dimension === 'width' ? 'Širina okvira' : 'Visina okvira')}
            <input type="number" required min="200" max="5000" value={frame[dimension]}
              onChange={event => onChange({ [frameKey]: { ...frame, [dimension]: event.target.value } })} />
          </label>
        ))}
      </div>
      <label className="homeHeroImageField__position">{t('Položaj slike')}
        <select value={position} onChange={event => onChange({ [positionKey]: event.target.value })}>
          {Object.entries(imagePositions).map(([value, label]) => <option value={value} key={value}>{t(label)}</option>)}
        </select>
      </label>
    </fieldset>
  );
}

export default function HomeHeroEditor({ onSaved }) {
  const { t } = useStorefront();
  const { flash } = useFlash();
  const dialog = useRef(null);
  const trigger = useRef(null);
  const uploaded = useRef(new Set());
  const mounted = useRef(true);
  const pending = useRef(null);
  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const slides = draft?.slides ?? [];
  const index = slides.findIndex(slide => slide.id === selectedId);
  const selected = slides[index];

  function discardUploads(keep = new Set()) {
    for (const id of uploaded.current) {
      if (!keep.has(id)) void mediaApi.discardUpload(id).catch(() => {});
    }
    uploaded.current.clear();
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      // A pending save or upload settles before its unused images are discarded.
      if (!pending.current?.operation) discardUploads();
    };
  }, []);

  async function loadEditor() {
    if (!dialog.current.open) dialog.current.showModal();
    setDraft(null);
    setError('');
    const controller = new AbortController();
    pending.current = controller;
    setBusy('load');
    try {
      const settings = await homeHeroApi.admin(AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]));
      if (controller.signal.aborted) return;
      setDraft(settings);
      setSelectedId(settings.slides[0]?.id ?? '');
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || t('Baneri trenutno nisu dostupni.'));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (mounted.current) setBusy('');
      }
    }
  }

  function closeEditor() {
    if (busy === 'upload' || busy === 'save') return;
    pending.current?.abort();
    discardUploads();
    dialog.current.close();
    trigger.current?.focus();
  }

  function updateSlide(patch) {
    setDraft(current => ({
      ...current, slides: current.slides.map(slide => slide.id === selectedId ? { ...slide, ...patch } : slide),
    }));
  }

  function setSlides(next) {
    setDraft(current => ({ ...current, slides: next }));
  }

  function addSlide(copy) {
    const slide = copy
      ? { ...selected, id: crypto.randomUUID(), title: `${selected.title} (${t('kopija')})`.slice(0, 100) }
      : makeSlide();
    const next = [...slides];
    next.splice(copy ? index + 1 : next.length, 0, slide);
    setSlides(next);
    setSelectedId(slide.id);
  }

  function moveSlide(offset) {
    const next = [...slides];
    next.splice(index, 1);
    next.splice(index + offset, 0, selected);
    setSlides(next);
  }

  function deleteSlide() {
    const next = slides.filter(slide => slide.id !== selectedId);
    setSlides(next);
    setSelectedId(next[Math.min(index, next.length - 1)].id);
  }

  async function uploadImage(kind, file) {
    setError('');
    setBusy('upload');
    pending.current = { operation: true, abort() {} };
    let mediaId;
    try {
      const image = await uploadStorefrontImage(file, { onMediaId: id => { mediaId = id; } });
      if (!image.url) throw new Error(t('Slika nije otpremljena.'));
      uploaded.current.add(image.mediaId);
      if (mounted.current) updateSlide({ [`${kind}Src`]: image.url, [`${kind}MediaId`]: image.mediaId });
    } catch (failure) {
      if (mediaId) void mediaApi.discardUpload(mediaId).catch(() => {});
      if (mounted.current) setError(failure.message || t('Slika nije otpremljena.'));
    } finally {
      pending.current = null;
      if (mounted.current) setBusy('');
      else discardUploads();
    }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !draft) return;
    const normalized = slides.map(slide => ({
      ...slide, title: slide.title.trim() || t('Novi baner'), to: slide.to.trim(),
    }));
    const invalid = normalized.find(slide => !slide.desktopSrc || !slide.mobileSrc ||
      [slide.desktopFrame, slide.mobileFrame].some(({ width, height }) =>
        ![width, height].every(value => Number.isInteger(Number(value)) && Number(value) >= 200 && Number(value) <= 5000) ||
        width / height < 0.25 || width / height > 5) ||
      (slide.to && !/^\/(?!\/)[^\\\s]*$/.test(slide.to)));
    if (invalid) {
      setSelectedId(invalid.id);
      setError(t('Proveri obe slike, dimenzije okvira i link. Link mora da počne sa / i da vodi na stranicu prodavnice.'));
      return;
    }
    if (!normalized.some(slide => slide.active)) {
      setError(t('Ostavi uključen bar jedan baner.'));
      return;
    }

    setError('');
    setBusy('save');
    pending.current = { operation: true, abort() {} };
    try {
      const saved = await homeHeroApi.save({ expectedVersion: draft.version, intervalMs: draft.intervalMs, slides: normalized });
      discardUploads(new Set(saved.slides.flatMap(slide => [slide.desktopMediaId, slide.mobileMediaId])));
      if (!mounted.current) return;
      onSaved(saved);
      dialog.current.close();
      trigger.current?.focus();
      flash(t('Sačuvano'), t('Baneri na početnoj stranici su ažurirani.'), 'success');
    } catch (failure) {
      if (mounted.current) setError(failure.status === 409
        ? t('Baneri su u međuvremenu izmenjeni. Otvori uređivač ponovo da učitaš najnoviju verziju.')
        : failure.message || t('Baneri nisu sačuvani.'));
    } finally {
      pending.current = null;
      if (mounted.current) setBusy('');
      else discardUploads();
    }
  }

  const locked = busy === 'upload' || busy === 'save';

  return (
    <>
      <button ref={trigger} type="button" className="homeHeroEditTrigger" onClick={loadEditor}>
        <PencilLine size={16} aria-hidden="true" />{t('Uredi banere')}
      </button>

      <dialog ref={dialog} className="homeHeroEditor" aria-labelledby="home-hero-editor-title"
        onCancel={event => { event.preventDefault(); closeEditor(); }}>
        <form onSubmit={save}>
          <header className="homeHeroEditor__header">
            <h2 id="home-hero-editor-title">{t('Baneri početne stranice')}</h2>
            <button type="button" className="homeHeroEditor__icon" onClick={closeEditor} disabled={locked} aria-label={t('Zatvori')}><X size={20} /></button>
          </header>

          {busy === 'load' && <p className="homeHeroEditor__status" role="status">{t('Učitavanje banera...')}</p>}
          {draft && (
            <div className="homeHeroEditor__body">
              <fieldset className="homeHeroEditor__list" disabled={locked}>
                <div className="homeHeroEditor__order">
                  {slides.map((slide, position) => (
                    <button type="button" key={slide.id} aria-pressed={selectedId === slide.id} onClick={() => setSelectedId(slide.id)}>
                      <span>{position + 1}.</span>
                      <strong>{slide.title || t('Novi baner')}</strong>
                      {!slide.active && <small>{t('Sakriven')}</small>}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn--ghost" disabled={slides.length >= 20} onClick={() => addSlide(false)}>
                  <Plus size={16} aria-hidden="true" />{t('Dodaj baner')}
                </button>
              </fieldset>

              {selected && (
                <fieldset className="homeHeroEditor__detail" disabled={locked}>
                  <div className="homeHeroEditor__tools">
                    <label className="homeHeroEditor__check">
                      <input type="checkbox" checked={selected.active} onChange={event => updateSlide({ active: event.target.checked })} />
                      {t('Prikaži na sajtu')}
                    </label>
                    <div className="homeHeroEditor__actions">
                      {[
                        [ArrowUp, 'Pomeri gore', index === 0, () => moveSlide(-1)],
                        [ArrowDown, 'Pomeri dole', index === slides.length - 1, () => moveSlide(1)],
                        [Copy, 'Napravi kopiju', slides.length >= 20, () => addSlide(true)],
                        [Trash2, 'Obriši baner', slides.length <= 1, deleteSlide],
                      ].map(([Icon, label, disabled, action]) => (
                        <button key={label} type="button" className="homeHeroEditor__icon" title={t(label)} aria-label={t(label)}
                          disabled={disabled} onClick={action}><Icon size={17} /></button>
                      ))}
                    </div>
                  </div>

                  <div className="homeHeroEditor__fields">
                    <label>{t('Naziv banera')}<input maxLength={100} value={selected.title} onChange={event => updateSlide({ title: event.target.value })} /></label>
                    <label>{t('Link banera')}<input maxLength={500} value={selected.to} placeholder="/catalog?brand=ORIENT" onChange={event => updateSlide({ to: event.target.value })} /></label>
                    <label>{t('Opis slike (srpski)')}<input maxLength={200} value={selected.alt} onChange={event => updateSlide({ alt: event.target.value })} /></label>
                    <label>{t('Opis slike (engleski)')}<input maxLength={200} value={selected.altEn || ''} onChange={event => updateSlide({ altEn: event.target.value })} /></label>
                  </div>

                  <div className="homeHeroEditor__images">
                    {['desktop', 'mobile'].map(kind => (
                      <ImageField key={kind} kind={kind} slide={selected} busy={locked} onChange={updateSlide} onUpload={uploadImage} />
                    ))}
                  </div>

                  <div className="homeHeroEditor__fields">
                    <label>{t('Prikaz slike')}
                      <select value={selected.fit} onChange={event => updateSlide({ fit: event.target.value })}>
                        <option value="contain">{t('Cela slika')}</option>
                        <option value="cover">{t('Popuni okvir')}</option>
                      </select>
                    </label>
                    <label>{t('Blago uvećanje')} · {selected.animation ? selected.zoom : 100}%
                      <input type="range" min="100" max="108" value={selected.zoom} disabled={!selected.animation}
                        onChange={event => updateSlide({ zoom: Number(event.target.value) })} />
                    </label>
                    <label className="homeHeroEditor__check">
                      <input type="checkbox" checked={selected.animation} onChange={event => updateSlide({ animation: event.target.checked })} />
                      {t('Uključi blagu animaciju')}
                    </label>
                    <label>{t('Automatska promena banera')}
                      <select value={draft.intervalMs} onChange={event => setDraft(current => ({ ...current, intervalMs: Number(event.target.value) }))}>
                        <option value={0}>{t('Isključena')}</option>
                        {[3000, 5600, 8000, 10000, 15000, 30000].map(value => (
                          <option key={value} value={value}>{t('{count} sek.', { count: value / 1000 })}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </fieldset>
              )}
            </div>
          )}

          <footer className="homeHeroEditor__footer">
            {error && <p className="homeHeroEditor__error" role="alert">{error}</p>}
            {busy === 'upload' && <span role="status">{t('Otpremanje slike...')}</span>}
            <button type="button" className="btn btn--ghost" onClick={closeEditor} disabled={locked}>{t('Otkaži')}</button>
            {draft && <button type="submit" className="btn btn--dark" disabled={Boolean(busy)}>{t(busy === 'save' ? 'Čuvanje...' : 'Sačuvaj promene')}</button>}
            {!draft && error && <button type="button" className="btn btn--dark" onClick={loadEditor}>{t('Pokušaj ponovo')}</button>}
          </footer>
        </form>
      </dialog>
    </>
  );
}
