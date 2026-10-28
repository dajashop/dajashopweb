import { useStorefront } from '../../localization/StorefrontContext.jsx';
import { ArrowUpRight, ArrowRight, PackageSearch, RefreshCw, Search, Watch, X } from 'lucide-react';


export function SearchProductRow({ product, ...props }) {
  const { t: translateText, money, localizePath } = useStorefront();

  const price = money(product.salePrice ?? product.price);
  return <a href={localizePath(`/product/${encodeURIComponent(product.slug)}`)} className="live-search__product" title={translateText(product.inStock ? undefined : 'Nema na stanju')}
    aria-label={translateText(`${product.brand || ''} ${product.name}, ${price}${product.inStock ? '' : ', nema na stanju'}`)} {...props}>
    <span className="live-search__thumbnail">{product.thumbnailUrl || product.image
      ? <img src={product.thumbnailUrl || product.image} alt="" loading="lazy" decoding="async" /> : <Watch size={38} aria-hidden="true" />}</span>
    <span className="live-search__product-info">{product.brand && <small>{translateText(product.brand)}</small>}<strong>{translateText(product.name)}</strong><span className="live-search__price">{translateText(price)}</span></span>
  </a>;
}
const titles = { brands: 'Brendovi', collections: 'Kolekcije', attributes: 'Osobine i funkcije' };
const departmentNames = { satovi: 'Satovi', daljinski: 'Daljinski', baterije: 'Baterije', naocare: 'Naočare' };
const categories = [
  { label: 'Muški satovi', href: '/muski-satovi' }, { label: 'Ženski satovi', href: '/zenski-satovi' },
  { label: 'Svi satovi', href: '/catalog' }, { label: 'Naočare', href: '/naocare' },
  { label: 'Daljinski', href: '/daljinski' }, { label: 'Baterije', href: '/baterije' }
];

