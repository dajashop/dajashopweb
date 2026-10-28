import { useStorefront } from '../localization/StorefrontContext.jsx';
import './LoadingSkeletons.css';
import './ProductGrid.css';
export function CatalogSkeleton({ square = false }) {
  const { t: translateText } = useStorefront();

  return <div role="status" aria-label={translateText("Učitavanje proizvoda")} className="product-grid loading-catalog">
    {translateText(Array.from({ length: 8 }, (_, index) => <div className="loading-card" key={index} aria-hidden="true">
      <div className="loading-block loading-card__image" style={{ aspectRatio: square ? '1 / 1' : '4 / 5' }} /><div className="loading-card__body">
        <div className="loading-block loading-line" /><div className="loading-block loading-line" />
        <div className="loading-block loading-line loading-line--short" /><div className="loading-block loading-button" />
      </div></div>))}
  </div>;
}
export function ProductSkeleton() {
  const { t: translateText } = useStorefront();

  return <div className="loading-product" role="status" aria-label={translateText("Učitavanje proizvoda")}>
    <div className="loading-block loading-product__image" aria-hidden="true" />
    <div aria-hidden="true"><div className="loading-block loading-line" />
      <div className="loading-block loading-line loading-line--short" /><div className="loading-block loading-button" />
      <div className="loading-block loading-product__specs" /></div>
  </div>;
}
