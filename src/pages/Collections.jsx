import MagazineVisual, {MagazineCredit} from '../components/MagazineVisual.jsx';
import {watchMilestones} from '../data/watchMilestones.js';
import {ArrowUpRight,ArrowDown,Clock3} from 'lucide-react';
import {Link,useParams} from 'react-router-dom';
import {useStorefront} from '../localization/StorefrontContext.jsx';
import useCollectionPreviews from '../hooks/useCollectionPreviews.js';
import CollectionPreview from '../components/CollectionPreview.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import JsonLd from '../components/seo/JsonLd.jsx';
import PageStatus from './PageStatus.jsx';
import {watchStories} from '../data/watchStories.js';
import {watchArticles,articlePath} from '../data/watchArticles.js';
import {watchBrandGuides} from '../data/watchBrandGuides.js';
import {articlePhotography,brandPhotography,collectionPhotography} from '../data/watchPhotography.js';
import {localizedSiteUrl} from '../localization/paths.js';
import {seoConfig} from '../config/seo.js';
import '../components/Collections.css';

const brandPath=story=>`/magazin/brendovi/${story.slug}`;

function ArticleCard({item,date,compact=false,priority=false,imageSizes}){
  const {t}=useStorefront();
  return <article className={compact?'magazine-story magazine-story--compact':'magazine-story'}>
    <Link className="magazine-story__image" to={articlePath(item)} aria-label={t(item.title)}>
      <MagazineVisual photo={articlePhotography[item.slug]?.cover} brand={item.brand} product={item.cover} priority={priority} sizes={compact?'100px':imageSizes||(priority?'(max-width: 900px) 92vw, 55vw':'(max-width: 700px) 92vw, (max-width: 900px) 44vw, 30vw')}/>
    </Link>
    <div className="magazine-story__copy"><div className="magazine-story__meta"><span>{item.brand}</span><time dateTime={item.published}>{date(item.published)}</time></div>
      <h3><Link to={articlePath(item)}>{t(item.title)}</Link></h3>
      {!compact&&<p>{t(item.excerpt)}</p>}
      <Link className="magazine-text-link" to={articlePath(item)}>{t('Pročitaj članak')}<ArrowUpRight size={16}/></Link>
    </div>
  </article>;
}

