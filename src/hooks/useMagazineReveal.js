import {useEffect,useRef} from 'react';
export default function useMagazineReveal(key){
  const root=useRef(null);
  useEffect(()=>{
    const nodes=[...(root.current?.querySelectorAll('[data-magazine-reveal]')||[])];
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!window.IntersectionObserver)return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.dataset.revealed='true';observer.unobserve(entry.target);}}),{threshold:.08});
    nodes.forEach(node=>{if(node.getBoundingClientRect().top>window.innerHeight){node.dataset.revealed='false';observer.observe(node);}});
    return()=>{observer.disconnect();nodes.forEach(node=>delete node.dataset.revealed);};
  },[key]);
  return root;
}
