import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import useProducts from '../hooks/useProducts';
import useProduct from '../hooks/useProduct';
import SEOHead from '../components/seo/SEOHead';
import WatchPreview from '../components/engraving/WatchPreview';
import SimpleControls from '../components/engraving/SimpleControls';
import { FONTS, newText, diameterOf, normalizeDesign, outsideZone, renderDesign, importImage, loadFonts } from '../engraving/design';
import { localDrafts, openDraft, saveDraft, engravingApi } from '../services/engraving';
import './Engraving.css';
const EMPTY = { schemaVersion: 1, diameter: 40, layers: [] };
function Slider({ title, value, min, max, step = 1, onChange, disabled }) {
  return <label className="engrave-slider"><span>{title}<b>{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} /></label>;
}
export default function Engraving() {
  const [params, setParams] = useSearchParams(); const slug = params.get('slug'); const navigate = useNavigate();
  const { user } = useAuth(); const userId = user?.id || user?.uid; const { items, dispatch } = useCart();
  const { items: products, loading: catalogLoading, err: catalogError } = useProducts({ department: 'satovi', all: true });
  const { product, loading, error: productError } = useProduct(slug);
  const [saved, setSaved] = useState([]); const [query, setQuery] = useState(''); const [ready, setReady] = useState(false);
  const [design, setDesign] = useState(EMPTY); const [assets, setAssets] = useState([]); const [selected, setSelected] = useState(null);
  const [canvas, setCanvas] = useState(null); const [rotate, setRotate] = useState(false); const [flat, setFlat] = useState(false); const [reset, setReset] = useState(0); const [zoom, setZoom] = useState(1.1);
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
    const generation = ++opening.current; setReady(false); setError(''); setConflict(false);
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
  const add = (element) => { if (design.layers.length >= 20) { setError('Najviše 20 elemenata po gravuri.'); return; } change({ ...design, layers: [...design.layers, element] }); setSelected(element.id); setRotate(false); };
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
    renderDesign(design, assets, { metal: false, guides: true, selected }).then(async (art) => {
      const base = await renderDesign({ ...design, layers: [] }, [], { metal: true });
      base.getContext('2d').drawImage(art, 0, 0); if (!cancelled) setCanvas(base);
    }).catch((e) => { if (!cancelled) { setError(e.message); setCanvas(null); } });
    return () => { cancelled = true; };
  }, [design, assets, selected, ready]);
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
  const template = (kind) => {
    const first = newText(kind === 'date' ? '12. 10. 2026.' : kind === 'circle' ? 'Zauvek u mom srcu ♥' : 'Za najlepše trenutke');
    if (kind === 'circle') { first.curve = 'upper'; first.radius = 250; }
    const second = { ...newText(kind === 'date' ? 'Naš dan ♥' : 'S ljubavlju'), y: 570, fontSize: 32, font: 'hand' };
    change({ ...design, layers: [first, second] }); setSelected(first.id);
  };
  return <div className="engrave-page"><SEOHead title="Konfigurator graviranja sata" description="Napravite ličnu gravuru: tekst, simboli i slike na poklopcu sata." />
    <div className="engrave-heading"><div><Link to="/usluge">Usluge</Link><h1>Graviranje sata</h1><p>Vaše reči. Vaš sat. Graviranje bez doplate.</p></div>{slug && <button onClick={() => { setParams({}); setReady(false); }}>Promeni sat</button>}</div>
    {(error || productError?.message || catalogError?.message) && <div className="engrave-error" role="alert">{error || productError?.message || catalogError?.message}<button aria-label="Zatvori poruku" onClick={() => setError('')}>×</button></div>}
    {!slug ? <>
      <section className="engrave-card"><h2>Izaberite sat za graviranje</h2><input aria-label="Pretražite satove" placeholder="Pretražite model ili brend…" value={query} onChange={(event) => setQuery(event.target.value)} />{catalogLoading && <p>Učitavanje satova…</p>}<div className="engrave-products">{products.filter((p) => `${p.name} ${p.brand}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((p) => <Link key={p.id} to={`/graviranje?slug=${encodeURIComponent(p.slug)}`}><img src={p.image || p.primaryImageUrl} alt={p.name} /><b>{p.name}</b><span>{Number(p.price).toLocaleString('sr-RS')} RSD</span></Link>)}</div></section>
      {saved.length > 0 && <section className="engrave-card"><h2>Vaši nacrti</h2><div className="engrave-products">{saved.map((draft) => { const p = products.find((product) => (product.productId || product.id) === draft.productId && product.variantId === draft.variantId); return p && <Link key={draft.id} to={`/graviranje?slug=${encodeURIComponent(p.slug)}&draft=${draft.id}`}><img src={draft.preview || p.image} alt="Sačuvana gravura" /><b>{p.name}</b><span>Nastavi uređivanje</span></Link>; })}</div></section>}
    </> : !ready ? <p>{loading ? 'Učitavanje sata…' : error || productError ? 'Nacrt nije otvoren.' : 'Priprema editora…'}</p> : <div className="engrave-layout">
      <section className="engrave-preview engrave-card"><div className="engrave-toolbar"><button className={!rotate ? 'active' : ''} onClick={() => setRotate(false)}>Uredi gravuru</button><button className={rotate ? 'active' : ''} onClick={() => setRotate(true)}>Rotiraj sat</button><button onClick={() => setReset((v) => v + 1)}>Pogled odozgo</button><button onClick={() => setFlat((v) => !v)}>{flat ? '3D prikaz' : '2D prikaz'}</button></div>
        <WatchPreview canvas={canvas} rotate={rotate} reset={reset} zoom={zoom} diameter={design.diameter} flat={flat} onZoom={setZoom} onStart={(point) => {
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
        <div className="engrave-toolbar"><button disabled={!history.past.length} onClick={() => undo()}>↶ Poništi</button><button disabled={!history.future.length} onClick={() => undo(true)}>↷ Ponovi</button><div className="engrave-zoom"><button aria-label="Umanji prikaz" onClick={() => setZoom((value) => Math.max(.7, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="Uvećaj prikaz" onClick={() => setZoom((value) => Math.min(1.6, value + .1))}>+</button></div><details className="engrave-view-options"><summary>Podešavanje zuma</summary><Slider title="Zum" min={.7} max={1.6} step={.1} value={zoom} onChange={setZoom} /></details></div>
        <p className="engrave-note">Približan prikaz za {product.name} · poklopac Ø {design.diameter} mm. Isprekidani krug označava zonu graviranja. Skrol: zum · Desni klik i prevlačenje: pomeranje pregleda · Prevucite tekst da mu promenite mesto.</p>
        {invalid && <p className="engrave-warning" role="alert">Element izlazi van zone graviranja. Smanjite ga ili pomerite ka sredini.</p>}
      </section>
      <aside className="engrave-controls" inert={busy || undefined}><section className="engrave-card"><h2>Učinite ga ličnim</h2><p className="engrave-intro">Dodajte poruku ili simbol. Sve promene odmah vidite na satu.</p><div className="engrave-chips">{design.layers.map((item, index) => <button key={item.id} className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}>{item.type === "text" ? `Poruka ${index + 1}` : "Slika / logo"}</button>)}</div><SimpleControls layer={layer} patch={patch} addText={(text) => add(newText(text))} addSymbol={(symbol) => add(newText(symbol))} onDelete={() => { change({ ...design, layers: design.layers.filter((item) => item.id !== selected) }); setSelected(design.layers.find((item) => item.id !== selected)?.id || null); }} /><div className="engrave-toolbar engrave-add-row"><button onClick={() => add({ ...newText(""), y: design.layers.length ? 600 : 500 })}>＋ Još jedna poruka</button><label className="engrave-upload">＋ Slika / logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden /></label></div><p className="engrave-note">PNG, JPEG ili WebP do 10 MB. Slike se pretvaraju u jednu boju.</p>
        <details className="engrave-advanced"><summary>Napredna podešavanja<span>Precizan raspored, slojevi i obrada slika</span></summary><div className="engrave-layers">{design.layers.map((item, index) => <div key={item.id} className={selected === item.id ? 'active' : ''}><button onClick={() => setSelected(item.id)}>{item.locked ? '🔒 ' : ''}{item.type === 'text' ? item.text || 'Tekst' : 'Slika / logo'}</button><button aria-label="Pomeri sloj napred" disabled={index === design.layers.length - 1 || item.locked} onClick={() => { const next = [...design.layers]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; change({ ...design, layers: next }); }}>↑</button><button aria-label="Pomeri sloj nazad" disabled={!index || item.locked} onClick={() => { const next = [...design.layers]; [next[index], next[index - 1]] = [next[index - 1], next[index]]; change({ ...design, layers: next }); }}>↓</button><button aria-label={item.locked ? 'Otključaj' : 'Zaključaj'} onClick={() => change({ ...design, layers: design.layers.map((l) => l.id === item.id ? { ...l, locked: !l.locked } : l) })}>{item.locked ? 'Otključaj' : 'Zaključaj'}</button></div>)}</div>
        {layer && <><fieldset disabled={layer.locked} className="engrave-fields">{layer.type === 'text' ? <>
          <label>Tekst<textarea maxLength={200} value={layer.text} onChange={(event) => patch({ text: event.target.value })} /></label>
          <label>Font</label><div className="engrave-fonts">{Object.entries(FONTS).map(([key, font]) => <button key={key} className={layer.font === key ? 'active' : ''} style={{ fontFamily: `"${font}", "Gravura Emoji"` }} onClick={() => patch({ font: key })}><span>{layer.text || 'Čuvam te u srcu'}</span><small>{font.replace('Gravura ', '')}</small></button>)}</div>
          <div className="engrave-toolbar"><button className={layer.bold ? 'active' : ''} onClick={() => patch({ bold: !layer.bold })}><b>B</b></button><button className={layer.italic ? 'active' : ''} onClick={() => patch({ italic: !layer.italic })}><i>I</i></button><select aria-label="Poravnanje" value={layer.align} onChange={(event) => patch({ align: event.target.value })}><option value="left">Levo</option><option value="center">Sredina</option><option value="right">Desno</option></select></div>
          <Slider title="Veličina teksta" value={layer.fontSize} min={14} max={100} onChange={(fontSize) => patch({ fontSize })} /><Slider title="Razmak slova" value={layer.letterSpacing} min={-2} max={15} step={.5} onChange={(letterSpacing) => patch({ letterSpacing })} /><Slider title="Razmak redova" value={layer.lineSpacing} min={1} max={2.5} step={.1} onChange={(lineSpacing) => patch({ lineSpacing })} />
          <label>Putanja teksta<select value={layer.curve} onChange={(event) => patch({ curve: event.target.value })}><option value="straight">Prav tekst</option><option value="upper">Gornji luk</option><option value="lower">Donji luk</option></select></label>
          {layer.curve !== 'straight' && <><Slider title="Poluprečnik" value={layer.radius} min={80} max={380} onChange={(radius) => patch({ radius })} /><Slider title="Širina luka" value={layer.arc} min={30} max={330} onChange={(arc) => patch({ arc })} /><Slider title="Početni ugao" value={layer.angle} min={-180} max={180} onChange={(angle) => patch({ angle })} /></>}
          <div className="engrave-symbols">{['♥', '♡', '∞', '★', '✦', '☀', '🌙', '🌸', '🐾', '😊', '❤️', '💍', '🎂', '✨', '⚓', '✝'].map((symbol) => <button key={symbol} title={`Dodaj ${symbol}`} onClick={() => patch({ text: (layer.text + symbol).slice(0, 200) })}>{symbol.replace(/\uFE0F/g, "")}</button>)}</div>
        </> : <><Slider title="Veličina slike" value={Math.round(layer.width)} min={30} max={600} onChange={(width) => patch({ width, height: layer.height * width / layer.width })} /><Slider title="Kontrast" value={layer.contrast} min={.5} max={3} step={.1} onChange={(contrast) => patch({ contrast })} /><Slider title="Prag crne boje" value={layer.threshold} min={0} max={255} onChange={(threshold) => patch({ threshold })} /><label><input type="checkbox" checked={layer.invert} onChange={(event) => patch({ invert: event.target.checked })} /> Invertuj sliku</label></>}
          <div className="engrave-position"><label>X<input type="number" min={0} max={1000} value={Math.round(layer.x)} onChange={(e) => patch({ x: Math.max(0, Math.min(1000, Number(e.target.value))) })} /></label><label>Y<input type="number" min={0} max={1000} value={Math.round(layer.y)} onChange={(e) => patch({ y: Math.max(0, Math.min(1000, Number(e.target.value))) })} /></label></div><Slider title="Rotacija" value={layer.rotation} min={-180} max={180} onChange={(rotation) => patch({ rotation })} />
          <div className="engrave-toolbar"><button onClick={() => patch({ x: 500, y: 500 })}>Centriraj</button><button onClick={() => add({ ...layer, id: crypto.randomUUID(), x: Math.min(1000, layer.x + 30), y: Math.min(1000, layer.y + 30), locked: false })}>Dupliraj</button><button onClick={() => { change({ ...design, layers: design.layers.filter((l) => l.id !== selected) }); setSelected(design.layers.find((item) => item.id !== selected)?.id || null); }}>Obriši</button></div>
        </fieldset>{layer.locked && <p className="engrave-note">Otključajte element za uređivanje.</p>}</>}
        </details>
      </section>
      <details className="engrave-card engrave-presets"><summary>Tražite inspiraciju? Izaberite primer</summary><div className="engrave-toolbar"><button onClick={() => template('love')}>Posveta</button><button onClick={() => template('circle')}>U krug</button><button onClick={() => template('date')}>Važan datum</button></div><p className="engrave-note">Primer zamenjuje dizajn. Promenu možete poništiti.</p></details>
      <section className="engrave-card"><p aria-live="polite">{status || 'Nacrt se automatski čuva.'}</p>{conflict && <button onClick={async () => { try { const newer = await openDraft(metadata.current.id, userId, metadata.current.guestToken, true); metadata.current = newer; setDesign(normalizeDesign(newer.design)); setAssets(newer.assets); setHistory({ past: [], future: [] }); setConflict(false); setError(''); } catch (e) { setError(e.message); } }}>Učitaj noviju verziju i odbaci lokalne izmene</button>}<button className="engrave-confirm" onClick={apply} disabled={busy || invalid || conflict || !design.layers.length || !canvas || design.layers.some((l) => l.type === 'text' && !l.text.trim())}>{busy ? 'Čuvanje dizajna…' : params.get('line') ? 'Sačuvaj gravuru u korpi' : 'Potvrdi gravuru i dodaj sat u korpu'}</button><p className="engrave-note">Ista gravura važi za sve komade ove stavke. Različite gravure dodajte kao zasebne stavke. {userId ? 'Nacrt se čuva na vašem nalogu.' : 'Nacrt se čuva u ovom browseru; prijavom ga prenosite u nalog.'}</p><button onClick={async () => { const draft = { ...metadata.current, ...current.current, id: crypto.randomUUID(), serverId: undefined, guestToken: undefined, version: 0, ownerId: userId || null, assets: assets.map((a) => ({ ...a, serverId: undefined, uploaded: false })) }; try { await localDrafts.put(draft); setParams({ slug, draft: draft.id }); } catch (e) { setError(e.message); } }}>Napravi zaseban nacrt za isti sat</button></section>
      </aside>
    </div>}
  </div>;
}
