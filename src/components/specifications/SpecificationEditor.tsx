import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import './specification-editor.css';
import { eyewearValueError } from '../../utils/eyewearCatalog';

export type Condition = { specId?: string; brand?: boolean; value: string; operator: 'equals' | 'notEquals' };
export type Rules = Condition[][];
export type Spec = { id: string; name: string; slug: string; unit?: string | null; optionValues: string[] };
export type Field = { specId: string; groupId: string; order: number; visibility: Rules; options: { value: string; rules: Rules }[] };
export type Configuration = { groups: { id: string; name: string }[]; fields: Field[] };
export type EditorData = { version: number; configuration: Configuration; specifications: Spec[]; ranking: Record<string, Record<string, number>>; usageCounts?: Record<string, Record<string, number>>; brands?: {id:string;name:string}[] };
export type EditorRequest = { action: 'get' | 'configure' | 'option'; departmentId: string; brand?: string; specs?: Record<string,string>; version?: number; configuration?: Configuration; specId?: string; value?: string; linkType?: string };
export type EditorApi = (request: EditorRequest) => Promise<EditorData>;
const usageCount = (data: EditorData, specId: string, value: string) => data.usageCounts?.[specId]?.[value];
const usageLabel = (count: number, eyewear = false) => eyewear ? `${count} ${count === 1 ? 'model' : 'modela'}` : `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'sat' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'sata' : 'satova'}`;
const compareOptions = (data: EditorData, specId: string, a: string, b: string) =>
  (usageCount(data,specId,b) ?? data.ranking[specId]?.[b] ?? 0) - (usageCount(data,specId,a) ?? data.ranking[specId]?.[a] ?? 0) || a.localeCompare(b,'sr');
