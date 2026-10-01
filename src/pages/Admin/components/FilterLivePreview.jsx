import React, { useState } from 'react';
import { Monitor, Smartphone, Eye, RotateCcw } from 'lucide-react';
import ConfiguredFilters from '../../../components/ConfiguredFilters.jsx';
import '../../../components/FilterDrawer.css';
import { configuredFilterChips, filterConfiguredProducts, newFilter } from '../../../utils/filterConfiguration.js';

const kinds = [
  ['checkbox', 'Checkboxovi', 'Više opcija u listi, sa oznakom izabranih vrednosti.'],
  ['color', 'Boje', 'Male kartice boja; naziv se prikazuje kada pređeš preko kartice.'],
  ['material', 'Materijali', 'Redovi sa slikom materijala, nazivom i brojem proizvoda.'],
  ['range', 'Slider od–do', 'Izbor raspona. Izvor mora imati numeričke vrednosti sa istom jedinicom.'],
  ['group', 'Grupa', 'Zajednička sekcija sa zasebnim podfilterima. Njihovi izbori ostaju odvojeni.'],
];
const contains = (node, id) => node.id === id || node.children.some((child) => contains(child, id));
const makeExample = (style) => {
  const source = style === 'color' ? { id: 'spec:boja', label: 'Boja', values: ['Bela', 'Crna', 'Plava', 'Zelena', 'Crvena', 'Braon', 'Srebrna', 'Zlatna'] }
    : style === 'material' ? { id: 'spec:materijal', label: 'Materijal', values: ['Koža', 'Nerđajući čelik', 'Silikon'] }
    : style === 'range' ? { id: 'spec:precnik_kucista', label: 'Prečnik kućišta', unit: 'mm', values: ['35mm', '38mm', '40.5mm', '42mm', '45mm'] }
    : { id: 'spec:funkcije', label: 'Funkcije', values: ['Datum', 'Dan u nedelji', 'Hronograf'] };
  return { ...newFilter(source), style, open: true };
};
const examples = Object.fromEntries(kinds.map(([kind]) => {
  const node = kind === 'group' ? { ...makeExample('checkbox'), title: 'Narukvica', mode: 'group', sources: [], options: [], children: [makeExample('material'), makeExample('color')] } : makeExample(kind);
  return [kind, { schemaVersion: 1, filters: [node] }];
}));

export default function FilterLivePreview({ draft, products, activeId, loading }) {
  const [mode, setMode] = useState('selected');
  const [kind, setKind] = useState('checkbox');
  const [mobile, setMobile] = useState(false);
  const [params, setParams] = useState(new URLSearchParams());
  // Include the selected filter's whole parent section to show grouped choices.
  const section = draft.filters.find((node) => contains(node, activeId)) || draft.filters.find((node) => node.visible);
  const configuration = mode === 'examples' ? examples[kind] : mode === 'selected' && section ? { ...draft, filters: [section] } : draft;
  const previewProducts = mode === 'examples' ? [] : products;
  const results = filterConfiguredProducts(previewProducts, params, configuration);
  const chips = configuredFilterChips(params, configuration);
  const changeMode = (value) => { setMode(value); setParams(new URLSearchParams()); };
  return <aside className="fm-live-preview" aria-label="Live pregled filtera">
    <div className="fm-live-heading"><div><h3><Eye size={17} aria-hidden="true" />Live pregled</h3><p>Promene vidiš odmah, pre objavljivanja.</p></div><span className="fm-live-dot" title="Pregled nacrta" /></div>
    <div className="fm-preview-tabs" role="group" aria-label="Sadržaj pregleda">
      {[['selected', 'Izabrani'], ['all', 'Svi filteri'], ['examples', 'Vrste prikaza']].map(([id, title]) => <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => changeMode(id)}>{title}</button>)}
    </div>
    <div className="fm-preview-device" role="group" aria-label="Veličina prikaza"><button type="button" aria-pressed={!mobile} className={!mobile ? 'is-active' : ''} onClick={() => setMobile(false)}><Monitor size={15} />Desktop</button><button type="button" aria-pressed={mobile} className={mobile ? 'is-active' : ''} onClick={() => setMobile(true)}><Smartphone size={15} />Mobilni</button><button type="button" className="fm-icon-button" title="Očisti izbore u pregledu" aria-label="Očisti izbore u pregledu" onClick={() => setParams(new URLSearchParams())}><RotateCcw size={14} /></button></div>
    {mode === 'examples' && <><div className="fm-kind-picker">{kinds.map(([id, title]) => <button key={id} type="button" aria-pressed={kind === id} className={kind === id ? 'is-active' : ''} onClick={() => { setKind(id); setParams(new URLSearchParams()); }}>{title}</button>)}</div><p className="fm-help">{kinds.find(([id]) => id === kind)[2]} Primer prikaza; ne menja tvoj nacrt.</p></>}
    {mode === 'selected' && section && <p className="fm-help">{section.mode === 'group' ? `Cela grupa „${section.title}“, sa svim podfilterima.` : `Filter „${section.title}“.`}{!section.visible && ' Skriven je i neće biti prikazan kupcima.'}</p>}
    <div className={`fm-preview-stage ${mobile ? 'is-mobile fd-content' : ''}`}>
      <ConfiguredFilters key={`${mode}-${mode === 'examples' ? kind : mode === 'selected' ? section?.id : 'all'}`} products={previewProducts} configuration={configuration} params={params} onParams={setParams} expandIds={mode !== 'all' ? configuration.filters.map((node) => node.id) : []} showUnavailableOptions={mode === 'examples'} />
    </div>
    {mode !== 'examples' && <div className="fm-live-results"><strong>{loading ? 'Učitavanje proizvoda…' : `${results.length} proizvoda odgovara izboru`}</strong>{chips.length > 0 && <div className="fm-preview-chips">{chips.map((chip, index) => <span key={`${chip.key}-${index}`}>{chip.label}</span>)}</div>}<div className="fm-preview-products">{results.slice(0, 4).map((product) => <div key={product.id}><strong>{product.brand}</strong><span>{product.name}</span><small>{Number(product.price || 0).toLocaleString('sr-Latn')} RSD</small></div>)}</div></div>}
  </aside>;
}
