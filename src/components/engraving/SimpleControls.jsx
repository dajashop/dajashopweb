import { FONTS, normalizeDesign, outsideZone } from '../../engraving/design';

const symbols = ['♥', '♡', '∞', '★', '✦', '☀', '🌙', '🌸', '🐾', '😊', '❤️', '💍', '🎂', '✨', '⚓', '✝'];
const monoText = (text) => text.replace(/\uFE0F/g, '');

export default function SimpleControls({ layer, patch, addText, addSymbol, onDelete }) {
  const updateText = (text) => {
    if (!layer) { addText(text); return; }
    let next = { ...layer, text };
    // Fit ordinary messages as they are typed, keeping deliberate positioning.
    while (next.fontSize > 14) {
      const measured = normalizeDesign({ layers: [next] }).layers[0];
      if (!outsideZone(measured)) break;
      next.fontSize--;
    }
    patch({ text, fontSize: next.fontSize });
  };
  const setSize = (size) => {
    if (layer?.type === 'image') patch({ width: size * 5, height: layer.height / layer.width * size * 5 });
    else patch({ fontSize: size });
  };
  const image = layer?.type === 'image';
  return <div className="engrave-simple">
    <div className="engrave-step"><span>1</span><h3>{image ? 'Vaša slika' : 'Napišite svoju poruku'}</h3></div>
    {image ? <p className="engrave-note">Slika je već pretvorena u jednu boju. Dodatnu obradu pronađite u naprednim podešavanjima.</p> : <label className="engrave-message"><textarea aria-label="Poruka za graviranje" placeholder={'Ime, datum ili poruka…\nNa primer: Zauvek u mom srcu'} maxLength={200} disabled={layer?.locked} value={monoText(layer?.text || '')} onChange={(event) => updateText(event.target.value)} /><span>{layer?.text.length || 0}/200 · Možete dodati i novi red</span></label>}
    <div className="engrave-symbols" aria-label="Jednobojni simboli za graviranje">{symbols.map((symbol) => <button key={symbol} disabled={layer?.locked} title={`Dodaj ${symbol}`} aria-label={`Dodaj simbol ${symbol}`} onClick={() => !layer || image ? addSymbol(symbol) : updateText((layer.text + symbol).slice(0, 200))}>{monoText(symbol)}</button>)}</div>
    {!image && <><div className="engrave-step"><span>2</span><h3>Izaberite stil</h3></div><div className="engrave-fonts">{Object.entries(FONTS).map(([key, font]) => <button key={key} disabled={!layer || layer.locked} aria-pressed={layer?.font === key} className={layer?.font === key ? 'active' : ''} onClick={() => patch({ font: key })}><span style={{ fontFamily: `"${font}", "Gravura Emoji"` }}>{monoText(layer?.text || 'Samo za tebe')}</span><small>{{ sans: 'Jednostavan', serif: 'Elegantan', mono: 'Moderan', hand: 'Rukopis' }[key]}</small></button>)}</div></>}
    {layer && <fieldset disabled={layer.locked} className="engrave-fields"><div className="engrave-step"><span>{image ? '2' : '3'}</span><h3>Namestite izgled</h3></div>
      {!image && <div className="engrave-choices" aria-label="Raspored poruke">{[['straight', 'Pravo'], ['upper', 'Gornji luk'], ['lower', 'Donji luk']].map(([curve, label]) => <button key={curve} className={layer.curve === curve ? 'active' : ''} aria-pressed={layer.curve === curve} onClick={() => patch({ curve, ...(curve !== 'straight' ? { x: 500, y: 500, radius: 240, angle: 0 } : {}) })}>{label}</button>)}</div>}
      <label>Veličina<div className="engrave-choices">{[[32, 'Mala'], [48, 'Srednja'], [68, 'Velika']].map(([size, label]) => <button key={size} className={(image ? Math.round(layer.width / 5) : layer.fontSize) === size ? 'active' : ''} onClick={() => setSize(size)}>{label}</button>)}</div></label>
      <div className="engrave-quick-actions"><button onClick={() => patch({ x: 500, y: 500 })}>◎ Centriraj</button>{!image && <><button title="Podebljaj tekst" aria-pressed={layer.bold} className={layer.bold ? 'active' : ''} onClick={() => patch({ bold: !layer.bold })}><b>B</b></button><button title="Iskosi tekst" aria-pressed={layer.italic} className={layer.italic ? 'active' : ''} onClick={() => patch({ italic: !layer.italic })}><i>I</i></button></>}<button onClick={onDelete}>Ukloni</button></div>
    </fieldset>}
    {layer?.locked && <p className="engrave-note">Ovaj element je zaključan. Otključajte ga u naprednim podešavanjima.</p>}
  </div>;
}
