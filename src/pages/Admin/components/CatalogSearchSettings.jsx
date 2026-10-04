import { useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Save, Search } from 'lucide-react';
import { catalogSearchSettingsApi } from '../../../services/dajaPlatform.js';
import './CatalogSearchSettings.css';
export default function CatalogSearchSettings({ canWrite = false }) {
  const [data,setData]=useState(null),[rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function load(){setBusy(true);setError('');try{const result=await catalogSearchSettingsApi.get();setData(result);setRows(result.synonyms);}catch(e){setError(e.message||'Učitavanje nije uspelo.');}finally{setBusy(false);}}
  useEffect(()=>{void load();},[]);
  async function save(){setBusy(true);setError('');setNotice('');try{const result=await catalogSearchSettingsApi.save({version:data.version,synonyms:rows.map(row=>({alias:row.alias.trim(),target:row.target.trim()}))});setData(result);setRows(result.synonyms);setNotice('Sinonimi su sačuvani.');}catch(e){setError(e.message||'Čuvanje nije uspelo. Unos je zadržan.');}finally{setBusy(false);}}
  function change(index,key,value){setRows(current=>current.map((row,i)=>i===index?{...row,[key]:value}:row));}
  return <div className="catalog-search-settings">
    <section><header><h2><Search size={20}/> Podešavanja pretrage</h2><button type="button" disabled={busy} onClick={()=>{if(!data||JSON.stringify(rows)===JSON.stringify(data.synonyms)||window.confirm('Ponovo učitaj i odbaci nesačuvane sinonime?'))void load();}}><RefreshCw size={16}/> Ponovo učitaj</button></header>
      <p>Osnovni srpski i engleski izrazi već su uključeni. Ovde dodaj svoje: levo upit korisnika, desno postojeći brend, kolekciju ili osobinu. Na primer: „daniel klajn“ → „Daniel Klein“. Sinonimi služe za reči i izraze; brojevi modela, dimenzije i cene se ne preusmeravaju.</p>
      {error&&<p role="alert" className="catalog-search-settings__error">{error}</p>}{notice&&<p role="status">{notice}</p>}
      {rows.map((row,i)=><div className="catalog-search-settings__row" key={i}><input disabled={busy||!canWrite} aria-label="Izraz korisnika" placeholder="Izraz korisnika" value={row.alias} maxLength={80} onChange={e=>change(i,'alias',e.target.value)}/><span>→</span><input disabled={busy||!canWrite} aria-label="Traži kao" placeholder="Traži kao…" value={row.target} maxLength={80} onChange={e=>change(i,'target',e.target.value)}/><button type="button" disabled={busy||!canWrite} aria-label="Ukloni sinonim" onClick={()=>setRows(rows.filter((_,j)=>i!==j))}><X size={16}/></button></div>)}
      <footer><button type="button" disabled={busy||!canWrite||rows.length>=400} onClick={()=>setRows([...rows,{alias:'',target:''}])}><Plus size={16}/> Dodaj sinonim</button><button type="button" disabled={!data||busy||!canWrite||rows.some(r=>r.alias.trim().length<2||r.target.trim().length<2)} onClick={()=>void save()}><Save size={16}/> {busy?'Čuvanje…':'Sačuvaj sinonime'}</button></footer>
    </section>
  </div>;
}
