import { useStorefront } from '../localization/StorefrontContext.jsx';
const covers={ORIENT:'/images/TAC08002F0.jpg','ORIENT STAR':'/images/home/service-1280.webp','DANIEL KLEIN':'/images/home/hero-daniel-klein-1519.webp',CASIO:'/images/home/g-shock-1600.webp','Q&Q':'/images/QB64J202Y.jpg'};
export default function MagazineVisual({brand='CASIO',product,photo,priority=false,caption=false,sizes='(max-width: 700px) 92vw, 70vw'}){
  const {t}=useStorefront();
  const src=photo?.src||product?.images?.[0]?.url||product?.mainImageUrl||covers[brand]||covers.CASIO;
  const alt=photo?t(photo.alt):product?`${product.brand || brand} ${product.name}`:t('Ilustracija iz sveta satova');
  const productPhoto=photo?Boolean(photo.product):Boolean(product)||['ORIENT','Q&Q'].includes(brand);
  return <figure className={`magazine-visual ${productPhoto?'magazine-visual--product':'magazine-visual--scene'}`}><div className="magazine-visual__frame"><img src={src} srcSet={photo?.small?`${photo.small} 640w, ${photo.src} 1600w`:undefined} sizes={photo?.small?sizes:undefined} alt={alt} style={photo?.position?{objectPosition:photo.position}:undefined} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" width="1600" height="1000"/></div>{caption&&<figcaption><span>{photo?t(photo.caption):product?alt:t('Ilustrativna fotografija; nije prikaz najavljenog modela.')}</span>{photo?.author&&<a href={photo.creditUrl} target="_blank" rel="noopener noreferrer">{t('Fotografija: {author} / Unsplash',{author:photo.author})}</a>}</figcaption>}</figure>;
}
