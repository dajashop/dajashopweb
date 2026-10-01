import React, { useEffect, useMemo, useState } from 'react';
import { filterConfigurationApi } from '../../../services/filterConfiguration.js';
import { specKeyService } from '../../../services/admin.js';
import useProducts from '../../../hooks/useProducts.js';
import FilterLivePreview from './FilterLivePreview.jsx';
import { defaultFilterConfiguration, discoverFilterSources, filterId, filterLeaves, newFilter, orderedNodes, specificationSourceKey, validateFilterConfiguration } from '../../../utils/filterConfiguration.js';
import FilterOrderTree from './FilterOrderTree.jsx';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './FilterManager.css';

const departmentsList = [['satovi', 'Satovi'], ['daljinski', 'Daljinski'], ['baterije', 'Baterije'], ['naocare', 'Naočare']];
const mapNodes = (nodes, id, mutate) => nodes.map((node) => node.id === id ? mutate(node) : { ...node, children: mapNodes(node.children, id, mutate) });
const removeNodes = (nodes, ids) => nodes.filter((node) => !ids.includes(node.id)).map((node) => ({ ...node, children: removeNodes(node.children, ids) }));
const findNode = (nodes, id) => nodes.flatMap((node) => [node, ...allNodes(node.children)]).find((node) => node.id === id);
const allNodes = (nodes) => nodes.flatMap((node) => [node, ...allNodes(node.children)]);
const reprioritize = (nodes) => nodes.map((node, priority) => ({ ...node, priority }));

