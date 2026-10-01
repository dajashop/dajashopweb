import { ArrowUpRight, PackageSearch, RefreshCw, Search, Watch } from 'lucide-react';
import { money } from '../../utils/currency.js';

export function SearchProductRow({ product, ...props }) {
  return <a href={`/product/${encodeURIComponent(product.slug)}`} className="live-search__product" {...props}>
    <span className="live-search__thumbnail">{product.thumbnailUrl || product.image
      ? <img src={product.thumbnailUrl || product.image} alt="" loading="lazy" decoding="async" /> : <Watch size={24} aria-hidden="true" />}</span>
    <span className="live-search__product-info"><small>{product.brand || product.department}</small><strong>{product.name}</strong>
      <span className={`live-search__stock ${product.inStock ? 'is-available' : ''}`}>{product.inStock ? 'Na stanju' : 'Nema na stanju'}</span></span>
    <span className="live-search__price">{money(product.salePrice ?? product.price)}{product.salePrice != null && product.salePrice < product.price && <del>{money(product.price)}</del>}</span>
  </a>;
}
const titles = { brands: 'Brendovi', collections: 'Kolekcije', attributes: 'Osobine i funkcije' };
const departmentNames = { satovi: 'Satovi', daljinski: 'Daljinski', baterije: 'Baterije', naocare: 'Naočare' };
export default function SearchSuggestions({ data, loading, error, retry, query, recommendations, onNavigate, onCorrect, active, onActive, idPrefix = 'live-search' }) {
  const groups = data?.groups || {};
  const order = data?.intent === 'collections' ? ['collections', 'brands', 'attributes'] : ['brands', 'collections', 'attributes'];
  let index = 0;
  const interactive = (href) => {
    const position = index++;
    return {
      id: `${idPrefix}-option-${position}`, role: 'option', 'aria-selected': active === position,
      'data-search-index': position, tabIndex: -1,
      onMouseEnter: () => onActive(position),
      onClick: (event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(href); }
    };
  };
  const renderGroups = () => order.filter((kind) => groups[kind]?.length).map((kind) => <section className="live-search__group" key={kind} aria-label={titles[kind]}>
    <h3>{titles[kind]}</h3>
    {groups[kind].map((item) => <a key={item.id} href={item.href} className="live-search__suggestion" {...interactive(item.href)}>
      <span><strong>{item.label}</strong><small>{departmentNames[item.detail] || item.detail}</small></span><ArrowUpRight size={15} aria-hidden="true" />
    </a>)}
  </section>);
  const renderProducts = () => (data?.items || []).map((product) => <SearchProductRow key={product.id} product={product} {...interactive(`/product/${encodeURIComponent(product.slug)}`)} />);
  let groupContent; let products;
  if (data?.intent === 'products') { products = renderProducts(); groupContent = renderGroups(); }
  else { groupContent = renderGroups(); products = renderProducts(); }
  const correctionButtons = (data?.corrections || []).map((correction) => {
    const position = index++;
    return <button key={correction.query} type="button" id={`${idPrefix}-option-${position}`} role="option" aria-selected={active === position} data-search-index={position} tabIndex={-1}
      onMouseEnter={() => onActive(position)} onClick={() => onCorrect(correction.query)} className="live-search__correction">{correction.label}<ArrowUpRight size={14} aria-hidden="true" /></button>;
  });
  const recommended = (recommendations?.length ? recommendations : data?.recommendations || []).map((product) => <SearchProductRow key={product.id} product={product} {...interactive(`/product/${encodeURIComponent(product.slug)}`)} />);
  const seeAllHref = `/search?q=${encodeURIComponent(query.trim())}`;
  const seeAllProps = query.trim().length >= 2 && data?.total ? interactive(seeAllHref) : null;
  return <>
    <div className="live-search__feedback" aria-live="polite" role="status">
      {loading && <span className="live-search__loading"><Search size={15} aria-hidden="true" /> Tražimo najbolje rezultate…</span>}
      {error && <div className="live-search__error">Pretraga trenutno nije dostupna.<button type="button" onClick={retry}><RefreshCw size={14} /> Pokušaj ponovo</button></div>}
      {!loading && !error && data?.message && <div className="live-search__empty"><PackageSearch size={22} aria-hidden="true" /><span>{data.message}</span></div>}
      {!loading && correctionButtons.length > 0 && <div className="live-search__corrections"><span>Da li ste mislili…?</span>{correctionButtons}</div>}
    </div>
    {!loading && !error && <>
      <div className={`live-search__layout ${data?.intent === 'products' ? 'is-model-query' : 'is-facet-query'} ${query.trim().length < 2 ? 'is-idle' : ''}`}>
        {groupContent.length > 0 && <div className="live-search__facets">{groupContent}</div>}
        {products.length > 0 && <section className="live-search__matches" aria-label="Proizvodi"><h3>Proizvodi <span>{data.total}</span></h3>{products}</section>}
      </div>
      {seeAllProps && <a href={seeAllHref} className="live-search__all" {...seeAllProps}>Prikaži sve rezultate ({data.total})<ArrowUpRight size={17} aria-hidden="true" /></a>}
      {recommended.length > 0 && !data?.items?.length && <section className="live-search__recommendations" aria-label="Preporučeni satovi"><h3>Možda će ti se svideti</h3>{recommended}</section>}
    </>}
  </>;
}
