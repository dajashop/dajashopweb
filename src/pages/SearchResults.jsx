import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, ArrowRight } from 'lucide-react';
import useCatalogSearch from '../hooks/useCatalogSearch.js';
import ProductCard from '../components/ProductCard.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import '../components/ProductGrid.css';
import './SearchResults.css';

const departments = [{ id: '', label: 'Sve' }, { id: 'satovi', label: 'Satovi' }, { id: 'daljinski', label: 'Daljinski' }, { id: 'baterije', label: 'Baterije' }, { id: 'naocare', label: 'Naočare' }];
export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').slice(0, 120);
  const department = departments.some((item) => item.id === params.get('department')) ? params.get('department') || undefined : undefined;
  const sort = ['price_asc', 'price_desc'].includes(params.get('sort')) ? params.get('sort') : 'relevance';
  const queryKey = JSON.stringify([q, department, sort]);
  const [page, setPage] = useState({ key: queryKey, cursor: undefined, items: [] });
  const [field, setField] = useState(q);
  const [seed] = useState(() => crypto.randomUUID());
  const cursor = page.key === queryKey ? page.cursor : undefined;
  const { data, loading, error, retry } = useCatalogSearch({ q, mode: 'results', department, sort, cursor, seed });
  const previousItems = page.key === queryKey ? page.items : [];
  const items = useMemo(() => [...previousItems, ...(data?.items || [])].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index), [previousItems, data]);
  useEffect(() => { setField(q); }, [q]);
  useEffect(() => { setPage({ key: queryKey, cursor: undefined, items: [] }); }, [queryKey]);
  function update(key, value) { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next); }
  function submit(event) { event.preventDefault(); if (field.trim().length >= 2) { const next = new URLSearchParams(); next.set('q', field.trim()); setParams(next); } }
  function loadMore() { if (data?.nextCursor) setPage({ key: queryKey, items, cursor: data.nextCursor }); }
  const shown = q.trim().length >= 2;
  return <div className="search-results">
    <SEOHead title={q ? `Pretraga: ${q}` : 'Pretraga'} description="Pretražite modele, brendove, kolekcije i osobine proizvoda u DajaShop-u." noIndex />
    <div className="search-results__breadcrumb"><Link to="/">Početna</Link><span>/</span><span>Pretraga</span></div>
    <header className="search-results__heading"><div><span>Pronađi svoj sledeći izbor</span><h1>{q ? `Rezultati za „${q}“` : 'Pretraga proizvoda'}</h1></div>
      <form onSubmit={submit} className="search-results__form"><Search size={19} aria-hidden="true" /><input value={field} maxLength={120} onChange={(event) => setField(event.target.value)} placeholder="Model, brend ili osobine…" aria-label="Unesi pretragu" inputMode="search" enterKeyHint="search" /><button disabled={field.trim().length < 2} aria-label="Pretraži"><ArrowRight size={19} /></button></form>
    </header>
    {shown && <div className="search-results__toolbar"><div className="search-results__departments" aria-label="Odeljenje">{departments.map((item) => <button key={item.id} type="button" aria-pressed={(department || '') === item.id} className={(department || '') === item.id ? 'is-active' : ''} onClick={() => update('department', item.id)}>{item.label}</button>)}</div>
      <label>Sortiraj <select value={sort} onChange={(event) => update('sort', event.target.value)}><option value="relevance">Relevantnost</option><option value="price_asc">Cena: niža prvo</option><option value="price_desc">Cena: viša prvo</option></select></label></div>}
    {data?.recognized?.length > 0 && <div className="search-results__recognized" aria-label="Prepoznati uslovi">{data.recognized.map((label) => <span key={label}>{label}</span>)}</div>}
    <div className="search-results__status" role="status" aria-live="polite">{loading ? 'Učitavanje rezultata…' : error ? '' : data && shown ? `${data.total} proizvoda odgovara pretrazi` : 'Unesi najmanje dva znaka ili pogledaj predloge ispod.'}</div>
    {error && <div className="search-results__error">Pretraga trenutno nije dostupna.<button type="button" onClick={retry}><RefreshCw size={15} /> Pokušaj ponovo</button></div>}
    {!error && data?.message && <div className="search-results__empty"><p>{data.message}</p>{data.corrections?.length > 0 && <div><span>Da li ste mislili…?</span>{data.corrections.map((item) => <button key={item.query} type="button" onClick={() => update('q', item.query)}>{item.label}</button>)}</div>}</div>}
    {items.length > 0 && <div className="product-grid">{items.map((product) => <div className="search-results__card" key={product.id}><ProductCard p={product} /><span className={`search-results__stock ${product.inStock ? 'is-available' : ''}`}>{product.inStock ? 'Na stanju' : 'Nema na stanju'}</span></div>)}</div>}
    {data?.nextCursor && <button type="button" className="search-results__more" disabled={loading} onClick={loadMore}>Prikaži još proizvoda</button>}
    {loading && previousItems.length > 0 && <div className="search-results__status">Učitavanje narednih proizvoda…</div>}
    {!loading && !error && data?.recommendations?.length > 0 && !items.length && <section className="search-results__recommendations"><h2>Možda će ti se svideti</h2><div className="product-grid">{data.recommendations.map((product) => <div className="search-results__card" key={product.id}><ProductCard p={product} /><span className={`search-results__stock ${product.inStock ? 'is-available' : ''}`}>{product.inStock ? 'Na stanju' : 'Nema na stanju'}</span></div>)}</div></section>}
  </div>;
}
