import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ChevronDown,X} from 'lucide-react';
import {useStorefront} from '../localization/StorefrontContext.jsx';
import HeaderDropdown from './ui/HeaderDropdown.jsx';
import useCollectionPreviews from '../hooks/useCollectionPreviews.js';
import CollectionPreview from './CollectionPreview.jsx';
import './Collections.css';
export default function CollectionsMenu(){
  const {t}=useStorefront();const location=useLocation();
  const [open,setOpen]=useState(false);const [selected,setSelected]=useState('/orient-bambino');
  const anchor=useRef(null),panel=useRef(null);
  const {groups,loading,error,retry}=useCollectionPreviews(open);
  const collections=groups.filter(group=>!group.path.startsWith('/brend/'));
  const active=collections.find(group=>group.path===selected)||collections[0];
  useEffect(()=>setOpen(false),[location.pathname,location.search]);
  useEffect(()=>{
    if(!open)return;
    panel.current?.querySelector('a,button')?.focus();
    const dismiss=event=>{if(!anchor.current?.contains(event.target)&&!panel.current?.contains(event.target))setOpen(false);};
    const escape=event=>{if(event.key==='Escape'){setOpen(false);anchor.current?.focus();}};
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div className="navbar__group collections-trigger">
    <button ref={anchor} type="button" className="navbar__label" aria-expanded={open} aria-controls="watch-collections-menu" onClick={()=>setOpen(value=>!value)}>{t('Satovi')} <ChevronDown size={13} aria-hidden="true"/></button>
    <HeaderDropdown open={open} anchorRef={anchor} panelRef={panel} id="watch-collections-menu" label={t('Kolekcije satova')} role="dialog" maxWidth={800} className="collections-dropdown">
      <div className="collections-menu__heading"><Link to="/kolekcije-satova">{t('Kolekcije satova')}</Link><button type="button" onClick={()=>{setOpen(false);anchor.current?.focus();}} aria-label={t('Zatvori')}><X size={19}/></button></div>
      {loading&&<p role="status">{t('Učitavanje…')}</p>}
      {error&&<p role="status">{t('Pregled kolekcija trenutno nije dostupan.')} <button onClick={retry}>{t('Pokušaj ponovo')}</button></p>}
      {active&&<div className="collections-menu__layout"><div className="collections-menu__choices" aria-label={t('Izaberite kolekciju')}>{collections.map(group=><button type="button" key={group.path} aria-pressed={active.path===group.path} onClick={()=>setSelected(group.path)}>{t(group.title)}</button>)}</div>
      <div className="collections-menu__preview"><h3>{t(active.title)}</h3><CollectionPreview items={active.items}/><Link className="collections-link" to={active.path}>{t('Pogledajte celu kolekciju')}</Link></div></div>}
      <Link className="collections-menu__all" to="/kolekcije-satova">{t('Sve kolekcije i priče o brendovima')}</Link>
    </HeaderDropdown>
  </div>;
}
