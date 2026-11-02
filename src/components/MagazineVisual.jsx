import { useStorefront } from '../localization/StorefrontContext.jsx';
const covers={ORIENT:'/images/TAC08002F0.jpg','ORIENT STAR':'/images/home/service-1280.webp','DANIEL KLEIN':'/images/home/hero-daniel-klein-1519.webp',CASIO:'/images/home/g-shock-1600.webp','Q&Q':'/images/QB64J202Y.jpg'};
export default function MagazineVisual({brand='CASIO',product,priority=false,caption=false}){
  const {t}=useStorefront();
  const src=product?.images?.[0]?.url||product?.mainImageUrl||covers[brand]||covers.CASIO;
  const photo=product?`${product.brand || brand} ${product.name}`:t('Ilustracija iz sveta satova');
  const productPhoto=Boolean(product)||['ORIENT','Q&Q'].includes(brand);
  return <figure className={`magazine-visual ${productPhoto?'magazine-visual--product':'magazine-visual--scene'}`}><div className="magazine-visual__frame"><img src={src} alt={photo} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" width="900" height="720"/></div>{caption&&<figcaption>{product?photo:t('Ilustrativna fotografija; nije prikaz najavljenog modela.')}</figcaption>}</figure>;
}
