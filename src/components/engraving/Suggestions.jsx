import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { renderDesign, canvasOf } from '../../engraving/design';
import { classifyContent, generateSuggestions, starterDesign } from '../../engraving/suggestions';
const preference = () => { try { return localStorage.getItem('engraving-auto-suggestions') !== 'off'; } catch { return true; } };
function SuggestionPreview({ suggestion, assets }) {
  const { t: translateText } = useStorefront();

  const [preview, setPreview] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [art, metal] = await Promise.all([renderDesign(suggestion.design, assets), renderDesign({ ...suggestion.design, layers: [] }, [], { metal: true })]);
      metal.getContext('2d').drawImage(art, 0, 0);
      const thumbnail = canvasOf(220); const ctx = thumbnail.getContext('2d');
      ctx.beginPath(); ctx.arc(110, 110, 105, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(metal, 5, 5, 210, 210);
      if (suggestion.design.reserveCenter !== false) { ctx.fillStyle = '#f5f6f780'; ctx.beginPath(); ctx.arc(110, 110, 40, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#697180'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Fabrička gravura', 110, 112); }
      if (!cancelled) setPreview(thumbnail.toDataURL());
    })().catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [suggestion, assets]);
  return preview ? <img src={preview} alt={translateText(`${suggestion.name}: pregled vašeg sadržaja`)} /> : <span className="engrave-suggestion-loading">{translateText("Priprema pregleda…")}</span>;
}
export default function Suggestions({ design, assets, apply, setReserveCenter }) {
  const { t: translateText } = useStorefront();

  const [automatic, setAutomatic] = useState(preference); const [proposals, setProposals] = useState([]); const [limit, setLimit] = useState(12); const [filter, setFilter] = useState('all'); const [generatedFrom, setGeneratedFrom] = useState('');
  const signature = JSON.stringify(design); const populated = design.layers.some((item) => item.type === 'image' || item.text.trim()); const stale = generatedFrom !== signature;
  const generate = () => { setProposals(generateSuggestions(design)); setGeneratedFrom(signature); setLimit(12); };
  useEffect(() => {
    if (!automatic) return;
    const timeout = setTimeout(() => { setProposals(generateSuggestions(design)); setGeneratedFrom(signature); setLimit(12); }, 450);
    return () => clearTimeout(timeout);
  }, [signature, automatic]);
  const locked = design.layers.some((item) => item.locked);
  const choices = proposals.filter((item) => filter === 'all' || (filter === 'date' ? item.id.startsWith('date-') : filter === 'arc' ? item.design.layers.some((layer) => layer.type === 'text' && layer.curve !== 'straight') : item.design.layers.every((layer) => layer.type !== 'text' || layer.curve === 'straight')));
  return <div className="engrave-proposals"><div className="engrave-proposal-heading"><span><Sparkles size={18} /><b>{translateText("Predlozi za vašu gravuru")}</b></span>{populated && <small>{translateText(classifyContent(design.layers))}</small>}</div>
    <div className="engrave-proposal-settings"><label><input type="checkbox" checked={automatic} onChange={(event) => { setAutomatic(event.target.checked); try { localStorage.setItem('engraving-auto-suggestions', event.target.checked ? 'on' : 'off'); } catch { /* Editing works without browser storage. */ } }} />{translateText("Automatski predlozi")}</label><label><input type="checkbox" checked={design.reserveCenter !== false} onChange={(event) => setReserveCenter(event.target.checked)} />{translateText("Sačuvaj sredinu za fabričku gravuru")}</label></div>
    <p className="engrave-note">{translateText(design.reserveCenter !== false ? 'Rasporedi ostavljaju sredinu slobodnom. Fabrički natpis i njegov položaj razlikuju se od sata do sata.' : 'Dozvoljen je i raspored u sredini poklopca. Proverite postojeći fabrički natpis.')}{translateText(" Predlog se primenjuje tek kada ga izaberete.")}</p>
    {populated ? <><div className="engrave-proposal-filters">{[['all', 'Sve'], ['arc', 'U luk'], ['straight', 'Prav tekst'], ...(proposals.some((item) => item.id.startsWith('date-')) ? [['date', 'Zapisi datuma']] : [])].map(([key, title]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => { setFilter(key); setLimit(12); }}>{translateText(title)}</button>)}<button onClick={generate}><RefreshCw size={14} />{translateText(automatic ? 'Osveži' : 'Napravi predloge')}</button></div>
      {stale && <p role="status" className="engrave-note">{translateText(automatic ? 'Pripremamo rasporede za nove izmene…' : 'Automatski predlozi su isključeni. Kliknite „Napravi predloge“ za trenutni tekst i slike.')}</p>}
      {locked && <p className="engrave-note">{translateText("Otključajte elemente pre primene novog rasporeda.")}</p>}
      <div className="engrave-proposal-grid">{choices.slice(0, limit).map((item) => <button key={item.id} disabled={stale || locked} onClick={() => apply(item.design)}><SuggestionPreview suggestion={item} assets={assets} /><b>{translateText(item.name)}</b><small>{translateText(item.detail)}</small></button>)}</div>
      {!stale && !choices.length && <p className="engrave-note">{translateText("Nema rasporeda koji odgovara ovom izboru. Izaberite „Sve“, skratite poruku ili smanjite broj elemenata.")}</p>}
      {choices.length > limit && <button className="engrave-show-more" onClick={() => setLimit((value) => value + 12)}>{translateText("Prikaži još predloga (")}{translateText(choices.length - limit)})</button>}
      {!stale && proposals.length > 0 && <p className="engrave-note">{translateText(proposals.length)}{translateText(" rasporeda sa vašim sadržajem. Promenu možete poništiti.")}</p>}
    </> : <><p className="engrave-note">{translateText("Unesite svoj datum, poruku, simbol ili dodajte sliku. Za početak možete izabrati i ideju:")}</p><div className="engrave-starter-grid">{['Naš dan ♥', 'Uvek zajedno', 'S ljubavlju', 'Samo za tebe', 'Čuvam te u srcu', new Date().toLocaleDateString('sr-RS'), 'Za najlepše trenutke', 'Hvala što postojiš'].map((message) => <button key={message} onClick={() => { const candidate = generateSuggestions(starterDesign(design, message))[0]; if (candidate) apply(candidate.design); }}>{translateText(message)}</button>)}</div></>}
  </div>;
}