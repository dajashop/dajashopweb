import { ArrowUpRight, ArrowRight, History, PackageSearch, RefreshCw, Search, Watch, X } from 'lucide-react';
import { money } from '../../utils/currency.js';

export function SearchProductRow({ product, ...props }) {
  const price = money(product.salePrice ?? product.price);
  return <a href={`/product/${encodeURIComponent(product.slug)}`} className="live-search__product" title={product.inStock ? undefined : 'Nema na stanju'}
    aria-label={`${product.brand || ''} ${product.name}, ${price}${product.inStock ? '' : ', nema na stanju'}`} {...props}>
    <span className="live-search__thumbnail">{product.thumbnailUrl || product.image
      ? <img src={product.thumbnailUrl || product.image} alt="" loading="lazy" decoding="async" /> : <Watch size={38} aria-hidden="true" />}</span>
    <span className="live-search__product-info">{product.brand && <small>{product.brand}</small>}<strong>{product.name}</strong><span className="live-search__price">{price}</span></span>
  </a>;
}
const titles = { brands: 'Brendovi', collections: 'Kolekcije', attributes: 'Osobine i funkcije' };
const departmentNames = { satovi: 'Satovi', daljinski: 'Daljinski', baterije: 'Baterije', naocare: 'Naočare' };
const categories = [
  { label: 'Muški satovi', href: '/muski-satovi' }, { label: 'Ženski satovi', href: '/zenski-satovi' },
  { label: 'Svi satovi', href: '/catalog' }, { label: 'Naočare', href: '/naocare' },
  { label: 'Daljinski', href: '/daljinski' }, { label: 'Baterije', href: '/baterije' }
];

