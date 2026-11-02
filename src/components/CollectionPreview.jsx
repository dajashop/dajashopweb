import { Link } from 'react-router-dom';
import { useStorefront } from '../localization/StorefrontContext.jsx';
export default function CollectionPreview({items=[]}) {
  const {money}=useStorefront();
  return <div className="collection-preview">{items.map(product=>{
    const image=product.images?.[0];
    const src=image?.thumb || image?.url || product.primaryImageUrl || product.mainImageUrl;
    return <Link className="collection-preview__product" key={product.id} to={`/product/${encodeURIComponent(product.slug)}`}>
      <div className="collection-preview__image">{src&&<img src={src} alt={`${product.brand || ''} ${product.name}`} loading="lazy" decoding="async" width="220" height="260"/>}</div>
      <span className="collection-preview__model">{product.name}</span><span className="collection-preview__price">{money(product.price)}</span>
    </Link>;
  })}</div>;
}
