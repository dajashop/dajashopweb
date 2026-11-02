import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { normalizeProduct } from '../services/dajaPlatform.js';
import { usePageData } from '../ssr/PageData.jsx';
let cached, pending;
function load() {
  if (cached?.expires > Date.now()) return Promise.resolve(cached.data);
  if (!pending) pending = apiRequest('/public/catalog/collections', {auth:false}).then(data => {
    const items = (data.groups || []).flatMap(group=>group.items || []);
    const boundary = Math.min(...items.map(item=>Date.parse(item.saleValidUntil)).filter(Number.isFinite));
    cached = {data,expires:Math.min(Date.now()+30000,boundary)}; return data;
  }).finally(()=>{pending=null;});
  return pending;
}
export default function useCollectionPreviews(enabled = true) {
  const page = usePageData();
  const seed = page?.data?.collectionPreviews;
  const [state,setState] = useState(()=>({data:seed || (cached?.expires>Date.now()?cached.data:null),error:false}));
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    if (!enabled) return;
    let cancelled=false;
    const refresh=()=>load().then(data=>{if(!cancelled)setState({data,error:false});}).catch(()=>{if(!cancelled)setState(current=>({...current,error:true}));});
    refresh(); const timer=window.setInterval(refresh,30000);
    const invalidate=()=>{cached=null;refresh();};
    window.addEventListener('daja:products-changed',invalidate);
    return ()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('daja:products-changed',invalidate);};
  },[enabled,attempt]);
  const groups=useMemo(()=>(state.data?.groups || []).map(group=>({...group,items:group.items.map(normalizeProduct)})),[state.data]);
  return {groups,loading:!state.data&&!state.error,error:state.error,retry:()=>setAttempt(value=>value+1)};
}