export default function Collections({kind='index'}){
  const {t,locale,language}=useStorefront();
  const params=useParams();
  const {groups,loading,error,retry}=useCollectionPreviews(kind!=='article');
  const story=kind==='brand'?watchStories.find(item=>item.slug===params.slug):null;
  const article=kind==='article'?watchArticles.find(item=>item.slug===params.slug):null;
  if((kind==='brand'&&!story)||(kind==='article'&&!article))return <PageStatus/>;
  const title=story?story.title:article?article.title:'Brendovi i kolekcije';
  const description=story?story.paragraphs[0]:article?article.excerpt:'Priče o brendovima, vodiči kroz kolekcije i novosti iz sveta satova. Istražite Orient, Orient Star, Daniel Klein, Casio i Q&Q.';
  const path=story?brandPath(story):article?articlePath(article):'/kolekcije-satova';
  const date=value=>new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00Z'));
  const brand=story?groups.find(group=>group.path===`/brend/${story.slug}`):null;
  const selections=story?groups.filter(group=>!group.path.startsWith('/brend/')&&group.brand===story.brand):[];
  const articles=watchArticles.filter(item=>(!story||item.brand===story.brand)&&item.slug!==article?.slug);
  const sources=article?[article.source]:story?[story.source]:[];
  const photography=article?articlePhotography[article.slug]:null;
  const articleBrand=article?watchStories.find(item=>item.brand===article.brand):null;
  const cover=photography?.cover||brandPhotography[story?.brand];
  const sourceLinks=<section id="izvori" className="magazine__sources">
    <h2>{t('Izvori')}</h2>
    {article&&<p>{t('Datum najave proizvođača: {date}',{date:date(article.sourceDate)})}</p>}
    {sources.map(source=><a key={source} href={source} target="_blank" rel="noopener noreferrer">{t('Zvanični izvor')} — {new URL(source).hostname}<ArrowUpRight size={14}/></a>)}
    <p>{t('Tekst je redakcijski sažetak napisan za DajaShop, uz povezane izvore. Provereno: {date}',{date:date('2026-11-03')})}</p>
  </section>;

  return <main className={`watch-journal magazine magazine--${kind}`}>
    <SEOHead title={t(title)} description={t(description)} url={path} type={article?'article':'website'} image={cover?.src}/>
    <BreadcrumbJsonLd items={[{name:t('Brendovi i kolekcije'),url:'/kolekcije-satova'},...(kind==='index'?[]:[{name:t(title),url:path}])]}/>
    {article&&<JsonLd data={{'@context':'https://schema.org','@type':'BlogPosting',headline:t(article.title),description:t(article.excerpt),image:cover?.src?new URL(cover.src,seoConfig.siteUrl).href:undefined,datePublished:article.published,dateModified:article.published,inLanguage:language,author:{'@type':'Organization',name:'DajaShop'},publisher:{'@type':'Organization',name:'DajaShop'},url:localizedSiteUrl(path,language,seoConfig.siteUrl),citation:article.source}}/>}
    <nav className="watch-journal__breadcrumb" aria-label={t('Putanja stranice')}><Link to="/">{t('Početak')}</Link><span>/</span><Link to="/kolekcije-satova">{t('Brendovi i kolekcije')}</Link>{kind!=='index'&&<><span>/</span><span>{story?story.brand:t('Članak')}</span></>}</nav>

    {kind==='index'?<>
      <header className="magazine-masthead"><div><span className="magazine-kicker">{t('DajaShop magazin')}</span><h1>{t('Brendovi, kolekcije i priče o satovima')}</h1></div><p>{t(description)}</p></header>
      <nav className="magazine-nav" aria-label={t('Rubrike magazina')}><a href="#clanci">{t('Iz sveta satova')}</a><a href="#brendovi">{t('Upoznajte brendove')}</a><a href="#kolekcije">{t('Kolekcije')}</a></nav>
      <section id="clanci" className="magazine-feature" aria-label={t('Iz sveta satova')}>
        <ArticleCard item={watchArticles[0]} date={date} priority/>
        <div className="magazine-feature__more">{watchArticles.slice(1).map(item=><ArticleCard key={item.slug} item={item} date={date} imageSizes="(max-width: 760px) 110px, (max-width: 900px) 44vw, (max-width: 1100px) 38vw, 22vw"/>)}</div>
      </section>
      <section id="brendovi" className="magazine__section"><div className="magazine-section-heading"><h2>{t('Upoznajte brendove')}</h2><a href="#kolekcije">{t('Istražite kolekcije')}<ArrowDown size={16}/></a></div>
        <div className="magazine__brand-grid">{watchStories.map(item=>{
          const preview=groups.find(group=>group.path===`/brend/${item.slug}`);
          return <article key={item.slug} className="magazine__brand-card">
            <Link className="magazine-brand-photo" to={brandPath(item)} aria-label={t(item.title)}><MagazineVisual photo={brandPhotography[item.brand]} brand={item.brand} sizes="(max-width: 700px) 92vw, (max-width: 1100px) 44vw, 30vw"/></Link>
            <MagazineCredit photo={brandPhotography[item.brand]}/>
            <div className="magazine__brand-heading"><Link to={brandPath(item)}>{item.brand}</Link><Link to={brandPath(item)} aria-label={t(item.title)}><ArrowUpRight size={22}/></Link></div>
            {preview?.items?.length?<CollectionPreview items={preview.items}/>:<Link className="magazine__brand-fallback" to={brandPath(item)}><MagazineVisual brand={item.brand}/></Link>}
            <p>{t(item.paragraphs[0])}</p><Link className="magazine-text-link" to={brandPath(item)}>{t('Priča o brendu')}<ArrowUpRight size={16}/></Link>
          </article>;
        })}</div>
      </section>
    </>:<>
      <header className="magazine-article-heading"><div><Link className="magazine-kicker" to="/kolekcije-satova">{t(story?'Priče o brendovima':'Iz sveta satova')}</Link><h1>{t(title)}</h1><p className="magazine__lead">{t(article?article.excerpt:(watchBrandGuides[story.slug]?.[0]?.text||story.paragraphs[1]))}</p></div>
        <div className="magazine-article-heading__meta">{article?<><span>{article.brand}</span><p><Clock3 size={14}/><time dateTime={article.published}>{date(article.published)}</time></p><span>{t('DajaShop redakcija')}</span></>:<a className="magazine-button" href="#kolekcije">{t('Istražite kolekcije')}<ArrowDown size={17}/></a>}</div>
      </header>
      <div className="magazine__reading-layout">
        <article className="magazine__prose">
          <div className="magazine-article-cover"><MagazineVisual photo={cover} brand={story?.brand||article.brand} product={story?brand?.items?.[0]:article.cover} priority caption/></div>
          {story?<>
            <section className="magazine-timeline" aria-label={t('Važni trenuci')}>{(watchMilestones[story.slug]||[]).map(point=><div key={point.year}><span>{point.year}</span><p>{t(point.label)}</p></div>)}</section>
            <h2>{t('Priča o brendu')}</h2>{story.paragraphs.map(text=><p key={text}>{t(text)}</p>)}
            {(watchBrandGuides[story.slug]||[]).map(section=><section key={section.title}><h2>{t(section.title)}</h2><p>{t(section.text)}</p></section>)}
          </>:<>
            <p className="magazine__intro">{t(article.paragraphs[0])}</p>
            <section className="magazine-inline-story"><MagazineVisual photo={photography?.detail} brand={article.brand} caption sizes="(max-width: 900px) 92vw, (max-width: 1100px) 65vw, 35vw"/><div><h2>{t(photography?.headings[0]||'Pogled izbliza')}</h2><p>{t(article.paragraphs[1])}</p></div></section>
            <section><h2>{t(photography?.headings[1]||'Pogled izbliza')}</h2><p>{t(article.paragraphs[2])}</p></section>
          </>}
          {sourceLinks}
          {article&&<p className="magazine__notice">{t('Predstavljanje noviteta proizvođača ne znači da se taj model nalazi u našoj ponudi. Aktuelne proizvode i cene proverite u katalogu.')}</p>}
        </article>
        <aside className="magazine__sidebar">
          {story?<div className="magazine-sidebar-catalog"><h2>{story.brand}</h2>{brand&&<CollectionPreview items={brand.items}/>}<Link className="magazine-button" to={`/brend/${story.slug}`}>{t('Pogledajte ponudu brenda')}<ArrowUpRight size={16}/></Link><nav>{selections.map(group=><Link key={group.path} to={group.path}>{t(group.title)}</Link>)}</nav></div>:<>
            <div className="magazine-sidebar-brand"><span className="magazine-kicker">{t('Upoznajte brend')}</span><h2>{article.brand}</h2>{articleBrand&&<><p>{t(articleBrand.paragraphs[0])}</p><Link className="magazine-text-link" to={brandPath(articleBrand)}>{t('Priča o brendu')}<ArrowUpRight size={16}/></Link><Link className="magazine-button" to={`/brend/${articleBrand.slug}`}>{t('Pogledajte ponudu brenda')}<ArrowUpRight size={16}/></Link></>}</div>
            {articles.length>0&&<div className="magazine-sidebar-related"><h2>{t('Još za čitanje')}</h2>{articles.map(item=><ArticleCard key={item.slug} item={item} date={date} compact/>)}</div>}
          </>}
          <Link className="collections-link" to="/kolekcije-satova">{t('Svi brendovi i članci')}</Link>
        </aside>
      </div>
    </>}

    {kind==='brand'&&articles.length>0&&<section id="clanci" className="magazine__section"><h2>{t('Iz sveta satova')}</h2><div className="magazine__article-grid">{articles.map(item=><ArticleCard key={item.slug} item={item} date={date}/>)}</div></section>}
    {!article&&<>
      {loading&&<p role="status">{t('Učitavanje…')}</p>}{error&&<p role="status">{t('Pregled kolekcija trenutno nije dostupan.')} <button onClick={retry}>{t('Pokušaj ponovo')}</button></p>}
      <section id="kolekcije" className="magazine__section"><h2>{t(story?'Kolekcije ovog brenda':'Istražite kolekcije')}</h2><div className="watch-journal__selections">{(story?selections:groups.filter(group=>!group.path.startsWith('/brend/'))).map(group=>{
        const photo=collectionPhotography[group.path]||(/(muski|zenski)-satovi$/.test(group.path)?brandPhotography[group.brand]:null);
        return <section key={group.path} className="watch-journal__selection">{photo&&<><Link className="magazine-collection-photo" to={group.path} aria-label={t(group.title)}><MagazineVisual photo={photo} sizes="(max-width: 700px) 92vw, (max-width: 1100px) 44vw, 30vw"/></Link><MagazineCredit photo={photo}/></>}<h3><Link to={group.path}>{t(group.title)}</Link></h3><p>{t(group.description)}</p><CollectionPreview items={group.items}/><Link className="collections-link" to={group.path}>{t('Pogledajte celu kolekciju')}</Link></section>;
      })}</div>{story&&!loading&&!selections.length&&<p>{t('Trenutno nema izdvojenih kolekcija za ovaj brend. Ponudu možete pogledati u katalogu brenda.')}</p>}</section>
    </>}
  </main>;
}