export default function SearchSuggestions({ data, loading, error, retry, query, recommendations, history = [], onClearHistory, onNavigate, onCorrect, onLiteral, literal = false, active, onActive, idPrefix = 'live-search' }) {
  const hasQuery = query.trim().length >= 2;
  const groups = data?.groups || {};
  const order = data?.intent === 'collections' ? ['collections', 'brands', 'attributes'] : ['brands', 'collections', 'attributes'];
  const noResults = hasQuery && !loading && !error && data?.total === 0;
  const suggestedProducts = noResults ? (recommendations?.length ? recommendations : data?.recommendations || []) : [];
  let index = 0;
  const option = (onClick) => {
    const position = index++;
    return { id: `${idPrefix}-option-${position}`, role: 'option', 'aria-selected': active === position,
      'data-search-index': position, tabIndex: -1, onMouseEnter: () => onActive(position), onClick };
  };
  const link = (href) => option((event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(href);
  });
  const renderLeft = () => <aside className="live-search__facets" aria-label="Brendovi, kolekcije i filteri">
    {order.filter((kind) => groups[kind]?.length).map((kind) => <section className="live-search__group" key={kind} aria-label={titles[kind]}>
      <h3>{titles[kind]}</h3>
      {groups[kind].map((item) => <a key={item.id} href={item.href} className="live-search__suggestion" {...link(item.href)}>
        <span><strong>{item.label}</strong><small>{departmentNames[item.detail] || item.detail}</small></span><ArrowUpRight size={14} aria-hidden="true" />
      </a>)}
    </section>)}
    {hasQuery && data?.completions?.length > 0 && <section className="live-search__group"><h3>Nastavi pretragu</h3>{data.completions.map(item=><button type="button" key={item.query} className="live-search__completion" {...option(()=>onCorrect(item.query))}><span>{item.label}</span><small>{item.count}</small><ArrowUpRight size={14}/></button>)}</section>}
    <section className="live-search__group live-search__categories" aria-label="Odeljenja"><h3>Istražite odeljenja</h3><div>
      {categories.map((item) => <a key={item.href} href={item.href} className="live-search__category" {...link(item.href)}>{item.label}<ArrowUpRight size={12} aria-hidden="true" /></a>)}
    </div></section>
  </aside>;
  const renderRight = () => <section className="live-search__matches" aria-label="Artikli">
    {!hasQuery ? <div className="live-search__start"><span><Search size={28} aria-hidden="true" /></span><h2>Pronađite baš ono što tražite.</h2><p>Počnite da kucate model, brend ili osobine proizvoda.</p><small>Na primer: ORIENT, ženski automatik ili srebrna narukvica.</small></div>
      : loading ? <><div className="live-search__loading" role="status"><Search size={15} aria-hidden="true" /> Tražimo najbolje rezultate…</div><div className="live-search__product-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div className="live-search__skeleton" key={i}><span /><i /><i /></div>)}</div></>
        : error ? null : <>
          {data?.appliedCorrection && <div className="live-search__feedback" role="status">Prikazujemo rezultate za „{data.appliedCorrection.label || data.appliedCorrection.query}“. <button type="button" className="live-search__correction" {...option(()=>onLiteral?.())}>Traži originalni unos</button></div>}
          {data?.conditions?.length > 0 && <div className="live-search__conditions" aria-label="Prepoznati uslovi">{data.conditions.map(condition=><button type="button" key={condition.id} {...option(()=>onCorrect(condition.query))} aria-label={`Ukloni uslov: ${condition.label}`}>{condition.label}<X size={12}/></button>)}</div>}
          {noResults && <div className="live-search__feedback" role="status" aria-live="polite">
            <div className="live-search__empty"><PackageSearch size={22} aria-hidden="true" /><span>{data.message || 'Nema rezultata za ovu pretragu.'}</span></div>
            {data.corrections?.length > 0 && <div className="live-search__corrections"><span>Da li ste mislili…?</span>{data.corrections.map((item) => <button type="button" key={item.query} className="live-search__correction" {...option(() => onCorrect(item.query))}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div>}
          </div>}
          {(data?.items?.length > 0 || suggestedProducts.length > 0) && <>
            <h3>{noResults ? 'Možda će vam se svideti' : 'Proizvodi'}</h3>
            <div className="live-search__product-grid">{(noResults ? suggestedProducts : data.items).map((product) => <SearchProductRow key={product.id} product={product} {...link(`/product/${encodeURIComponent(product.slug)}`)} />)}</div>
          </>}
          {data?.similar?.length > 0 && <><h3>Slični rezultati</h3><div className="live-search__product-grid">{data.similar.map(({product,reason})=><div key={product.id}><SearchProductRow product={product} {...link(`/product/${encodeURIComponent(product.slug)}`)}/><small className="live-search__difference">{reason}</small></div>)}</div></>}
        </>}
  </section>;
  let left; let right;
  if (hasQuery && data?.intent === 'products') { right = renderRight(); left = renderLeft(); }
  else { left = renderLeft(); right = renderRight(); }
  const recent = history.filter((item) => item.toLocaleLowerCase('sr') !== query.trim().toLocaleLowerCase('sr'));
  const recentButtons = recent.map((item) => <button type="button" key={item} title={item} className="live-search__history-query" {...option(() => onCorrect(item))}><History size={13} aria-hidden="true" /><span>{item}</span></button>);
  const seeAllHref = `/search?q=${encodeURIComponent(query.trim())}${literal?'&literal=yes':''}`;
  const allProps = hasQuery && data && !loading && !error ? link(seeAllHref) : null;
  return <>
    <div className="live-search__body" data-lenis-prevent>
      {error && <div className="live-search__error" role="alert">Pretraga trenutno nije dostupna.<button type="button" onClick={retry}><RefreshCw size={14} /> Pokušaj ponovo</button></div>}
      <div className={`live-search__layout ${hasQuery ? '' : 'is-idle'}`}>{left}{right}</div>
    </div>
    {(recentButtons.length > 0 || allProps) && <footer className="live-search__footer">
      {recentButtons.length > 0 && <section className="live-search__history" aria-label="Prethodne pretrage"><div className="live-search__history-heading"><h3>Prethodne pretrage</h3><button type="button" onClick={onClearHistory}>Obriši</button></div><div className="live-search__history-list" data-lenis-prevent>{recentButtons}</div></section>}
      {allProps && <a href={seeAllHref} className="live-search__all" {...allProps}>Prikaži sve ({data.total})<ArrowRight size={17} aria-hidden="true" /></a>}
    </footer>}
  </>;
}
