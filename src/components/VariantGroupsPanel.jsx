import React, { useEffect, useMemo, useState } from 'react';
import { variantGroupsApi, subscribeStaffCatalogRealtime } from '../services/dajaPlatform.js';
import './VariantGroupsPanel.css';

const EMPTY = { groups: [], products: [], assignments: {}, ungroupedIds: [], revision: 0, catalogRevision: '' };
const modes = [['all', 'Sve'], ['automatic', 'Automatske'], ['customized', 'Prilagođene'], ['custom', 'Moje grupe'], ['ungrouped', 'Bez grupe']];
const kindLabel = g => g.kind === 'custom' ? 'Ručna grupa' : g.customized ? g.followAuto ? 'Automatika + izuzeci' : 'Zaključani članovi' : 'Automatska';
const copy = g => ({ ...g, internalName: g.internalName || '', memberIds: [...g.memberIds], removedIds: [], addedIds: [] });
const sameMembers = (a, b) => a.length === b.length && a.every(id => b.includes(id));
const textMatch = (text, query) => text.toLocaleLowerCase('sr').includes(query.trim().toLocaleLowerCase('sr'));
function Photo({ product }) { return product?.image ? <img src={product.image} alt="" loading="lazy" /> : <span className="vg-no-photo">—</span>; }

