import {Link} from 'react-router-dom';
import {useStorefront} from '../localization/StorefrontContext.jsx';
import useCollectionPreviews from '../hooks/useCollectionPreviews.js';
import CollectionPreview from '../components/CollectionPreview.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import {watchStories} from '../data/watchStories.js';
import '../components/Collections.css';
export default function Collections(){
  const {t}=useStorefront();const {groups,loading,error,retry}=useCollectionPreviews();
  const collections=groups.filter(group=>!group.path.startsWith('/brend/'));
  const featured=groups.find(group=>group.path==='/orient-bambino')||groups[0];
  return <main className="watch-journal">
    <SEOHead title={t('Kolekcije satova i priče o brendovima')} description={t('Upoznajte priče brendova Orient, Orient Star, Daniel Klein, Casio i Q&Q. Istražite kolekcije i pogledajte modele iz aktuelne ponude.')} url="/kolekcije-satova"/>
    <BreadcrumbJsonLd items={[{name:t('Kolekcije satova'),url:'/kolekcije-satova'}]}/>
    <div className="watch-journal__breadcrumb"><Link to="/">{t('Početak')}</Link><span>/</span><span>{t('Kolekcije satova')}</span></div>
    <header className="watch-journal__hero"><div><h1>{t('Satovi i njihove priče')}</h1><p>{t('Upoznajte brendove, pronađite kolekciju koja vam je bliska i pogledajte satove iz naše ponude.')}</p><a className="collections-link" href="#price-brendova">{t('Istražite kolekcije')}</a></div>
      {featured&&<div className="watch-journal__feature"><CollectionPreview items={featured.items}/><Link to={featured.path}>{t(featured.title)}</Link></div>}
    </header>
    <nav className="watch-journal__brands" aria-label={t('Priče o brendovima')}>{watchStories.map(story=><a key={story.slug} href={`#prica-${story.slug}`}>{story.brand}</a>)}</nav>
    {loading&&<p role="status">{t('Učitavanje…')}</p>}
    {error&&<p role="status">{t('Pregled kolekcija trenutno nije dostupan.')} <button onClick={retry}>{t('Pokušaj ponovo')}</button></p>}
    <div id="price-brendova">{watchStories.map(story=>{
      const brand=groups.find(group=>group.path===`/brend/${story.slug}`);
      const selections=collections.filter(group=>group.brand===story.brand);
      return <article key={story.slug} id={`prica-${story.slug}`} className="watch-journal__story">
        <div className="watch-journal__story-intro"><div className="watch-journal__copy"><h2>{t(story.title)}</h2>{story.paragraphs.map(text=><p key={text}>{t(text)}</p>)}
          <a className="watch-journal__source" href={story.source} target="_blank" rel="noopener noreferrer">{t('Istorija brenda — zvanični izvor')}</a>
          <Link className="collections-link" to={`/brend/${story.slug}`}>{t('Pogledajte ponudu brenda')}</Link>
        </div>{brand&&<CollectionPreview items={brand.items}/>}</div>
        {selections.length>0&&<div className="watch-journal__selections">{selections.map(group=><section key={group.path} className="watch-journal__selection"><h3><Link to={group.path}>{t(group.title)}</Link></h3><p>{t(group.description)}</p><CollectionPreview items={group.items}/><Link className="collections-link" to={group.path}>{t('Pogledajte celu kolekciju')}</Link></section>)}</div>}
        {!brand&&!loading&&!error&&<p className="watch-journal__availability">{t('Ponuda ovog brenda trenutno nije dostupna. Pogledajte ostale kolekcije.')}</p>}
      </article>;
    })}</div>
    {collections.some(group=>!group.brand)&&<section className="watch-journal__story"><h2>{t('Izaberite prema načinu rada')}</h2><p>{t('Ako već znate kakav sat tražite, uporedite automatske i digitalne modele.')}</p><div className="watch-journal__selections">{collections.filter(group=>!group.brand).map(group=><section key={group.path} className="watch-journal__selection"><h3><Link to={group.path}>{t(group.title)}</Link></h3><CollectionPreview items={group.items}/><Link className="collections-link" to={group.path}>{t('Pogledajte celu kolekciju')}</Link></section>)}</div></section>}
  </main>;
}