export default function FilterManager({ products, productsLoading, definitions, departments, canWrite }) {
  const [department, setDepartment] = useState('satovi');
  const [state, setState] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState('');
  const [activeId, setActiveId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(true);
  const [newSpec, setNewSpec] = useState({ name: '', unit: '', values: '' });
  const [optionDraft, setOptionDraft] = useState({ label: '', source: '', values: [] });
  const { items: storefrontProducts, loading: storefrontLoading } = useProducts({ admin: false, all: true });
  const scopedProducts = useMemo(() => products.filter((product) => (product.department || 'satovi') === department), [products, department]);
  const departmentId = departments.find((item) => item.slug === department)?.id;
  const sources = useMemo(() => discoverFilterSources(scopedProducts, definitions.filter((definition) => definition.departmentId === departmentId)), [scopedProducts, definitions, departmentId]);
  const dirty = draft && JSON.stringify(draft) !== saved;
  const active = draft ? findNode(draft.filters, activeId) : null;
  const leaves = draft ? filterLeaves(draft, false) : [];
  const unused = sources.filter((source) => !leaves.some((node) => node.sources.includes(source.id) || node.options.some((option) => option.conditions.some((condition) => condition.source === source.id))));
  const errors = draft ? validateFilterConfiguration(draft) : [];
  const previewProducts = storefrontProducts.filter((product) => (product.department || 'satovi') === department);

  useEffect(() => {
    let cancelled = false;
    setState(null); setDraft(null); setError(''); setNotice(''); setActiveId(''); setSelectedIds([]);
    filterConfigurationApi.draft(department).then((result) => {
      if (cancelled) return;
      setState(result);
      if (result.draft || result.published) {
        const configuration = result.draft || result.published;
        setDraft(configuration); setSaved(JSON.stringify(configuration));
      }
    }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [department]);
  useEffect(() => {
    if (state && !draft && sources.length && !productsLoading) {
      const configuration = defaultFilterConfiguration(scopedProducts, definitions.filter((definition) => definition.departmentId === departmentId));
      setDraft(configuration); setSaved('');
    }
  }, [state, draft, sources, scopedProducts, definitions, departmentId, productsLoading]);
  useEffect(() => {
    const preventLoss = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);
  useEffect(() => { setOptionDraft({ label: '', source: '', values: [] }); }, [activeId]);

  const edit = (id, patch) => setDraft((current) => ({ ...current, filters: mapNodes(current.filters, id, (node) => ({ ...node, ...patch })) }));
  const append = (source) => {
    const node = newFilter(source);
    if (source.id === 'feature:') { node.sources = []; node.style = 'checkbox'; node.match = 'all'; }
    node.priority = Math.max(-1, ...draft.filters.map((item) => item.priority)) + 1;
    setDraft({ ...draft, filters: [...draft.filters, node] }); setActiveId(node.id);
  };
  const updateOption = (id, patch) => edit(active.id, { options: active.options.map((option) => option.id === id ? { ...option, ...patch } : option) });
  const move = (id, delta) => {
    const reorder = (nodes) => {
      const sorted = orderedNodes(nodes); const index = sorted.findIndex((node) => node.id === id);
      if (index >= 0) {
        const destination = Math.max(0, Math.min(sorted.length - 1, index + delta));
        sorted.splice(destination, 0, sorted.splice(index, 1)[0]); return reprioritize(sorted);
      }
      return nodes.map((node) => ({ ...node, children: reorder(node.children) }));
    };
    setDraft({ ...draft, filters: reorder(draft.filters) });
  };
  const split = (node) => {
    const children = node.mode === 'group' ? orderedNodes(node.children) : node.sources.map((sourceId) => {
      const source = sources.find((item) => item.id === sourceId) || { id: sourceId, label: sourceId, values: [] };
      return { ...newFilter(source), options: node.options.filter((option) => option.conditions.some((condition) => condition.source === sourceId)).map((option) => ({ ...option, conditions: option.conditions.filter((condition) => condition.source === sourceId) })) };
    });
    const splitTree = (nodes) => reprioritize(orderedNodes(nodes).flatMap((item) => item.id === node.id ? children : [{ ...item, children: splitTree(item.children) }]));
    setDraft({ ...draft, filters: splitTree(draft.filters) }); setActiveId('');
  };
  const merge = (mode) => {
    const chosen = orderedNodes(draft.filters).filter((node) => selectedIds.includes(node.id));
    if (chosen.length < 2) return;
    const selectedLeaves = filterLeaves({ filters: chosen }, false);
    const merged = {
      ...chosen[0], id: filterId(), title: mode === 'group' ? 'Nova grupa' : 'Funkcije', description: '', visible: true,
      open: false, mode: mode === 'group' ? 'group' : 'options', style: 'checkbox', match: mode === 'group' ? 'any' : 'all',
      children: mode === 'group' ? reprioritize(chosen) : [], sources: mode === 'group' ? [] : [...new Set(selectedLeaves.flatMap((node) => node.sources))],
      options: mode === 'group' ? [] : selectedLeaves.flatMap((node) => node.options.map((option) => ({ ...option, id: filterId(), label: node.options.length === 1 ? node.title : `${node.title}: ${option.label}` }))),
    };
    setDraft({ ...draft, filters: [...draft.filters.filter((node) => !selectedIds.includes(node.id)), merged] });
    setSelectedIds([]); setActiveId(merged.id);
  };
  const action = async (publish = false, restoreRevision) => {
    if (busy || !canWrite) return;
    if (!restoreRevision && errors.length) { setError(errors.join(' ')); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      let revision = state.revision;
      if (!restoreRevision && dirty) {
        const result = await filterConfigurationApi.save(department, revision, draft);
        revision = result.revision; setState((current) => ({ ...current, revision, draft: result.configuration })); setSaved(JSON.stringify(result.configuration));
      }
      if (publish || restoreRevision) await filterConfigurationApi.publish(department, revision, restoreRevision);
      const refreshed = await filterConfigurationApi.draft(department);
      setState(refreshed); setDraft(refreshed.draft); setSaved(JSON.stringify(refreshed.draft));
      setNotice(restoreRevision ? 'Prethodna verzija je ponovo objavljena.' : publish ? 'Filteri su objavljeni.' : 'Nacrt je sačuvan. Sajt još koristi objavljenu verziju.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const reload = async () => {
    setBusy(true); setError('');
    try { const result = await filterConfigurationApi.draft(department); const configuration = result.draft || result.published || defaultFilterConfiguration(scopedProducts); setState(result); setDraft(configuration); setSaved(JSON.stringify(configuration)); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const addSpec = async () => {
    if (!newSpec.name.trim() || !departmentId || busy) return;
    setBusy(true); setError('');
    try {
      const created = await specKeyService.add(newSpec.name, { departmentId, unit: newSpec.unit.trim(), optionValues: newSpec.values.split('\n').map((value) => value.trim()).filter(Boolean) });
      append({ id: `spec:${specificationSourceKey(created.name)}`, label: created.name, unit: created.unit || '', values: created.optionValues || [] });
      setNewSpec({ name: '', unit: '', values: '' }); setNotice('Specifikacija je dodata. Filter se neće prikazivati kupcima pre objavljivanja.');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const missingOptions = active?.mode === 'options' ? active.sources.flatMap((sourceId) => {
    const source = sources.find((item) => item.id === sourceId);
    return (source?.values || []).filter((value) => !active.options.some((option) => option.conditions.some((condition) => condition.source === sourceId && condition.values.includes(value)))).map((value) => ({ source: sourceId, value }));
  }) : [];
  return <section className="filter-manager">
    <div className="fm-toolbar"><h2>Filteri</h2><select value={department} disabled={busy} onChange={(event) => {
      if (dirty && !window.confirm('Promene nacrta nisu sačuvane. Promeni odeljenje?')) return;
      setDepartment(event.target.value);
    }}>{departmentsList.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <button type="button" disabled={busy} onClick={reload}>Ponovo učitaj</button>
      <button type="button" disabled={busy || !canWrite || !state?.published} onClick={() => { setDraft(structuredClone(state.published)); setNotice('Nacrt je vraćen na objavljenu konfiguraciju.'); }}>Vrati nacrt na objavljeno</button>
      <button type="button" disabled={!draft} onClick={() => setPreview(!preview)}>{preview ? 'Zatvori pregled' : 'Pregled'}</button>
      <button type="button" disabled={busy || !canWrite || !draft || !dirty} onClick={() => action()}>Sačuvaj nacrt</button>
      <button className="fm-primary" type="button" disabled={busy || !canWrite || !draft || errors.length > 0} onClick={() => action(true)}>Objavi</button>
    </div>
    <p className="fm-help">{dirty ? 'Ima nesačuvanih promena. ' : ''}Nacrt ne menja sajt do objavljivanja. Skrivanje, preimenovanje i spajanje ne menjaju podatke proizvoda.</p>
    {error && <div role="alert" className="fm-error">{error}</div>}{notice && <div role="status" className="fm-notice">{notice}</div>}
    {!draft ? <p>{error ? 'Podešavanja nisu učitana.' : 'Učitavanje filtera…'}</p> : <>
      <div className={`fm-layout ${preview ? "has-preview" : ""}`}><div className="fm-sidebar"><h3>Redosled i grupe</h3><p className="fm-help fm-order-help">Prevuci ručicu na željeno mesto ili koristi strelice. Podfilteri se pomeraju unutar svoje grupe.</p><FilterOrderTree nodes={draft.filters} activeId={activeId} selectedIds={selectedIds} onSelect={setActiveId} onSelection={setSelectedIds} onMove={move} onReorder={(filters) => setDraft((current) => ({ ...current, filters }))} disabled={!canWrite || busy} />
        <div className="fm-toolbar"><button type="button" disabled={selectedIds.length < 2 || !canWrite || busy} onClick={() => merge('group')}>Spoji u sekciju</button><button type="button" disabled={selectedIds.length < 2 || !canWrite || busy} onClick={() => merge('options')}>Spoji checkboxove</button></div>
        <button type="button" disabled={!canWrite || busy} onClick={() => append({ id: 'feature:', label: 'Funkcije', values: [] })}>+ Prazan filter funkcija</button>
        <h3>Neraspoređeni izvori</h3><p className="fm-help">Novi izvori se ne objavljuju automatski.</p>
        {unused.map((source) => <div className="fm-source" key={source.id}><span>{source.label}<small>{source.id.startsWith('feature:') ? 'Funkcija proizvoda' : `${source.values.length} opcija`}</small></span><button type="button" disabled={!canWrite || busy} onClick={() => append(source)}>Dodaj</button></div>)}
        <details><summary>Nova specifikacija</summary><fieldset disabled={!canWrite || busy}><label>Naziv<input value={newSpec.name} onChange={(event) => setNewSpec({ ...newSpec, name: event.target.value })} /></label><label>Jedinica<input value={newSpec.unit} onChange={(event) => setNewSpec({ ...newSpec, unit: event.target.value })} /></label><label>Opcije, svaka u svom redu<textarea value={newSpec.values} onChange={(event) => setNewSpec({ ...newSpec, values: event.target.value })} /></label><button type="button" disabled={!newSpec.name.trim() || !departmentId} onClick={addSpec}>Dodaj specifikaciju i filter</button></fieldset></details>
      </div>
      <div className="fm-editor">{!active ? <p>Izaberi filter levo za podešavanje.</p> : <fieldset disabled={!canWrite || busy}>
        <h3>Podešavanja filtera</h3><label>Naziv<input value={active.title} onChange={(event) => edit(active.id, { title: event.target.value })} /></label>
        <label>Opis<textarea value={active.description} onChange={(event) => edit(active.id, { description: event.target.value })} /></label>
        <div className="fm-inline"><label><input type="checkbox" checked={active.visible} onChange={(event) => edit(active.id, { visible: event.target.checked })} /> Vidljiv</label><label><input type="checkbox" checked={active.open} onChange={(event) => edit(active.id, { open: event.target.checked })} /> Otvoren pri učitavanju</label></div>
        <label>Prioritet (manji broj ide prvi)<input type="number" min="0" max="10000" value={active.priority} onChange={(event) => edit(active.id, { priority: Math.max(0, Math.min(10000, Math.round(Number(event.target.value)))) })} /></label>
        {active.mode === 'group' ? <><p>Podfiltere uređuješ izborom njihovog naziva levo.</p><button type="button" onClick={() => split(active)}>Razdvoji sekciju</button></> : <>
          <div className="fm-fields"><label>Izgled<select value={active.style} onChange={(event) => edit(active.id, { style: event.target.value })}><option value="checkbox">Checkboxovi</option><option value="color">Kartice boja</option><option value="material">Kartice materijala</option><option value="range">Slider od–do</option></select></label>
          <label>Više izabranih opcija<select value={active.match} onChange={(event) => edit(active.id, { match: event.target.value })}><option value="any">Bilo koja izabrana</option><option value="all">Sve izabrane</option></select></label>
          <label>Broj kolona (boje / checkboxovi)<input disabled={['material', 'range'].includes(active.style)} type="number" min="1" max="8" value={active.columns} onChange={(event) => edit(active.id, { columns: Math.max(1, Math.min(8, Math.round(Number(event.target.value)))) })} /></label>
          <label>Jedinica slidera<input value={active.unit} onChange={(event) => edit(active.id, { unit: event.target.value })} /></label></div>
          <label><input type="checkbox" checked={active.showCounts} onChange={(event) => edit(active.id, { showCounts: event.target.checked })} /> Prikaži broj proizvoda</label>
          <p className="fm-help">Izvori: {active.sources.map((source) => sources.find((item) => item.id === source)?.label || source).join(', ') || 'Dodaj opciju i izvor ispod.'}</p>
          {active.sources.length > 1 && <button type="button" onClick={() => split(active)}>Razdvoji objedinjene izvore</button>}
          <h3>Opcije i uslovi</h3><p className="fm-help">Uslovi jedne opcije znače „bilo koji“. Za funkcije označi konkretne vrednosti koje znače da je funkcija prisutna.</p>
          {active.options.map((option, index) => <details key={option.id} className="fm-option"><summary>{option.label}{!option.visible && ' · Skrivena'}</summary>
            <label>Naziv opcije<input value={option.label} onChange={(event) => updateOption(option.id, { label: event.target.value })} /></label>
            <label><input type="checkbox" checked={option.visible} onChange={(event) => updateOption(option.id, { visible: event.target.checked })} /> Vidljiva opcija</label>
            <div className="fm-fields"><label>Boja (HEX)<input placeholder="#ffffff" value={option.color} onChange={(event) => updateOption(option.id, { color: event.target.value })} /></label><label>Slika (HTTPS URL)<input placeholder="Prazno = postojeća slika" value={option.image} onChange={(event) => updateOption(option.id, { image: event.target.value })} /></label></div>
            {option.conditions.map((condition, conditionIndex) => <div className="fm-condition" key={conditionIndex}>
              <label>Izvor<select value={condition.source} onChange={(event) => {
                const conditions = option.conditions.map((item, index) => index === conditionIndex ? { source: event.target.value, values: [] } : item);
                updateOption(option.id, { conditions }); edit(active.id, { sources: [...new Set([...active.sources, event.target.value])], options: active.options.map((item) => item.id === option.id ? { ...item, conditions } : item) });
              }}><option value={condition.source}>{sources.find((source) => source.id === condition.source)?.label || condition.source}</option>{sources.filter((source) => source.id !== condition.source).map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
              <div className="fm-value-choices">{[...new Set([...(sources.find((source) => source.id === condition.source)?.values || []), ...condition.values])].map((value) => <label key={value}><input type="checkbox" checked={condition.values.includes(value)} onChange={(event) => updateOption(option.id, { conditions: option.conditions.map((item, index) => index === conditionIndex ? { ...item, values: event.target.checked ? [...item.values, value] : item.values.filter((existing) => existing !== value) } : item) })} />{value}</label>)}</div>
              {option.conditions.length > 1 && <button type="button" onClick={() => updateOption(option.id, { conditions: option.conditions.filter((_, index) => index !== conditionIndex) })}>Ukloni uslov</button>}
            </div>)}
            <div className="fm-toolbar"><button type="button" onClick={() => updateOption(option.id, { conditions: [...option.conditions, { source: option.conditions[0].source, values: [...option.conditions[0].values] }] })}>+ Alternativni uslov</button>
            <button type="button" className="fm-icon-button" aria-label={`Pomeri opciju ${option.label} gore`} title="Pomeri gore" disabled={index === 0} onClick={() => { const options = [...active.options]; options.splice(index - 1, 0, options.splice(index, 1)[0]); edit(active.id, { options }); }}><ChevronUp size={16} aria-hidden="true" /></button>
            <button type="button" className="fm-icon-button" aria-label={`Pomeri opciju ${option.label} dole`} title="Pomeri dole" disabled={index === active.options.length - 1} onClick={() => { const options = [...active.options]; options.splice(index + 1, 0, options.splice(index, 1)[0]); edit(active.id, { options }); }}><ChevronDown size={16} aria-hidden="true" /></button>
            <button type="button" onClick={() => edit(active.id, { options: active.options.filter((item) => item.id !== option.id) })}>Ukloni opciju</button></div>
          </details>)}
          {missingOptions.length > 0 && <div className="fm-unassigned"><h4>Neraspoređene opcije</h4>{missingOptions.map(({ source, value }) => <button type="button" key={`${source}-${value}`} onClick={() => edit(active.id, { options: [...active.options, { id: filterId(), label: value, visible: true, color: '', image: '', conditions: [{ source, values: [value] }] }] })}>+ {value}</button>)}</div>}
          <div className="fm-new-option"><h4>Nova opcija / funkcija</h4><label>Naziv<input value={optionDraft.label} onChange={(event) => setOptionDraft({ ...optionDraft, label: event.target.value })} /></label><label>Izvor<select value={optionDraft.source} onChange={(event) => setOptionDraft({ ...optionDraft, source: event.target.value, values: [] })}><option value="">Izaberi izvor</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.label}{source.id.startsWith('feature:') ? ' (funkcija)' : ''}</option>)}</select></label>
          <div className="fm-value-choices">{(sources.find((source) => source.id === optionDraft.source)?.values || []).map((value) => <label key={value}><input type="checkbox" checked={optionDraft.values.includes(value)} onChange={(event) => setOptionDraft({ ...optionDraft, values: event.target.checked ? [...optionDraft.values, value] : optionDraft.values.filter((item) => item !== value) })} />{value}</label>)}</div>
          <button type="button" disabled={!optionDraft.label.trim() || !optionDraft.source || !optionDraft.values.length} onClick={() => {
            edit(active.id, { sources: [...new Set([...active.sources, optionDraft.source])], options: [...active.options, { id: filterId(), label: optionDraft.label.trim(), visible: true, color: '', image: '', conditions: [{ source: optionDraft.source, values: optionDraft.values }] }] }); setOptionDraft({ label: '', source: '', values: [] });
          }}>Dodaj opciju</button></div>
        </>}
        <button className="fm-danger" type="button" onClick={() => { setDraft({ ...draft, filters: removeNodes(draft.filters, [active.id]) }); setActiveId(''); setSelectedIds(selectedIds.filter((id) => id !== active.id)); }}>Ukloni filter iz prikaza</button>
      </fieldset>}{errors.map((message) => <p className="fm-error" key={message}>{message}</p>)}</div>{preview && <FilterLivePreview key={department} draft={draft} products={previewProducts} activeId={activeId} loading={storefrontLoading} />}</div>
      <details className="fm-history"><summary>Objavljene verzije ({state?.history?.length || 0})</summary>{state?.history?.map((version) => <div className="fm-source" key={version.revision}><span>Verzija {version.revision} · {new Date(version.publishedAt).toLocaleString('sr-Latn')}</span><button type="button" disabled={busy || !canWrite} onClick={() => {
        if (dirty && !window.confirm('Vraćanje verzije će zameniti nesačuvani nacrt. Nastavi?')) return;
        action(true, version.revision);
      }}>Vrati i objavi</button></div>)}</details>
    </>}
  </section>;
}
