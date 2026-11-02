import MagazineVisual from '../components/MagazineVisual.jsx';
import useMagazineReveal from '../hooks/useMagazineReveal.js';
import {watchMilestones} from '../data/watchMilestones.js';
import {ArrowUpRight,ArrowDown,BookOpen,Clock3} from 'lucide-react';
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
import {localizedSiteUrl} from '../localization/paths.js';
import {seoConfig} from '../config/seo.js';
import '../components/Collections.css';
const brandPath=story=>`/magazin/brendovi/${story.slug}`;
export default function Collections({kind='index'}){
  const {t,locale,language}=useStorefront();const params=useParams();
  const {groups,loading,error,retry}=useCollectionPreviews(kind!=='article');
  const story=kind==='brand'?watchStories.find(item=>item.slug===params.slug):null;
  const article=kind==='article'?watchArticles.find(item=>item.slug===params.slug):null;
  const revealRoot=useMagazineReveal(`${kind}:${params.slug || ''}:${groups.length}`);
  if((kind==='brand'&&!story)||(kind==='article'&&!article))return <PageStatus/>;
  const title=story?story.title:article?article.title:'Brendovi i kolekcije';
  const description=story?story.paragraphs[0]:article?article.excerpt:'Priče o brendovima, vodiči kroz kolekcije i novosti iz sveta satova. Istražite Orient, Orient Star, Daniel Klein, Casio i Q&Q.';
  const path=story?brandPath(story):article?articlePath(article):'/kolekcije-satova';
  const date=value=>new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00Z'));
  const brand=story?groups.find(group=>group.path===`/brend/${story.slug}`):null;
  const selections=story?groups.filter(group=>!group.path.startsWith('/brend/')&&group.brand===story.brand):[];
  const articles=watchArticles.filter(item=>!story||item.brand===story.brand);
  const sources=article?[article.source]:story?[story.source]:[];
  return <main ref={revealRoot} className={`watch-journal magazine magazine--${kind}`}>
    <SEOHead title={t(title)} description={t(description)} url={path}/>
    <BreadcrumbJsonLd items={[{name:t('Brendovi i kolekcije'),url:'/kolekcije-satova'},...(kind==='index'?[]:[{name:t(title),url:path}])]}/>
    {article&&<JsonLd data={{'@context':'https://schema.org','@type':'BlogPosting',headline:t(article.title),description:t(article.excerpt),datePublished:article.published,dateModified:article.published,inLanguage:language,author:{'@type':'Organization',name:'DajaShop'},publisher:{'@type':'Organization',name:'DajaShop'},url:localizedSiteUrl(path,language,seoConfig.siteUrl),citation:article.source}}/>}
    <div className="watch-journal__breadcrumb"><Link to="/">{t('Početak')}</Link><span>/</span><Link to="/kolekcije-satova">{t('Brendovi i kolekcije')}</Link>{kind!=='index'&&<><span>/</span><span>{story?story.brand:t('Članak')}</span></>}</div>
    {kind==='index'?<>
      <header className="magazine-cover"><div className="magazine-cover__copy"><span className="magazine-kicker"><BookOpen size={16}/>{t('DajaShop magazin')}</span><h1>{t('Brendovi, kolekcije i priče o satovima')}</h1><p>{t(description)}</p><a className="magazine-button" href="#brendovi">{t('Upoznajte brendove')}<ArrowDown size={18}/></a><nav><a href="#clanci">{t('Iz sveta satova')}</a><a href="#kolekcije">{t('Kolekcije')}</a></nav></div><MagazineVisual brand="CASIO" priority/><span className="magazine-cover__stamp">{t('Dizajn. Mehanika. Inspiracija.')}</span></header>
      <section id="brendovi"><h2>{t('Upoznajte brendove')}</h2><div className="magazine__brand-grid">{watchStories.map(item=>{const preview=groups.find(group=>group.path===`/brend/${item.slug}`);return <article key={item.slug} className="magazine__brand-card" data-magazine-reveal><Link className="magazine__brand-media" to={brandPath(item)} aria-label={t(item.title)}><MagazineVisual brand={item.brand} product={preview?.items?.[0]}/><span><ArrowUpRight size={23}/></span></Link><div className="magazine__brand-body"><Link className="magazine__brand-name" to={brandPath(item)}>{item.brand}</Link><p>{t(item.paragraphs[0])}</p><Link className="magazine-text-link" to={brandPath(item)}>{t('Vidi više')}<ArrowUpRight size={17}/></Link></div></article>;})}</div></section>
    </>:<>
      <header className="magazine-detail-cover"><div className="magazine-detail-cover__copy"><Link className="magazine-kicker" to="/kolekcije-satova"><BookOpen size={15}/>{t(story?'Priče o brendovima':'Iz sveta satova')}</Link><h1>{t(title)}</h1><p className="magazine__lead">{t(article?article.excerpt:(watchBrandGuides[story.slug]?.[0]?.text||story.paragraphs[1]))}</p>{article?<p className="magazine__date"><Clock3 size={14}/>{t('Objavljeno: {date}',{date:date(article.published)})}</p>:<a className="magazine-button" href="#kolekcije">{t('Istražite kolekcije')}<ArrowDown size={17}/></a>}</div><MagazineVisual brand={story?.brand||article.brand} product={story?brand?.items?.[0]:article.cover} priority caption={Boolean(article)}/></header>
      {story&&<section className="magazine-timeline" aria-label={t('Važni trenuci')} data-magazine-reveal>{(watchMilestones[story.slug]||[]).map(point=><div key={point.year}><span>{point.year}</span><p>{t(point.label)}</p></div>)}</section>}
      <div className="magazine__reading-layout"><article className="magazine__prose" data-magazine-reveal><h2>{t(story?'Priča o brendu':'Pogled izbliza')}</h2>{(story?story.paragraphs:article.paragraphs).map(text=><p key={text}>{t(text)}</p>)}
        {story&&(watchBrandGuides[story.slug]||[]).map(section=><section key={section.title} data-magazine-reveal><h2>{t(section.title)}</h2><p>{t(section.text)}</p></section>)}
        <section className="magazine__sources"><h2>{t('Izvori')}</h2>{article&&<p>{t('Datum najave proizvođača: {date}',{date:date(article.sourceDate)})}</p>}{sources.map(source=><a key={source} href={source} target="_blank" rel="noopener noreferrer">{t('Zvanični izvor')} — {new URL(source).hostname}</a>)}<p>{t('Tekst je redakcijski sažetak napisan za DajaShop, uz povezane izvore. Provereno: {date}',{date:date('2026-11-03')})}</p></section>
      </article><aside className="magazine__sidebar">{article&&<><span className="magazine-kicker">{article.brand}</span><MagazineVisual brand={article.brand} product={article.cover}/><p>{t('Istražite priču, a zatim pronađite svoj izbor u katalogu.')}</p><Link className="magazine-button" to={`/brend/${article.brand.toLowerCase().replace(/ /g,'-').replace(/&/g,'-')}`}>{t('Pogledajte ponudu brenda')}<ArrowUpRight size={16}/></Link></>}{story&&<><h2>{story.brand}</h2>{brand&&<CollectionPreview items={brand.items}/>}<Link className="collections-link" to={`/brend/${story.slug}`}>{t('Pogledajte ponudu brenda')}</Link><nav>{selections.map(group=><Link key={group.path} to={group.path}>{t(group.title)}</Link>)}</nav></>}<Link className="collections-link" to="/kolekcije-satova">{t('Svi brendovi i članci')}</Link></aside></div>
      {article&&<p className="magazine__notice">{t('Predstavljanje noviteta proizvođača ne znači da se taj model nalazi u našoj ponudi. Aktuelne proizvode i cene proverite u katalogu.')}</p>}
    </>}
    {articles.length>0&&<section id="clanci" className="magazine__section"><h2>{t('Iz sveta satova')}</h2><div className="magazine__article-grid">{articles.filter(item=>item.slug!==article?.slug).map(item=><article key={item.slug} data-magazine-reveal><Link className="magazine__article-image" to={articlePath(item)} aria-label={t(item.title)}><MagazineVisual brand={item.brand} product={item.cover}/><span>{item.brand}</span></Link><div className="magazine__article-body"><time dateTime={item.published}>{date(item.published)}</time><h3><Link to={articlePath(item)}>{t(item.title)}</Link></h3><p>{t(item.excerpt)}</p><Link className="collections-link" to={articlePath(item)}>{t('Pročitaj članak')} <ArrowUpRight size={16}/></Link></div></article>)}</div></section>}
    {!article&&<>
      {loading&&<p role="status">{t('Učitavanje…')}</p>}{error&&<p role="status">{t('Pregled kolekcija trenutno nije dostupan.')} <button onClick={retry}>{t('Pokušaj ponovo')}</button></p>}
      <section id="kolekcije" className="magazine__section"><h2>{t(story?'Kolekcije ovog brenda':'Istražite kolekcije')}</h2><div className="watch-journal__selections">{(story?selections:groups.filter(group=>!group.path.startsWith('/brend/'))).map(group=><section key={group.path} className="watch-journal__selection" data-magazine-reveal><h3><Link to={group.path}>{t(group.title)}</Link></h3><p>{t(group.description)}</p><CollectionPreview items={group.items}/><Link className="collections-link" to={group.path}>{t('Pogledajte celu kolekciju')}</Link></section>)}</div>{story&&!loading&&!selections.length&&<p>{t('Trenutno nema izdvojenih kolekcija za ovaj brend. Ponudu možete pogledati u katalogu brenda.')}</p>}</section>
    </>}

  </main>;
}
