import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadFile } from '../../engraving/design';
import '../../pages/Engraving.css';
export default function EngravingSummary({ item, editable = false, admin = false }) {
  const { t: translateText } = useStorefront();

  const [error, setError] = useState(''); const engraving = item.engraving;
  if (!engraving) return editable ? <Link to={`/graviranje?slug=${encodeURIComponent(item.slug)}&line=${encodeURIComponent(item.lineId || item.id)}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12 }}>{translateText("Dodaj gravuru")}</Link> : null;
  const exportFile = (format) => {
    try {
      const name = `gravura-${item.slug || item.id}-${engraving.draftId}`;
      if (format === 'json') downloadFile(`${name}.json`, JSON.stringify(engraving, null, 2), 'application/json');
      else if (format === 'svg') {
        // Raster artwork is intentionally embedded: fonts and emoji remain identical offline.
        const diameter = engraving.design.diameter;
        downloadFile(`${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}mm" height="${diameter}mm" viewBox="0 0 1000 1000"><title>Potvrđena gravura</title><image width="1000" height="1000" href="${engraving.artwork}"/></svg>`, 'image/svg+xml');
      } else {
        const binary = atob(engraving.artwork.split(',')[1]);
        downloadFile(`${name}.png`, Uint8Array.from(binary, (c) => c.charCodeAt(0)), 'image/png');
      }
    } catch { setError('Preuzimanje nije uspelo.'); }
  };
  return <div className="engrave-summary">{engraving.preview && <img src={engraving.preview} alt={translateText("Gravura na poklopcu sata")} />}<div><b>{translateText(engraving.confirmedAt ? 'Potvrđena gravura' : 'Gravura bez doplate')}</b><p>{translateText("Isti dizajn na ")}{translateText(item.qty || 1)}{translateText(" kom.")}</p>{editable && <Link to={`/graviranje?slug=${encodeURIComponent(item.slug)}&draft=${engraving.draftId}&line=${encodeURIComponent(item.lineId || item.id)}`}>{translateText("Uredi gravuru")}</Link>}{engraving.design && <details><summary>{translateText("Tekst i podešavanja")}</summary>{engraving.design.layers.map((layer) => <div key={layer.id}><p>{layer.type === 'text' ? layer.text : translateText('Slika / logo')}</p>{admin && <pre>{JSON.stringify(layer, null, 2)}</pre>}</div>)}<p>{translateText("Poklopac Ø ")}{translateText(engraving.design.diameter)}{translateText(" mm · približan pregled")}</p></details>}{admin && engraving.artwork && <div><button onClick={() => exportFile('png')}>{translateText("PNG")}</button><button onClick={() => exportFile('svg')}>{translateText("SVG")}</button><button onClick={() => exportFile('json')}>{translateText("JSON")}</button><small>{translateText("SVG sadrži tačan jednobojni prikaz, a JSON raspored elemenata.")}</small></div>}{error && <p role="alert">{translateText(error)}</p>}</div></div>;
}
