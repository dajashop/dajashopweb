import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, RotateCcw, Eye, Scan, Mouse, Search, Undo2, Redo2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import useProducts from '../hooks/useProducts';
import useProduct from '../hooks/useProduct';
import SEOHead from '../components/seo/SEOHead';
import WatchPreview from '../components/engraving/WatchPreview';
import SimpleControls from '../components/engraving/SimpleControls';
import { newText, diameterOf, normalizeDesign, outsideZone, renderDesign, importImage, loadFonts } from '../engraving/design';
import { overlapsFactory } from '../engraving/suggestions';
import { localDrafts, openDraft, saveDraft, engravingApi } from '../services/engraving';
import './Engraving.css';
const EMPTY = { schemaVersion: 1, diameter: 40, reserveCenter: true, layers: [] };
export default function Engraving() {
  const [params, setParams] = useSearchParams(); const slug = params.get('slug'); const navigate = useNavigate();
  const { user } = useAuth(); const userId = user?.id || user?.uid; const { items, dispatch } = useCart();
  const { items: products, loading: catalogLoading, err: catalogError } = useProducts({ department: 'satovi', all: true });
  const { product, loading, error: productError } = useProduct(slug);
  const [saved, setSaved] = useState([]); const [query, setQuery] = useState(''); const [ready, setReady] = useState(false);
  const [design, setDesign] = useState(EMPTY); const [assets, setAssets] = useState([]); const [selected, setSelected] = useState(null);
  const [canvas, setCanvas] = useState(null); const [rotate, setRotate] = useState(false); const [flat, setFlat] = useState(false); const [reset, setReset] = useState(0); const [zoom, setZoom] = useState(1.1); const [view, setView] = useState('back'); const [review, setReview] = useState(false);
  const [status, setStatus] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const metadata = useRef(null); const current = useRef({ design, assets }); current.current = { design, assets };
  const drag = useRef(null); const revision = useRef(0); const saveGeneration = useRef(0); const opening = useRef(0);
  const layer = design.layers.find((item) => item.id === selected); const invalid = design.layers.some(outsideZone);
  const reloadSaved = async () => {
    const local = await localDrafts.list(); const remote = userId ? await engravingApi.list() : [];
    setSaved([...remote, ...local.filter((d) => (!d.ownerId || d.ownerId === userId) && !remote.some((r) => r.id === d.serverId))]);
  };
  useEffect(() => { reloadSaved().catch((e) => setError(e.message)); }, [userId]);
  useEffect(() => {
    if (!product || product.slug !== slug) return;
    const generation = ++opening.current; setReady(false); setReview(false); setError(''); setConflict(false);
    (async () => {
      await loadFonts();
      if ((product.department?.slug || product.department || 'satovi') !== 'satovi') throw new Error('Graviranje je dostupno samo za satove.');
      const requested = params.get('draft'); const cartItem = items.find((item) => (item.lineId || item.id) === params.get('line'));
      const local = await localDrafts.list();
      let draft;
      if (requested) draft = await openDraft(requested, userId, cartItem?.engraving?.guestToken);
      else {
        const existing = local.filter((d) => d.productId === (product.productId || product.id) && d.variantId === product.variantId && (!d.ownerId || d.ownerId === userId)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
        const remote = !existing && userId ? (await engravingApi.list()).find((d) => d.productId === (product.productId || product.id) && d.variantId === product.variantId) : null;
        draft = existing || remote ? await openDraft(existing?.id || remote.id, userId) : { id: crypto.randomUUID(), productId: product.productId || product.id, variantId: product.variantId || product.variants?.[0]?.id, slug, name: product.name, ownerId: userId || null, version: 0, assets: [], design: { ...EMPTY, diameter: diameterOf(product) } };
      }
      if (generation !== opening.current) return;
      if (draft.productId !== (product.productId || product.id) || draft.variantId !== (product.variantId || product.variants?.[0]?.id)) throw new Error('Ovaj nacrt pripada drugom satu ili varijanti.');
      draft.assets = draft.assets || [];
      if (!draft.design.layers.length) draft.design = { ...draft.design, layers: [newText('')] };
      metadata.current = draft; setDesign(normalizeDesign(draft.design)); setAssets(draft.assets); setSelected(draft.design.layers[0]?.id || null); setHistory({ past: [], future: [] }); revision.current = 0; setConflict(Boolean(draft.conflict)); if (draft.conflict) setStatus('Nacrt je promenjen na drugom uređaju. Lokalne izmene su sačuvane.'); setReady(true);
    })().catch((e) => { if (generation === opening.current) setError(e.message); });
    return () => { opening.current++; };
  }, [product?.id, slug, params.get('draft'), userId]);
  const change = (next, record = true) => {
    if (record) setHistory((h) => ({ past: [...h.past.slice(-49), current.current.design], future: [] }));
    revision.current++; setDesign(normalizeDesign(typeof next === 'function' ? next(current.current.design) : next));
  };
  const patch = (update) => { if (!layer || layer.locked) return; change((d) => ({ ...d, layers: d.layers.map((item) => item.id === selected ? { ...item, ...update } : item) })); };
  const add = (element) => { if (design.layers.length >= 20) { setError('Najviše 20 elemenata po gravuri.'); return; } change({ ...design, layers: [...design.layers, element] }); setSelected(element.id); setRotate(false); setView('back'); setReset((v) => v + 1); };
  const persist = async (cloud = Boolean(userId)) => {
    const generation = ++saveGeneration.current; const captured = revision.current; const opened = opening.current;
    setStatus('Čuvanje…');
    try {
      const result = await saveDraft({ ...metadata.current, ...current.current }, userId, cloud);
      if (opened !== opening.current) return result;
      metadata.current = result;
      if (captured === revision.current) { setAssets(result.assets); }
      if (generation === saveGeneration.current) setStatus(cloud ? 'Sačuvano u nalogu' : 'Sačuvano na ovom uređaju');
      return result;
    } catch (e) {
      if (opened === opening.current) { const isConflict = e.status === 409 || /conflict|version/i.test(e.message); setConflict(isConflict); setStatus(isConflict ? 'Nacrt je promenjen na drugom uređaju.' : 'Čuvanje nije uspelo.'); setError(e.message); }
      throw e;
    }
  };
  useEffect(() => {
    if (!ready || conflict || busy) return;
    const timer = setTimeout(() => { persist().catch(() => {}); }, 800);
    return () => clearTimeout(timer);
  }, [design, ready, userId, conflict, busy]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    renderDesign(design, assets, { metal: false, guides: !review, selected: review ? null : selected }).then(async (art) => {
      const base = await renderDesign({ ...design, layers: [] }, [], { metal: true });
      base.getContext('2d').drawImage(art, 0, 0); if (!cancelled) setCanvas(base);
    }).catch((e) => { if (!cancelled) { setError(e.message); setCanvas(null); } });
    return () => { cancelled = true; };
  }, [design, assets, selected, ready, review]);
  const apply = async () => {
    if (!design.layers.length || invalid || conflict || !canvas) return;
    setBusy(true); setError('');
    try {
      const result = await persist(true);
      if (!userId) setStatus('Sačuvano na uređaju i spremno za poručivanje');
      const engraving = { draftId: result.serverId, version: result.version, guestToken: result.guestToken, preview: result.preview };
      dispatch({ type: 'APPLY_ENGRAVING', lineId: params.get('line'), item: { ...product, productId: result.productId, variantId: result.variantId, lineId: `engr_${result.id}`, engraving } });
      navigate('/cart');
    } catch (e) { setError(`Gravura nije potvrđena: ${e.message}`); } finally { setBusy(false); }
  };
  const upload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { const asset = await importImage(file); setAssets((a) => [...a, asset]); current.current.assets = [...current.current.assets, asset]; add({ id: crypto.randomUUID(), type: 'image', assetId: asset.id, width: 250, height: 250 / asset.ratio, x: 500, y: 500, rotation: 0, locked: false, contrast: 1, threshold: 160, invert: false }); } catch (e) { setError(e.message); }
  };
  const undo = (redo = false) => {
    const from = redo ? history.future : history.past; if (!from.length) return;
    const next = from[from.length - 1];
    setHistory(redo ? { past: [...history.past, design], future: history.future.slice(0, -1) } : { past: history.past.slice(0, -1), future: [...history.future, design] }); change(next, false);
  };
  const resetView = () => { setView('back'); setZoom(1.1); setReset((v) => v + 1); };
  const deleteLayer = () => { change({ ...design, layers: design.layers.filter((item) => item.id !== selected) }); setSelected(design.layers.find((item) => item.id !== selected)?.id || null); };
  const reorder = (direction) => { const next = [...design.layers]; const index = next.findIndex((item) => item.id === selected); const target = index + direction; if (index < 0 || target < 0 || target >= next.length || layer?.locked) return; [next[index], next[target]] = [next[target], next[index]]; change({ ...design, layers: next }); };
  const incomplete = busy || invalid || conflict || !design.layers.length || !canvas || design.layers.some((l) => l.type === 'text' && !l.text.trim());
  return <div className="engrave-page"><SEOHead title="Konfigurator graviranja sata" description="Napravite ličnu gravuru: tekst, simboli i slike na poklopcu sata." noIndex={params.toString().length > 0} />
    <div className="engrave-heading"><div><h1>Graviranje sata</h1><p>Vaše reči. Vaš sat. Graviranje bez doplate.</p></div><nav className="engrave-progress" aria-label="Koraci graviranja">{[['Izbor sata', () => { setParams({}); setReady(false); }], ['Gravura', () => setReview(false)], ['Pregled', () => { setReview(true); setRotate(false); resetView(); }]].map(([label, action], index) => <button key={label} disabled={index > 0 && !ready || index === 2 && incomplete} className={(!slug ? index === 0 : review ? index === 2 : index === 1) ? 'active' : ''} aria-current={(!slug ? index === 0 : review ? index === 2 : index === 1) ? 'step' : undefined} onClick={action}><span>{index + 1}</span>{label}</button>)}</nav>{slug && <button className="engrave-change-watch" onClick={() => { setParams({}); setReady(false); }}><ArrowLeftRight size={20} />Promeni sat</button>}</div>
    {(error || productError?.message || catalogError?.message) && <div className="engrave-error" role="alert">{error || productError?.message || catalogError?.message}<button aria-label="Zatvori poruku" onClick={() => setError('')}>×</button></div>}
    {!slug ? <>
      <section className="engrave-card"><h2>Izaberite sat za graviranje</h2><input aria-label="Pretražite satove" placeholder="Pretražite model ili brend…" value={query} onChange={(event) => setQuery(event.target.value)} />{catalogLoading && <p>Učitavanje satova…</p>}<div className="engrave-products">{products.filter((p) => `${p.name} ${p.brand}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((p) => <Link key={p.id} to={`/graviranje?slug=${encodeURIComponent(p.slug)}`}><img src={p.image || p.primaryImageUrl} alt={p.name} /><b>{p.name}</b><span>{Number(p.price).toLocaleString('sr-RS')} RSD</span></Link>)}</div></section>
      {saved.length > 0 && <section className="engrave-card"><h2>Vaši nacrti</h2><div className="engrave-products">{saved.map((draft) => { const p = products.find((product) => (product.productId || product.id) === draft.productId && product.variantId === draft.variantId); return p && <Link key={draft.id} to={`/graviranje?slug=${encodeURIComponent(p.slug)}&draft=${draft.id}`}><img src={draft.preview || p.image} alt="Sačuvana gravura" /><b>{p.name}</b><span>Nastavi uređivanje</span></Link>; })}</div></section>}
    </> : !ready ? <p>{loading ? 'Učitavanje sata…' : error || productError ? 'Nacrt nije otvoren.' : 'Priprema editora…'}</p> : <div className="engrave-layout">
      <section className="engrave-preview engrave-card"><div className="engrave-preview-shell"><div className="engrave-toolbar engrave-camera-toolbar"><button className={rotate ? 'active' : ''} onClick={() => { if (rotate) resetView(); setRotate(!rotate); }}><RotateCcw size={20} />{rotate ? 'Uredi gravuru' : 'Rotiraj sat'}</button><button onClick={() => { setRotate(false); resetView(); }}><Eye size={21} />Pogled odozgo</button><button aria-pressed={flat} onClick={() => setFlat((v) => !v)}><Scan size={20} />{flat ? '3D prikaz' : '2D prikaz'}</button><button onClick={resetView}><RotateCcw size={20} />Reset</button></div>
        <div className="engrave-view-thumbs" aria-label="Ugao pregleda sata">{[['back', 'Poklopac'], ['side', 'Bočni pogled'], ['angle', 'Pogled pod uglom'], ['front', 'Prednja strana']].map(([key, title]) => <button key={key} className={view === key ? 'active' : ''} aria-label={title} aria-pressed={view === key} onClick={() => { setView(key); setFlat(false); setRotate(key !== 'back'); setReset((v) => v + 1); }}><svg viewBox="0 0 80 90" aria-hidden="true"><defs><radialGradient id={`steel-${key}`}><stop offset="0" stopColor="#f5f6f7" /><stop offset=".55" stopColor="#bfc2c5" /><stop offset=".75" stopColor="#eef0f1" /><stop offset="1" stopColor="#9b9fa3" /></radialGradient></defs><g transform={key === 'angle' ? 'translate(8 6) rotate(-18 32 40) scale(.8 1)' : key === 'side' ? 'translate(29 0) scale(.25 1)' : ''}><rect x="28" y="5" width="24" height="80" rx="3" fill="#878c91" /><circle cx="40" cy="45" r="31" fill={`url(#steel-${key})`} stroke="#686d72" strokeWidth="2" /><circle cx="40" cy="45" r="27" fill={key === 'front' ? '#393e45' : `url(#steel-${key})`} stroke="#f0f1f3" />{key === 'front' && <><path d="M40 24V45L56 48" stroke="#fff" fill="none" strokeWidth="2" />{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <path key={i} d="M40 19V23" stroke="#fff" transform={`rotate(${i * 30} 40 45)`} />)}</>}</g></svg></button>)}</div>
        <WatchPreview view={view} readOnly={review} canvas={canvas} rotate={rotate} reset={reset} zoom={zoom} diameter={design.diameter} flat={flat} onZoom={setZoom} onStart={(point) => {
          if (busy) return false;
          const hit = [...design.layers].reverse().find((item) => {
            const angle = -item.rotation * Math.PI / 180;
            const dx = point.x - item.x; const dy = point.y - item.y;
            if (item.type === 'text' && item.curve !== 'straight') return Math.abs(Math.hypot(dx, dy) - item.radius) < item.fontSize;
            return Math.abs(dx * Math.cos(angle) - dy * Math.sin(angle)) <= item.width / 2 + 20 && Math.abs(dx * Math.sin(angle) + dy * Math.cos(angle)) <= item.height / 2 + 20;
          });
          if (!hit) return false;
          setSelected(hit.id); if (hit.locked) return false;
          drag.current = { ...point, layer: { ...hit }, design }; setHistory((h) => ({ past: [...h.past.slice(-49), design], future: [] })); return true;
        }} onMove={(point) => { if (!drag.current) return; const original = drag.current; change({ ...original.design, layers: original.design.layers.map((item) => item.id === original.layer.id ? { ...item, x: Math.max(0, Math.min(1000, original.layer.x + point.x - original.x)), y: Math.max(0, Math.min(1000, original.layer.y + point.y - original.y)) } : item) }, false); }} onEnd={() => { drag.current = null; }} />
        <div className="engrave-preview-help"><span><Mouse size={23} />Skrol za zumiranje</span><span><Mouse size={23} />Desni klik + prevuci za pomeranje</span><button onClick={resetView}><Search size={20} />Reset pogled</button></div></div>
        <div className="engrave-preview-caption"><p className="engrave-note">Približan prikaz za {product.name} · Ø {design.diameter} mm</p><div className="engrave-toolbar"><button aria-label="Poništi promenu" disabled={review || !history.past.length} onClick={() => undo()}><Undo2 size={16} /></button><button aria-label="Ponovi promenu" disabled={review || !history.future.length} onClick={() => undo(true)}><Redo2 size={16} /></button><button aria-label="Umanji prikaz" onClick={() => setZoom((v) => Math.max(.7, v - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="Uvećaj prikaz" onClick={() => setZoom((v) => Math.min(1.6, v + .1))}>+</button></div></div>
        {design.reserveCenter !== false && design.layers.some((item) => (item.type === 'image' || item.text.trim()) && overlapsFactory(item)) && <p className="engrave-factory-warning">Vaš dizajn prelazi preko prostora za fabričku gravuru. U tabu „Predlozi“ izaberite raspored uz ivicu ili isključite čuvanje sredine ako vaš sat ima slobodan poklopac.</p>}
        {invalid && <p className="engrave-warning" role="alert">Element izlazi van zone graviranja. Smanjite ga ili pomerite ka sredini.</p>}
      </section>
      <aside className="engrave-controls" inert={busy || undefined}><section className="engrave-card engrave-editor-card">{review ? <div className="engrave-review"><h2>Vaša gravura</h2><p>Proverite poruku i raspored pre potvrde.</p>{design.layers.filter((item) => item.type === 'text').map((item) => <p key={item.id} style={{ fontFamily: `"${{ sans: 'Gravura Sans', serif: 'Gravura Serif', hand: 'Gravura Rukopis', mono: 'Gravura Mono' }[item.font]}", "Gravura Emoji"`, whiteSpace: 'pre-line' }}>{item.text}</p>)}<p className="engrave-note">{product.name} · Graviranje bez doplate. Konačan izgled zavisi od poklopca izabranog sata.</p><button onClick={() => setReview(false)}>Nastavi uređivanje</button></div> : <SimpleControls layer={layer} patch={patch} addText={(text) => add({ ...newText(text), y: design.layers.length ? 600 : 500 })} addSymbol={(symbol) => add(newText(symbol))} onDelete={deleteLayer} upload={upload} design={design} assets={assets} setReserveCenter={(reserveCenter) => change({ ...design, reserveCenter })} applySuggestion={(suggestion) => { change(suggestion); setSelected(suggestion.layers[0]?.id || null); setRotate(false); resetView(); }} layers={design.layers} selected={selected} selectLayer={(id) => { setSelected(id); setRotate(false); resetView(); }} duplicate={() => add({ ...layer, id: crypto.randomUUID(), x: Math.min(1000, layer.x + 30), y: Math.min(1000, layer.y + 30), locked: false })} reorder={reorder} toggleLock={() => change({ ...design, layers: design.layers.map((item) => item.id === selected ? { ...item, locked: !item.locked } : item) })} />}</section>
      <section className="engrave-card"><p aria-live="polite">{status || 'Nacrt se automatski čuva.'}</p>{conflict && <button onClick={async () => { try { const newer = await openDraft(metadata.current.id, userId, metadata.current.guestToken, true); metadata.current = newer; setDesign(normalizeDesign(newer.design)); setAssets(newer.assets); setHistory({ past: [], future: [] }); setConflict(false); setError(''); } catch (e) { setError(e.message); } }}>Učitaj noviju verziju i odbaci lokalne izmene</button>}<button className="engrave-confirm" onClick={() => { if (review) apply(); else { setReview(true); setRotate(false); resetView(); } }} disabled={busy || invalid || conflict || !design.layers.length || !canvas || design.layers.some((l) => l.type === 'text' && !l.text.trim())}>{busy ? 'Čuvanje dizajna…' : !review ? 'Pregledaj gravuru' : params.get('line') ? 'Sačuvaj gravuru u korpi' : 'Potvrdi gravuru i dodaj sat u korpu'}</button><p className="engrave-note">Ista gravura važi za sve komade ove stavke. Različite gravure dodajte kao zasebne stavke. {userId ? 'Nacrt se čuva na vašem nalogu.' : 'Nacrt se čuva u ovom browseru; prijavom ga prenosite u nalog.'}</p><button onClick={async () => { const draft = { ...metadata.current, ...current.current, id: crypto.randomUUID(), serverId: undefined, guestToken: undefined, version: 0, ownerId: userId || null, assets: assets.map((a) => ({ ...a, serverId: undefined, uploaded: false })) }; try { await localDrafts.put(draft); setParams({ slug, draft: draft.id }); } catch (e) { setError(e.message); } }}>Napravi zaseban nacrt za isti sat</button></section>
      </aside>
    </div>}
  </div>;
}