export default function VariantGroupsPanel({ onDirtyChange }) {
  const [data, setData] = useState(EMPTY);
  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [department, setDepartment] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [checked, setChecked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dirty = Boolean(draft && (!original || draft.internalName.trim() !== (original.internalName || '') ||
    draft.followAuto !== original.followAuto || !sameMembers(draft.memberIds, original.memberIds)));
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { const result = await variantGroupsApi.list(); if (mounted) { setData(current => result.revision >= current.revision ? result : current); } }
      catch (err) { if (mounted) setError(err.message); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    const stop = subscribeStaffCatalogRealtime(event => {
      if (['catalog.variant-groups.updated', 'product.updated'].includes(event.event)) void load();
    });
    window.addEventListener('focus', load);
    return () => { mounted = false; stop(); window.removeEventListener('focus', load); };
  }, []);
  useEffect(() => {
    if (!dirty) return undefined;
    const beforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const products = useMemo(() => new Map(data.products.map(p => [p.id, p])), [data.products]);
  const groups = useMemo(() => new Map(data.groups.map(g => [g.key, g])), [data.groups]);
  const matchesFilter = p => p && (!brand || p.brand === brand) && (!department || p.department === department);
  const newGroup = draft?.key === null ? { ...draft, key: 'new-draft', name: draft.internalName.trim() ||
    (draft.memberIds.length ? `Grupa — ${products.get(draft.memberIds[0])?.name || 'proizvod'}` : 'Nova grupa') } : null;
  const listedGroups = newGroup ? [newGroup, ...data.groups] : data.groups;
  const visibleGroups = listedGroups.filter(g =>
    (mode === 'all' || mode === 'automatic' && g.kind === 'automatic' && !g.customized ||
      mode === 'customized' && g.customized && g.kind === 'automatic' || mode === 'custom' && g.kind === 'custom') &&
    (!brand && !department || g.memberIds.some(id => matchesFilter(products.get(id)))) &&
    (textMatch(g.name, search) || g.memberIds.some(id => textMatch(products.get(id)?.name || '', search))));
  const members = draft?.memberIds.map(id => products.get(id)).filter(Boolean) || [];
  const pendingMoves = members.filter(p => !original?.memberIds.includes(p.id) && data.assignments[p.id] && data.assignments[p.id] !== draft?.key);
  const stale = draft && (draft.revision !== data.revision || draft.catalogRevision !== data.catalogRevision);
  const canLeave = () => !dirty || window.confirm('Postoje nesnimljene izmene. Odbaciti ih?');
  const select = group => {
    if (busy || !canLeave()) return;
    setOriginal(group); setDraft(copy(group)); setChecked([]); setProductSearch(''); setError('');
  };
  const create = () => {
    if (busy || !canLeave()) return;
    setMode('all'); setSearch(''); setBrand(''); setDepartment('');
    setOriginal(null); setChecked([]); setProductSearch(''); setError('');
    setDraft({ key: null, id: null, kind: 'custom', name: 'Nova grupa', internalName: '', followAuto: false,
      memberIds: [], automaticMemberIds: [], manualMemberIds: [], excludedIds: [], removedIds: [], addedIds: [], revision: data.revision, catalogRevision: data.catalogRevision });
  };
  const removeIds = ids => {
    setDraft(current => {
      const removedIds = [...new Set([...current.removedIds, ...ids])];
      const candidates = current.kind === 'automatic' && current.followAuto ? current.automaticMemberIds : [];
      return { ...current, memberIds: [...new Set([...current.memberIds, ...candidates])].filter(id => !removedIds.includes(id)), removedIds, addedIds: current.addedIds.filter(id => !ids.includes(id)) };
    });
    setChecked([]);
  };
  const add = id => setDraft(current => {
    const removedIds = current.removedIds.filter(item => item !== id);
    const candidates = current.kind === 'automatic' && current.followAuto ? current.automaticMemberIds : [];
    return { ...current, memberIds: [...new Set([...current.memberIds, ...candidates, id])].filter(item => !removedIds.includes(item)), removedIds, addedIds: [...new Set([...current.addedIds,id])] };
  });
  const changeMode = followAuto => setDraft(current => ({ ...current, followAuto,
    memberIds: followAuto ? [...new Set([...current.manualMemberIds.filter(id => current.memberIds.includes(id)), ...current.addedIds, ...current.automaticMemberIds])].filter(id => !current.removedIds.includes(id)) : current.memberIds }));
  const apply = (result, selectedKey) => {
    setData(current => result.revision >= current.revision ? result : current); setChecked([]); setProductSearch('');
    const selected = result.groups.find(g => g.key === selectedKey);
    setOriginal(selected || null); setDraft(selected ? copy(selected) : null);
    window.dispatchEvent(new CustomEvent('daja:variant-groups-changed'));
  };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true); setError('');
    try {
      const result = await variantGroupsApi.save({ key: draft.key, expectedRevision: draft.revision,
        expectedCatalogRevision: draft.catalogRevision,
        removedIds: draft.removedIds,
        internalName: draft.internalName.trim() || null, followAuto: draft.followAuto, memberIds: draft.memberIds,
        editMembers: !original || draft.followAuto !== original.followAuto || !sameMembers(draft.memberIds, original.memberIds) });
      apply(result, draft.key || result.groups.find(g => g.kind === 'custom' && !groups.has(g.key))?.key);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const action = async (type, productId) => {
    if (busy || !canLeave()) return;
    const message = type === 'delete' ? 'Obrisati sopstvenu grupu? Njeni preostali članovi vraćaju se na automatsko povezivanje.' :
      type === 'reset' ? 'Poništiti prilagođavanje? Interni naziv ostaje, a proizvodi premešteni u druge grupe ostaju tamo.' : 'Vratiti automatsko povezivanje ovog proizvoda?';
    if (!window.confirm(message)) return;
    setBusy(true); setError('');
    try {
      const result = type === 'delete' ? await variantGroupsApi.remove(draft.key, data.revision, data.catalogRevision) :
        type === 'reset' ? await variantGroupsApi.reset(draft.key, data.revision, data.catalogRevision) : await variantGroupsApi.resetProduct(productId, data.revision, data.catalogRevision);
      apply(result, draft?.key);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const refresh = async () => {
    if (busy || !canLeave()) return;
    setBusy(true); setError('');
    try { apply(await variantGroupsApi.list(), draft?.key); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const title = draft?.internalName.trim() || (draft?.kind === 'automatic' ? draft.prefix.startsWith('naocare:') ? draft.name : draft.prefix : members.length ? `Grupa — ${members[0].name}` : 'Nova grupa');
  const ungrouped = data.ungroupedIds.map(id => products.get(id)).filter(p => matchesFilter(p) && textMatch(p.name, search));
  const results = productSearch.trim() ? data.products.filter(p => textMatch(`${p.name} ${p.brand || ''}`, productSearch) && !draft?.memberIds.includes(p.id)) : [];
  return <section className="variant-groups">
    <header className="vg-heading"><div><h2>Grupe varijanti</h2><p>Automatske veze i tvoje grupe. Interni nazivi vidljivi su samo administratorima.</p></div><div className="vg-actions"><button disabled={busy} onClick={refresh}>Osveži</button><button className="vg-primary" disabled={busy || loading} onClick={create}>+ Nova grupa</button></div></header>
    {error && <div className="vg-error" role="alert">{error}</div>}
    <div className="vg-filters"><input aria-label="Pretraga grupa" placeholder="Pretraži grupe ili modele…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Vrsta grupe" value={mode} onChange={e => setMode(e.target.value)}>{modes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Brend" value={brand} onChange={e => setBrand(e.target.value)}><option value="">Svi brendovi</option>{[...new Set(data.products.map(p => p.brand).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}</select><select aria-label="Odeljenje" value={department} onChange={e => setDepartment(e.target.value)}><option value="">Sva odeljenja</option>{[...new Set(data.products.map(p => p.department).filter(Boolean))].sort().map(name => <option key={name}>{name}</option>)}</select></div>
    {loading ? <p className="vg-empty">Učitavanje grupa…</p> : <div className="vg-layout"><aside className="vg-list"><div className="vg-list-caption">{mode === 'ungrouped' ? `${ungrouped.length} proizvoda bez grupe` : `${visibleGroups.length} grupa`}</div>
      {mode === 'ungrouped' ? ungrouped.map(p => <div key={p.id} className="vg-ungrouped"><Photo product={p} /><div><strong>{p.name}</strong><small>{p.brand || 'Bez brenda'}</small></div><button disabled={busy} onClick={() => action('product-reset', p.id)}>Vrati automatiku</button></div>) : visibleGroups.map(group => <button key={group.key} disabled={busy} className={`vg-group ${draft?.key === group.key || group.key === 'new-draft' ? 'selected' : ''}`} onClick={() => { if (group.key !== 'new-draft') select(group); }}><span className="vg-group-title"><strong>{group.name}</strong><span>{group.memberIds.length}</span></span><small>{kindLabel(group)}</small><div className="vg-thumbnails">{group.memberIds.slice(0,5).map(id => <Photo key={id} product={products.get(id)} />)}{group.memberIds.length > 5 && <span>+{group.memberIds.length - 5}</span>}</div></button>)}
      {!(mode === 'ungrouped' ? ungrouped.length : visibleGroups.length) && <p className="vg-empty">Nema rezultata za ove filtere.</p>}</aside>
      <main className="vg-detail">{!draft ? <div className="vg-empty"><h3>Izaberi grupu ili napravi novu</h3><p>Automatika ostaje uključena dok ne promeniš članstvo ili zaključaš grupu.</p></div> : <>
        <div className="vg-detail-heading"><div><h3>{title}</h3><small>{kindLabel(draft)} · {members.length} članova · {members.filter(p => p.public).length} javno dostupnih</small></div>{dirty && <span className="vg-badge">Nesnimljene izmene</span>}</div>
        {stale && <p className="vg-warning">Podaci su u međuvremenu izmenjeni. Osveži grupu pre čuvanja; tvoje izmene nisu prepisane.</p>}
        <fieldset disabled={busy}><label className="vg-name">Interni naziv<input maxLength={240} placeholder={draft.kind === 'automatic' ? draft.prefix.startsWith('naocare:') ? draft.name : draft.prefix : 'Generiše se iz prvog proizvoda'} value={draft.internalName} onChange={e => setDraft(current => ({ ...current, internalName: e.target.value }))} /></label><small>Ostavi prazno za automatski naziv. Naziv ne menja članstvo i ne prikazuje se kupcima.</small>
          {draft.kind === 'automatic' && <div className="vg-mode"><label><input type="radio" name="group-mode" checked={draft.followAuto} onChange={() => changeMode(true)} />Nastavi automatsko dodavanje</label><label><input type="radio" name="group-mode" checked={!draft.followAuto} onChange={() => changeMode(false)} />Zaključaj članove</label><small>{draft.prefix.startsWith('naocare:') ? `Pravilo: isti brend i osnovni model ${draft.prefix.split(':').at(-1)} u odeljenju naočara.` : `Pravilo: naziv počinje sa „${draft.prefix}“.`} Ručna dodavanja i izbacivanja ostaju zapamćena.</small></div>}
          <div className="vg-members-heading"><h4>Članovi grupe</h4><button disabled={!checked.length} onClick={() => removeIds(checked)}>Ukloni izabrane ({checked.length})</button></div>
          <div className="vg-members"><table><thead><tr><th><input type="checkbox" aria-label="Izaberi sve članove" checked={members.length > 0 && checked.length === members.length} onChange={e => setChecked(e.target.checked ? members.map(p => p.id) : [])} /></th><th>Proizvod</th><th>Vidljivost</th><th>Radnje</th></tr></thead><tbody>{members.map(p => <tr key={p.id}><td><input type="checkbox" aria-label={`Izaberi ${p.name}`} checked={checked.includes(p.id)} onChange={e => setChecked(current => e.target.checked ? [...current,p.id] : current.filter(id => id !== p.id))} /></td><td><div className="vg-product"><Photo product={p} /><div><strong>{p.name}</strong><small>{p.brand || 'Bez brenda'}{p.department ? ` · ${p.department}` : ''}</small>{pendingMoves.some(item => item.id === p.id) && <small className="vg-move">Premešta se iz: {groups.get(data.assignments[p.id])?.name || 'automatske grupe'}</small>}</div></div></td><td><span className={`vg-status ${p.public ? 'public' : ''}`}>{p.public ? 'Javan' : 'Skriven'}</span></td><td><div className="vg-row-actions"><button onClick={() => removeIds([p.id])}>Ukloni</button>{original?.memberIds.includes(p.id) && <button onClick={() => action('product-reset', p.id)}>Vrati automatiku</button>}</div></td></tr>)}</tbody></table>{!members.length && <p className="vg-empty">Grupa nema članove. Možeš je sačuvati i praznu.</p>}</div>
          <small>Uklonjeni proizvodi ostaju samostalni dok ih ne dodaš u grupu ili vratiš automatiku. Kupci vide varijante tek sa dva javna člana.</small>
          <label className="vg-search-label">Dodaj iz celog kataloga<input placeholder="Pretraži naziv ili brend proizvoda…" value={productSearch} onChange={e => setProductSearch(e.target.value)} /></label>
          {productSearch.trim() && <div className="vg-search-results">{results.map(p => <div key={p.id} className="vg-search-product"><Photo product={p} /><div><strong>{p.name}</strong><small>{p.brand || 'Bez brenda'} · {p.public ? 'Javan' : 'Skriven'}{data.assignments[p.id] && data.assignments[p.id] !== draft.key ? ` · Iz grupe: ${groups.get(data.assignments[p.id])?.name || 'automatske'}` : ''}</small></div><button onClick={() => add(p.id)}>Dodaj</button></div>)}{!results.length && <p className="vg-empty">Nema drugih proizvoda za ovu pretragu.</p>}</div>}
        </fieldset>
        {draft.excludedIds.length > 0 && <details className="vg-excluded"><summary>Izdvojeni proizvodi ({draft.excludedIds.filter(id => products.has(id)).length})</summary>{draft.excludedIds.filter(id => products.has(id)).map(id => <div key={id}><span>{products.get(id).name}</span><div className="vg-row-actions"><button disabled={busy || draft.memberIds.includes(id)} onClick={() => add(id)}>Vrati u grupu</button><button disabled={busy} onClick={() => action('product-reset', id)}>Vrati automatiku</button></div></div>)}</details>}
        {pendingMoves.length > 0 && <p className="vg-warning">Čuvanje premešta {pendingMoves.length} proizvoda iz prethodnih grupa. Pogledaj označene članove iznad.</p>}
        <footer className="vg-footer"><div className="vg-actions">{draft.id && draft.kind === 'automatic' && draft.customized && <button disabled={busy} onClick={() => action('reset')}>Poništi prilagođavanje</button>}{draft.id && draft.kind === 'custom' && <button className="vg-danger" disabled={busy} onClick={() => action('delete')}>Obriši grupu</button>}</div><div className="vg-actions"><button disabled={busy || !dirty} onClick={() => { setDraft(original ? copy(original) : null); setChecked([]); }}>Otkaži</button><button className="vg-primary" disabled={busy || !dirty || stale} onClick={save}>{busy ? 'Čuvanje…' : 'Sačuvaj'}</button></div></footer>
      </>}</main></div>}
  </section>;
}