export default function SearchSuggestions({ data, loading, error, retry, query, recommendations, onNavigate, onCorrect, onLiteral, literal = false, active, onActive, idPrefix = 'live-search' }) {
  const { t: translateText, localizePath } = useStorefront();

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
  const renderLeft = () => <aside className="live-search__facets" aria-label={translateText("Brendovi, kolekcije i filteri")}>
    {order.filter((kind) => groups[kind]?.length).map((kind) => <section className="live-search__group" key={kind} aria-label={translateText(titles[kind])}>
      <h3>{translateText(titles[kind])}</h3>
      {groups[kind].map((item) => <a key={item.id} href={localizePath(item.href)} className="live-search__suggestion" {...link(item.href)}>
        <span><strong>{translateText(item.label)}</strong><small>{translateText(departmentNames[item.detail] || item.detail)}</small></span><ArrowUpRight size={14} aria-hidden="true" />
      </a>)}
    </section>)}
    {hasQuery && data?.completions?.length > 0 && <section className="live-search__group"><h3>{translateText("Nastavi pretragu")}</h3>{data.completions.map(item=><button type="button" key={item.query} className="live-search__completion" {...option(()=>onCorrect(item.query))}><span>{translateText(item.label)}</span><small>{translateText(item.count)}</small><ArrowUpRight size={14}/></button>)}</section>}
    <section className="live-search__group live-search__categories" aria-label={translateText("Odeljenja")}><h3>{translateText("Istražite odeljenja")}</h3><div>
      {categories.map((item) => <a key={item.href} href={localizePath(item.href)} className="live-search__category" {...link(item.href)}>{translateText(item.label)}<ArrowUpRight size={12} aria-hidden="true" /></a>)}
    </div></section>
  </aside>;
  const renderRight = () => <section className="live-search__matches" aria-label={translateText("Artikli")}>
    {translateText(!hasQuery ? <div className="live-search__start"><span><Search size={28} aria-hidden="true" /></span><h2>{translateText("Pronađite baš ono što tražite.")}</h2><p>{translateText("Počnite da kucate model, brend ili osobine proizvoda.")}</p><small>{translateText("Na primer: ORIENT, ženski automatik ili srebrna narukvica.")}</small></div>
      : loading ? <><div className="live-search__loading" role="status"><Search size={15} aria-hidden="true" />{translateText(" Tražimo najbolje rezultate…")}</div><div className="live-search__product-grid" aria-hidden="true">{translateText(Array.from({ length: 6 }, (_, i) => <div className="live-search__skeleton" key={i}><span /><i /><i /></div>))}</div></>
        : error ? null : <>
          {data?.appliedCorrection && <div className="live-search__feedback" role="status">{translateText("Prikazujemo rezultate za „")}{translateText(data.appliedCorrection.label || data.appliedCorrection.query)}“. <button type="button" className="live-search__correction" {...option(()=>onLiteral?.())}>{translateText("Traži originalni unos")}</button></div>}
          {data?.conditions?.length > 0 && <div className="live-search__conditions" aria-label={translateText("Prepoznati uslovi")}>{data.conditions.map(condition=><button type="button" key={condition.id} {...option(()=>onCorrect(condition.query))} aria-label={translateText(`Ukloni uslov: ${condition.label}`)}>{translateText(condition.label)}<X size={12}/></button>)}</div>}
          {noResults && <div className="live-search__feedback" role="status" aria-live="polite">
            <div className="live-search__empty"><PackageSearch size={22} aria-hidden="true" /><span>{translateText(data.message || 'Nema rezultata za ovu pretragu.')}</span></div>
            {data.corrections?.length > 0 && <div className="live-search__corrections"><span>{translateText("Da li ste mislili…?")}</span>{data.corrections.map((item) => <button type="button" key={item.query} className="live-search__correction" {...option(() => onCorrect(item.query))}>{translateText(item.label)}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div>}
          </div>}
          {(data?.items?.length > 0 || suggestedProducts.length > 0) && <>
            <h3>{translateText(noResults ? 'Možda će vam se svideti' : 'Proizvodi')}</h3>
            <div className="live-search__product-grid">{(noResults ? suggestedProducts : data.items).map((product) => <SearchProductRow key={product.id} product={product} {...link(`/product/${encodeURIComponent(product.slug)}`)} />)}</div>
          </>}
          {data?.similar?.length > 0 && <><h3>{translateText("Slični rezultati")}</h3><div className="live-search__product-grid">{data.similar.map(({product,reason})=><div key={product.id}><SearchProductRow product={product} {...link(`/product/${encodeURIComponent(product.slug)}`)}/><small className="live-search__difference">{translateText(reason)}</small></div>)}</div></>}
        </>)}
  </section>;
  let left; let right;
  if (hasQuery && data?.intent === 'products') { right = renderRight(); left = renderLeft(); }
  else { left = renderLeft(); right = renderRight(); }
  const seeAllHref = `/search?q=${encodeURIComponent(query.trim())}${literal?'&literal=yes':''}`;
  const allProps = hasQuery && data && !loading && !error ? link(seeAllHref) : null;
  return <>
    <div className="live-search__body" data-lenis-prevent>
      <h2 className="sr-only">{translateText("Pretraga proizvoda i odeljenja")}</h2>
      {error && <div className="live-search__error" role="alert">{translateText("Pretraga trenutno nije dostupna.")}<button type="button" onClick={retry}><RefreshCw size={14} />{translateText(" Pokušaj ponovo")}</button></div>}
      <div className={`live-search__layout ${hasQuery ? '' : 'is-idle'}`}>{translateText(left)}{translateText(right)}</div>
    </div>
    {allProps && <footer className="live-search__footer">
      {allProps && <a href={localizePath(seeAllHref)} className="live-search__all" {...allProps}>{translateText("Prikaži sve (")}{translateText(data.total)})<ArrowRight size={17} aria-hidden="true" /></a>}
    </footer>}
  </>;
}