export const normalizeSpec = (value: string) => String(value ?? '').trim().toLocaleLowerCase('sr-RS').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-\s]+/g, '_');
const keyFor = (spec: Spec, values: Record<string,string>) => Object.keys(values).find(k => normalizeSpec(k) === normalizeSpec(spec.slug) || normalizeSpec(k) === normalizeSpec(spec.name)) || spec.slug.replace(/-/g, '_');
const read = (spec: Spec | undefined, values: Record<string,string>) => spec ? String(values[keyFor(spec,values)] ?? '') : '';
const isFunctionFlag = (spec: Spec, data: EditorData) => data.configuration.fields.some(f=>f.specId===spec.id&&f.groupId==='functions') && spec.optionValues.length===2 && ['da','ne'].every(value=>spec.optionValues.some(option=>option.trim().toLowerCase()===value));
function FunctionToggle({spec,value,disabled,onCommit}: {spec:Spec;value:string;disabled:boolean;onCommit:(value:string)=>boolean}) {
  const checked=value.trim().toLowerCase()==='da';
  return <label className={`se-function-toggle${checked?' is-checked':''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onCommit(e.target.checked?'Da':'Ne')}/><span>{spec.name}</span><small>{checked?'Da':'Ne'}</small></label>;
}
const displayValue = (spec: Spec, value: string) => spec.unit && value.trim().toLowerCase().endsWith(spec.unit.toLowerCase()) ? value.trim().slice(0,-spec.unit.length).trim() : value;
const storedValue = (spec: Spec, value: string) => {
  const existing = spec.optionValues.find(v=>normalizeSpec(displayValue(spec,v))===normalizeSpec(displayValue(spec,value)));
  if(existing) return existing;
  return value && spec.unit && !value.toLowerCase().endsWith(spec.unit.toLowerCase()) ? `${value} ${spec.unit}` : value;
};
function matches(rules: Rules, data: EditorData, values: Record<string,string>, brand: string, allowUnset = true): boolean {
  return !rules.length || rules.some(rule => rule.every(c => {
    const value = c.brand ? brand : read(data.specifications.find(s => s.id === c.specId),values);
    if (!value.trim()) return allowUnset;
    return c.operator === 'equals' ? normalizeSpec(value) === normalizeSpec(c.value) : normalizeSpec(value) !== normalizeSpec(c.value);
  }));
}
const isSeries = (spec: Spec | undefined) => normalizeSpec(spec?.slug || '') === 'serija' || normalizeSpec(spec?.name || '') === 'serija';
function useConnected() {
  const [connected,setConnected]=useState(navigator.onLine);
  useEffect(()=>{const update=()=>setConnected(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return connected;
}
function useEditor(api: EditorApi, departmentId: string, brand: string, values: Record<string,string>) {
  const [data,setData] = useState<EditorData>(); const [error,setError] = useState(''); const [loading,setLoading] = useState(false);
  const latest = useRef(values); latest.current = values;
  const activeDepartment = useRef('');
  const [reload,setReload] = useState(0);
  const type = Object.entries(values).find(([key]) => normalizeSpec(key) === 'tip_mehanizma')?.[1] || '';
  useEffect(() => {
    let current = true;
    if (!departmentId) { setData(undefined); return; }
    if(activeDepartment.current!==departmentId){setData(undefined);activeDepartment.current=departmentId;}
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      void api({action:'get',departmentId,brand,specs:latest.current}).then(result => { if(current) setData(previous=>previous&&previous.version>result.version?previous:result); }).catch(e => { if(current) setError(e instanceof Error ? e.message : 'Učitavanje nije uspelo.'); }).finally(() => { if(current) setLoading(false); });
    },150);
    return () => {current=false;window.clearTimeout(timer);};
  },[api,departmentId,brand,type,reload]);
  return {data:activeDepartment.current===departmentId?data:undefined,setData,error,setError,loading,reload:()=>setReload(n=>n+1)};
}

function ValueInput({eyewear=false,spec,value,options,disabled,onCommit,onSave,onLink,onEditing,canLink,busy,message}: {eyewear?:boolean;spec:Spec;value:string;options:{value:string;unknown:boolean;count?:number}[];disabled:boolean;onCommit:(value:string)=>boolean;onSave:(value:string)=>void;onLink:(value:string)=>void;onEditing:(editing:boolean)=>void;canLink:boolean;busy:boolean;message:string}) {
  const [draft,setDraft]=useState(displayValue(spec,value));const [open,setOpen]=useState(false);const [index,setIndex]=useState(-1);
  const input=useRef<HTMLInputElement>(null);const root=useRef<HTMLDivElement>(null);
  useEffect(()=>setDraft(displayValue(spec,value)),[value,spec.unit]);
  const visible=options.filter(o=>normalizeSpec(displayValue(spec,o.value)).includes(normalizeSpec(draft)));
  const unknown=options.some(o=>normalizeSpec(displayValue(spec,o.value))===normalizeSpec(draft)&&o.unknown);
  const isNew=draft.trim()&&!spec.optionValues.some(o=>normalizeSpec(displayValue(spec,o))===normalizeSpec(draft));
  const commit=(next:string)=>{const ok=onCommit(storedValue(spec,next.trim())); if(!ok)setDraft(displayValue(spec,value));setOpen(false);setIndex(-1);return ok;};
  return <div className="se-field" ref={root} onFocus={()=>onEditing(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node)){commit(draft);onEditing(false);}}}>
    <label htmlFor={`se-${spec.id}`}>{spec.name}</label>
    <div className="se-input-wrap">
      <input autoComplete="off" autoCorrect="off" spellCheck={false} id={`se-${spec.id}`} ref={input} disabled={disabled||busy} value={draft} placeholder="Upiši ili izaberi…" role="combobox" aria-expanded={open} aria-controls={`se-options-${spec.id}`} aria-autocomplete="list" aria-activedescendant={open&&index>=0?`se-option-${spec.id}-${index}`:undefined}
        onPointerDown={e=>{if(e.button===0){setOpen(true);setIndex(-1);}}} onChange={e=>{setDraft(e.target.value);setIndex(-1);}}
        onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}if(open&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setIndex(i=>Math.max(0,Math.min(visible.length-1,i+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'){e.preventDefault();commit(open&&index>=0&&visible[index]?visible[index].value:draft);}}}/>
      {spec.unit&&<span className="se-unit">{spec.unit}</span>}
      {draft&&<button type="button" disabled={disabled||busy} onClick={()=>{setDraft('');commit('');input.current?.focus();}} className="se-icon-button se-clear-value" title={`Obriši ${spec.name}`} aria-label={`Obriši ${spec.name}`}><X size={15} strokeWidth={1.8} aria-hidden="true"/></button>}
      <button type="button" disabled={disabled||busy} onMouseDown={e=>e.preventDefault()} onClick={()=>{input.current?.focus();setOpen(current=>!current);setIndex(-1);}} className="se-icon-button se-dropdown-toggle" aria-expanded={open} title="Prikaži ponuđene vrednosti" aria-label={`Ponuđene vrednosti: ${spec.name}`}><ChevronDown className={open?'se-chevron is-open':'se-chevron'} size={16} strokeWidth={1.8} aria-hidden="true"/></button>
    </div>
    {open&&!disabled&&<div className="se-options" id={`se-options-${spec.id}`} role="listbox">
      {visible.map((o,i)=><button type="button" role="option" aria-selected={i===index} id={`se-option-${spec.id}-${i}`} className={i===index?'is-selected':''} key={o.value} onMouseDown={e=>e.preventDefault()} onClick={()=>{setDraft(displayValue(spec,o.value));commit(o.value);input.current?.focus();setOpen(false);}}><span>{displayValue(spec,o.value)}</span><span className="se-option-meta">{o.count!==undefined&&<small>{usageLabel(o.count,eyewear)}</small>}{o.unknown&&<small>Neklasifikovani</small>}</span></button>)}
      {!visible.length&&<small>{isSeries(spec)?"Nema odgovarajućih serija za izabrani brend. Vrednosti i njihove uslove podesi u podešavanjima specifikacija.":"Nema ponuđenih vrednosti. Možeš upisati novu."}</small>}
    </div>}
    {isNew&&!isSeries(spec)&&<button className="se-save-option" type="button" disabled={disabled||busy} onClick={()=>{if(commit(draft))onSave(storedValue(spec,draft.trim()));}}>{busy?'Čuvanje…':'Sačuvaj kao ponuđenu'}</button>}
    {!isNew&&unknown&&canLink&&<button className="se-save-option" type="button" disabled={disabled||busy} onClick={()=>{if(commit(draft))onLink(storedValue(spec,draft.trim()));}}>Poveži sa izabranim tipom</button>}
    {message&&<small className="se-message" role="status">{message}</small>}
  </div>;
}

export function SpecificationEditor({api,departmentId,brand='',values,onChange,online=true,disabled=false,images=[],onPreview,onAddImage,onBusyChange,showPreview=true,eyewear=false}: {eyewear?:boolean;api:EditorApi;departmentId:string;brand?:string;values:Record<string,string>;onChange:(values:Record<string,string>)=>void;online?:boolean;disabled?:boolean;images?:string[];onPreview?:(index:number)=>void;onAddImage?:()=>void;onBusyChange?:(busy:boolean)=>void;showPreview?:boolean}) {
  const connected=useConnected();online=online&&connected;
  const {data,setData,error,loading,reload}=useEditor(api,departmentId,brand,values);
  const [emptyOnly,setEmptyOnly]=useState(false);const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});const [image,setImage]=useState(0);
  const [activeSpec,setActiveSpec]=useState('');
  const [busy,setBusy]=useState('');const busyRef=useRef(false);const [messages,setMessages]=useState<Record<string,string>>({});
  useEffect(()=>setImage(0),[images[0]]);
  const typeSpec=data?.specifications.find(s=>normalizeSpec(s.slug)==='tip_mehanizma');const type=read(typeSpec,values);
  const optionAllowed=(f:Field|undefined,value:string,next:Record<string,string>)=>{
    const rule=f?.options.find(o=>normalizeSpec(o.value)===normalizeSpec(value));
    if(isSeries(data?.specifications.find(s=>s.id===f?.specId))){
      if(!value.trim())return true;
      return Boolean(brand.trim()&&rule?.rules.some(row=>row.some(c=>c.brand&&c.operator==='equals'&&normalizeSpec(c.value)===normalizeSpec(brand))&&matches([row],data!,next,brand,false)));
    }
    return !rule||matches(rule.rules,data!,next,brand);
  };
  const fieldApplicable=(spec:Spec,next:Record<string,string>)=>{
    const f=data?.configuration.fields.find(f=>f.specId===spec.id);
    return isSeries(spec)?spec.optionValues.some(value=>optionAllowed(f,value,next)):matches(f?.visibility||[],data!,next,brand);
  };
  useEffect(()=>{
    if(!data||loading||disabled||!online||error||!departmentId)return;
    const next={...values};let changed=false;
    for(const spec of data.specifications){
      const f=data.configuration.fields.find(f=>f.specId===spec.id);
      if(isFunctionFlag(spec,data)&&!read(spec,values).trim()&&fieldApplicable(spec,values)&&optionAllowed(f,'Ne',values)){
        next[keyFor(spec,values)]='Ne';changed=true;
      }
    }
    if(changed)onChange(next);
  },[data,loading,disabled,online,error,departmentId,brand,values,onChange]);
  if(!departmentId)return <p className="se-message">Izaberi odeljenje da vidiš specifikacije.</p>;
  const change=(spec:Spec,value:string)=>{
    if(isSeries(spec)&&value.trim()&&!optionAllowed(data?.configuration.fields.find(f=>f.specId===spec.id),value,values)){
      setMessages(m=>({...m,[spec.id]:'Izaberi seriju koja je uslovom povezana sa izabranim brendom.'}));return false;
    }
    if(isSeries(spec))setMessages(m=>({...m,[spec.id]:''}));
    if(eyewear){
      const validation=eyewearValueError(spec.slug,value);
      if(validation){setMessages(m=>({...m,[spec.id]:validation}));return false;}
      setMessages(m=>({...m,[spec.id]:''}));
    }
    const next={...values};for(const k of Object.keys(next))if(normalizeSpec(k)===normalizeSpec(spec.slug)||normalizeSpec(k)===normalizeSpec(spec.name))delete next[k];if(value)next[spec.slug.replace(/-/g,'_')]=value;
    const invalid=data!.specifications.filter(s=>s.id!==spec.id&&read(s,next)).filter(s=>{const f=data!.configuration.fields.find(f=>f.specId===s.id);return !fieldApplicable(s,next)||!optionAllowed(f,read(s,next),next);});
    // Existing inconsistent products are displayed, never silently cleaned on load.
    const changedInvalid=invalid.filter(s=>{const f=data!.configuration.fields.find(f=>f.specId===s.id);return (fieldApplicable(s,values)&&!fieldApplicable(s,next))||(optionAllowed(f,read(s,values),values)&&!optionAllowed(f,read(s,next),next));});
    if(changedInvalid.length&&!window.confirm(`Promena uklanja sledeće vrednosti:\n${changedInvalid.map(s=>`${s.name}: ${read(s,next)}`).join('\n')}\n\nNastavi?`))return false;
    for(const s of changedInvalid)for(const k of Object.keys(next))if(normalizeSpec(k)===normalizeSpec(s.slug)||normalizeSpec(k)===normalizeSpec(s.name))delete next[k];
    onChange(next);return true;
  };
  const save=async(spec:Spec,value:string)=>{
    if(busyRef.current)return;busyRef.current=true;setBusy(spec.id);onBusyChange?.(true);setMessages(m=>({...m,[spec.id]:''}));
    try{const result=await api({action:'option',departmentId,brand,specs:values,specId:spec.id,value,...(normalizeSpec(spec.slug)==='mehanizam'&&type?{linkType:type}:{})});setData(result);setMessages(m=>({...m,[spec.id]:'Ponuđena vrednost je sačuvana.'}));}
    catch(e){setMessages(m=>({...m,[spec.id]:`Nije sačuvano: ${e instanceof Error?e.message:'Pokušaj ponovo.'} Unos je zadržan.`}));}
    finally{busyRef.current=false;setBusy('');onBusyChange?.(false);}
  };
  const groups=[...(data?.configuration.groups||[]),{id:'other',name:'Ostalo'}];
  const fields=data?.configuration.fields||[];
  const extra=Object.keys(values).filter(k=>!k.startsWith('_')&&!normalizeSpec(k).startsWith('rfid')&&!data?.specifications.some(s=>normalizeSpec(k)===normalizeSpec(s.slug)||normalizeSpec(k)===normalizeSpec(s.name)));
  return <section className="specification-editor">
    <header className="se-toolbar"><h3>Tehničke specifikacije</h3><label><input autoComplete="off" autoCorrect="off" spellCheck={false} type="checkbox" checked={emptyOnly} onChange={e=>setEmptyOnly(e.target.checked)}/> Samo prazna</label></header>
    {!online&&<p role="alert">Za uređivanje specifikacija potrebna je internet veza. Unos je zadržan.</p>}
    {error&&<p className="se-error" role="alert">{error} <button type="button" onClick={reload}>Ponovo učitaj</button></p>}
    {loading&&!data&&<p>Učitavanje specifikacija…</p>}
    <div className={`se-layout${showPreview ? '' : ' se-layout-fields-only'}`}><div className="se-fields">
      {data&&groups.map(group=>{
        const specs=data.specifications.filter(s=>fields.find(f=>f.specId===s.id)?.groupId===group.id).sort((a,b)=>(fields.find(f=>f.specId===a.id)?.order||0)-(fields.find(f=>f.specId===b.id)?.order||0));
        const applicable=specs.filter(s=>fieldApplicable(s,values));
        const shown=specs.filter(s=>(applicable.includes(s)||Boolean(read(s,values)))&&(!emptyOnly||!read(s,values)||activeSpec===s.id));
        if(!specs.length)return null;
        return <section className="se-group" key={group.id}><button type="button" className="se-group-heading" aria-expanded={!collapsed[group.id]} onClick={()=>setCollapsed(c=>({...c,[group.id]:!c[group.id]}))}><strong>{group.name}</strong><span>{applicable.filter(s=>read(s,values)).length}/{applicable.length} popunjeno <ChevronDown className={collapsed[group.id]?'se-chevron':'se-chevron is-open'} size={16} strokeWidth={1.8} aria-hidden="true"/></span></button>
          {!collapsed[group.id]&&<div className="se-group-fields">{shown.map(spec=>{
            const f=fields.find(f=>f.specId===spec.id);const ranked=spec.optionValues.filter(v=>optionAllowed(f,v,values)).map(value=>({value,count:usageCount(data,spec.id,value),unknown:normalizeSpec(spec.slug)==='mehanizam'&&!f?.options.some(o=>normalizeSpec(o.value)===normalizeSpec(value)&&o.rules.length)})).sort((a,b)=>compareOptions(data,spec.id,a.value,b.value));
            const inconsistent=!applicable.includes(spec)||(Boolean(read(spec,values))&&!optionAllowed(f,read(spec,values),values));
            return <div key={spec.id}>{isFunctionFlag(spec,data)?<FunctionToggle spec={spec} value={read(spec,values)} disabled={disabled||!online||!!error||Boolean(busy)||!optionAllowed(f,read(spec,values).trim().toLowerCase()==='da'?'Ne':'Da',values)} onCommit={v=>change(spec,v)}/>:<ValueInput eyewear={eyewear} spec={spec} value={read(spec,values)} options={ranked} disabled={disabled||!online||!!error} busy={Boolean(busy)} canLink={Boolean(type)} message={messages[spec.id]||''} onEditing={editing=>setActiveSpec(editing?spec.id:'')} onCommit={v=>change(spec,v)} onSave={v=>void save(spec,v)} onLink={v=>void save(spec,v)}/>} {inconsistent&&<small className="se-error">Vrednost ne odgovara izabranim podešavanjima. Obriši je ili ispravi izbor.</small>}</div>;
          })}{!shown.length&&<small>Nema praznih primenljivih polja.</small>}</div>}
        </section>;
      })}
      {data&&extra.length>0&&<section className="se-group"><strong>Ostali postojeći podaci</strong>{extra.map(key=><label className="se-field" key={key}>{key}<input autoComplete="off" autoCorrect="off" spellCheck={false} disabled={disabled||!online||!!error} value={values[key]} onChange={e=>{const next={...values};if(e.target.value)next[key]=e.target.value;else delete next[key];onChange(next);}}/></label>)}</section>}
    </div><aside className={`se-preview${showPreview ? '' : ' se-inline-mobile-preview'}`}><div className="se-preview-sticky">{images.length?<><button className="se-main-image" type="button" onClick={()=>onPreview?.(Math.min(image,images.length-1))}><img src={images[Math.min(image,images.length-1)]} alt={eyewear?"Naočare — pregled za unos specifikacija":"Sat — pregled za unos specifikacija"}/></button><div className="se-thumbnails">{images.map((url,i)=><button type="button" key={`${url}-${i}`} className={i===image?'is-selected':''} onClick={()=>setImage(i)} aria-label={`Fotografija ${i+1}`}><img src={url} alt=""/></button>)}</div><small>Klikni na sliku za uvećanje.</small></>:<button className="se-empty-image" type="button" disabled={disabled||!online} onClick={onAddImage}>＋ {eyewear?"Dodaj fotografiju naočara":"Dodaj fotografiju sata"}<br/><small>Upload ili link kroz galeriju proizvoda</small></button>}</div></aside></div>
  </section>;
}

export function SpecificationPreview({images,onPreview,onAddImage,disabled=false,eyewear=false}: {eyewear?:boolean;images:string[];onPreview:(index:number)=>void;onAddImage:()=>void;disabled?:boolean}) {
  const [image,setImage]=useState(0);
  useEffect(()=>setImage(0),[images[0]]);
  const selected=Math.min(image,images.length-1);
  return <section className="specification-editor se-preview-card" aria-label={eyewear?"Pregled naočara":"Pregled sata"}><h3>{eyewear?"Pregled naočara":"Pregled sata"}</h3>
    {images.length ? <><button className="se-main-image" type="button" onClick={()=>onPreview(selected)}><img src={images[selected]} alt={eyewear?"Naočare — pregled za unos specifikacija":"Sat — pregled za unos specifikacija"}/></button><div className="se-thumbnails">{images.map((url,i)=><button key={`${url}-${i}`} className={selected===i?'is-selected':''} type="button" onClick={()=>setImage(i)} aria-label={`Fotografija ${i+1}`}><img src={url} alt=""/></button>)}</div><small>Klikni na sliku za uvećanje.</small></> : <button type="button" className="se-empty-image" disabled={disabled} onClick={onAddImage}>＋ {eyewear?"Dodaj fotografiju naočara":"Dodaj fotografiju sata"}<br/><small>Upload ili link kroz galeriju proizvoda</small></button>}
  </section>;
}

function RuleEditor({rules,onChange,specs,brands,self,disabled}: {rules:Rules;onChange:(rules:Rules)=>void;specs:Spec[];brands:{id:string;name:string}[];self:string;disabled:boolean}) {
  const ruleId=useId();
  const changeCondition=(i:number,j:number,patch:Partial<Condition>)=>{
    const next=rules.map(r=>r.map(v=>({...v})));next[i][j]={...next[i][j],...patch};onChange(next);
  };
  return <div className="se-rules">
    <p className="se-rule-help">{rules.length?'I: svi uslovi u istoj grupi moraju važiti. ILI: dovoljno je da važi jedna cela grupa.':'Bez uslova — dostupno za sve brendove i vrednosti.'}</p>
    {rules.map((row,i)=><div className="se-rule" key={i}>
      <strong className="se-rule-group-label">{i ? 'ILI — druga mogućnost' : 'Prva grupa uslova'}</strong>
      {row.map((c,j)=>{
        const spec=specs.find(s=>s.id===c.specId);
        const options=c.brand?brands.map(b=>b.name):spec?.optionValues||[];
        return <div className="se-condition" key={j}>
          <select disabled={disabled} aria-label="Uslov zavisi od" value={c.brand?'brand':c.specId||''} onChange={e=>{
            const next=rules.map(r=>r.map(v=>({...v})));
            next[i][j]=e.target.value==='brand'?{brand:true,value:'',operator:c.operator}:{specId:e.target.value,value:'',operator:c.operator};onChange(next);
          }}><option value="brand">Brend</option>{specs.filter(s=>s.id!==self).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select disabled={disabled} aria-label="Poređenje" value={c.operator} onChange={e=>changeCondition(i,j,{operator:e.target.value as Condition['operator']})}><option value="equals">je</option><option value="notEquals">nije</option></select>
          {c.brand?<select disabled={disabled} aria-label="Izaberi brend" value={c.value} onChange={e=>changeCondition(i,j,{value:e.target.value})}>
            <option value="">Izaberi brend…</option>
            {c.value&&!options.includes(c.value)&&<option value={c.value}>{c.value} (postojeći uslov)</option>}
            {brands.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
          </select>:<input autoComplete="off" autoCorrect="off" spellCheck={false} disabled={disabled} aria-label={`Vrednost za ${spec?.name||'specifikaciju'}`} placeholder={spec?`Vrednost: ${spec.name}`:'Upiši vrednost…'} list={`se-rule-values-${ruleId}-${i}-${j}`} value={c.value} onChange={e=>changeCondition(i,j,{value:e.target.value})}/>}
          {!c.brand&&<datalist id={`se-rule-values-${ruleId}-${i}-${j}`}>{options.map(value=><option key={value} value={value}/>)}</datalist>}
          <button type="button" disabled={disabled} onClick={()=>onChange(rules.map((r,k)=>k===i?r.filter((_,n)=>n!==j):r).filter(r=>r.length))} className="se-icon-button" title="Ukloni uslov" aria-label="Ukloni uslov"><X size={15} strokeWidth={1.8} aria-hidden="true"/></button>
        </div>;
      })}
      <button type="button" disabled={disabled} onClick={()=>onChange(rules.map((r,k)=>k===i?[...r,{brand:true,value:'',operator:'equals' as const}]:r))}>＋ I — dodaj obavezan uslov</button>
    </div>)}
    <button type="button" disabled={disabled} onClick={()=>onChange([...rules,[{brand:true,value:'',operator:'equals' as const}]])}>＋ {rules.length?'ILI — dodaj drugu mogućnost':'Dodaj uslov'}</button>
  </div>;
}

export function SpecificationSettings({api,departments,online=true,disabled=false}: {api:EditorApi;departments:{id:string;name:string}[];online?:boolean;disabled?:boolean}) {
  const connected=useConnected();online=online&&connected;
  const [department,setDepartment]=useState('');const departmentId=department||departments[0]?.id||'';
  const {data,error,setError,loading,reload,setData}=useEditor(api,departmentId,'',{});
  const [config,setConfig]=useState<Configuration>();const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
  useEffect(()=>{setConfig(data?.configuration);setNotice('');},[data]);
  const eyewear=/nao[čc]are/i.test(departments.find(d=>d.id===departmentId)?.name||'');
  const locked=disabled||!online||busy||loading;
  const updateField=(specId:string,patch:Partial<Field>)=>setConfig(c=>c?{...c,fields:c.fields.map(f=>f.specId===specId?{...f,...patch}:f)}:c);
  const save=async()=>{if(!data||!config)return;setBusy(true);setError('');setNotice('');try{const result=await api({action:'configure',departmentId,version:data.version,configuration:config});setData(result);setNotice('Podešavanja su sačuvana.');}catch(e){setError(e instanceof Error?e.message:'Čuvanje nije uspelo.');}finally{setBusy(false);}};
  return <section className="specification-editor se-settings"><header className="se-toolbar"><h3>Kategorije i pravila unosa</h3><select value={departmentId} disabled={busy} onChange={e=>{if(!config||!data||JSON.stringify(config)===JSON.stringify(data.configuration)||window.confirm('Odbaci nesačuvana podešavanja i promeni odeljenje?'))setDepartment(e.target.value);}}>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></header>
    {!online&&<p role="alert">Podešavanja zahtevaju internet vezu.</p>}{error&&<p className="se-error" role="alert">{error} <button type="button" onClick={()=>{if(window.confirm('Ponovo učitaj i odbaci nesačuvana podešavanja?'))reload();}}>Ponovo učitaj</button></p>}{notice&&<p role="status">{notice}</p>}
    <p className="se-rule-help">Vrednost je ono što porediš sa unosom proizvoda: za brend biraš stvaran brend, a za specifikaciju, na primer, „Automatski“. „Je“ traži poklapanje; „nije“ ga isključuje. Pravila polja određuju kada se polje vidi, a pravila ponuđene vrednosti kada je taj odgovor dostupan.</p>
    {config&&data&&<><div className="se-group-fields">{config.groups.map((g,i)=><div className="se-category" key={g.id}><input autoComplete="off" autoCorrect="off" spellCheck={false} disabled={locked} aria-label="Naziv kategorije" value={g.name} onChange={e=>setConfig({...config,groups:config.groups.map(v=>v.id===g.id?{...v,name:e.target.value}:v)})}/><button type="button" disabled={locked||!i} onClick={()=>{const list=[...config.groups];[list[i-1],list[i]]=[list[i],list[i-1]];setConfig({...config,groups:list});}} className="se-icon-button" title="Pomeri kategoriju gore" aria-label="Pomeri kategoriju gore"><ChevronUp size={16} strokeWidth={1.8} aria-hidden="true"/></button><button type="button" disabled={locked||i===config.groups.length-1} onClick={()=>{const list=[...config.groups];[list[i+1],list[i]]=[list[i],list[i+1]];setConfig({...config,groups:list});}} className="se-icon-button" title="Pomeri kategoriju dole" aria-label="Pomeri kategoriju dole"><ChevronDown size={16} strokeWidth={1.8} aria-hidden="true"/></button><button type="button" disabled={locked} onClick={()=>setConfig({...config,groups:config.groups.filter(v=>v.id!==g.id),fields:config.fields.map(f=>f.groupId===g.id?{...f,groupId:'other'}:f)})} className="se-icon-button" title="Obriši kategoriju" aria-label="Obriši kategoriju"><X size={15} strokeWidth={1.8} aria-hidden="true"/></button></div>)}</div>
      <div className="se-category"><input autoComplete="off" autoCorrect="off" spellCheck={false} disabled={locked} placeholder="Nova kategorija" value={name} onChange={e=>setName(e.target.value)}/><button type="button" disabled={locked||!name.trim()} onClick={()=>{setConfig({...config,groups:[...config.groups,{id:crypto.randomUUID(),name:name.trim()}]});setName('');}}>Dodaj kategoriju</button></div>
      {data.specifications.map(s=>{const f=config.fields.find(f=>f.specId===s.id);if(!f)return null;return <details className="se-group" key={s.id}><summary>{s.name}</summary><div className="se-settings-field"><label>Kategorija<select disabled={locked} value={f.groupId} onChange={e=>updateField(s.id,{groupId:e.target.value})}>{config.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}<option value="other">Ostalo</option></select></label><label>Redosled<input autoComplete="off" autoCorrect="off" spellCheck={false} disabled={locked} type="number" min="0" value={f.order} onChange={e=>updateField(s.id,{order:Math.max(0,Number(e.target.value)||0)})}/></label></div><h4>Prikazivanje polja</h4>{isSeries(s)?<p className="se-rule-help">Serija se prikazuje kada postoji ponuđena vrednost sa uslovom Brend je izabrani brend. Serije bez tog uslova nisu ponuđene. Veze podesi ispod za svaku vrednost.</p>:<RuleEditor rules={f.visibility} specs={data.specifications} brands={data.brands||[]} self={s.id} disabled={locked} onChange={visibility=>updateField(s.id,{visibility})}/>}<details><summary>Pravila ponuđenih vrednosti</summary>{[...s.optionValues].sort((a,b)=>compareOptions(data,s.id,a,b)).map(value=>{const option=f.options.find(o=>normalizeSpec(o.value)===normalizeSpec(value));return <div className="se-option-rule" key={value}><div className="se-option-heading"><strong>{value}</strong>{usageCount(data,s.id,value)!==undefined&&<small title={eyewear?"Broj modela naočara u katalogu; ne broj komada na stanju":"Broj trenutnih satova u katalogu; ne broj komada na stanju"}>{usageLabel(usageCount(data,s.id,value)!,eyewear)}</small>}</div><RuleEditor rules={option?.rules||[]} specs={data.specifications} brands={data.brands||[]} self={s.id} disabled={locked} onChange={rules=>updateField(s.id,{options:[...f.options.filter(o=>normalizeSpec(o.value)!==normalizeSpec(value)),{value,rules}]})}/></div>;})}</details></details>;})}
      <button className="se-primary" type="button" disabled={locked} onClick={()=>void save()}>{busy?'Čuvanje…':'Sačuvaj kategorije i pravila'}</button>
    </>}
  </section>;
}
