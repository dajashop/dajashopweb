import { useAuth } from '../hooks/useAuth.js';
import { isAdminEmail } from '../services/dajaPlatform.js';
import './ProductCard.css';
import { useStorefront } from '../localization/StorefrontContext.jsx';
import './LoadingSkeletons.css';
import './ProductGrid.css';
export function ProductCardSkeleton({ square = false, product, staff = false, canDelete = false }) {
  const { t, money } = useStorefront();
  return <div className="product-card card product-card--skeleton relative overflow-hidden max-w-full w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm" aria-hidden="true">
    <div className={`product-card__media loading-block ${square ? 'aspect-square' : 'aspect-4/5'} w-full`} />
    <div className="product-card__body relative bg-zinc-100 z-10 p-4">
      <div className="flex justify-between items-start mb-1 gap-2">
        <div className="product-card__brand text-xs uppercase tracking-wider text-zinc-500 flex-1 min-w-0 truncate pt-1"><span className="loading-card-text">{product?.brand || 'BREND'}</span></div>
        <span className="p-1.5 -mr-1"><span className="loading-block loading-card-heart" /></span>
      </div>
      <div className="product-card__name font-bold text-lg text-zinc-800 mb-1 leading-tight"><span className="loading-card-text">{product?.name || 'MODEL PROIZVODA'}</span></div>
      <div className="product-card__footer">
        <div className="product-card__price text-zinc-900 dark:text-white font-medium">{product?.salePrice ? <><span className="loading-card-text mr-2">{money(product.price)}</span><span className="loading-card-text">{money(product.salePrice)}</span></> : <span className="loading-card-text">{money(product?.price ?? 12345)}</span>}</div>
        <div className="product-card__btn w-full py-2 bg-neutral-300 rounded-lg font-medium text-sm text-center"><span className="loading-card-text">{t('Dodaj u korpu')}</span></div>
      </div>
      {staff && <div className={`mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 grid gap-2 ${canDelete ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {Array.from({ length: canDelete ? 4 : 3 }, (_, index) => <span className="loading-block loading-card-admin" key={index} />)}
      </div>}
    </div>
  </div>;
}
export function CatalogSkeleton({ square = false, products = [], count = 32 }) {
  const { t } = useStorefront();
  const { user, staffReady } = useAuth();
  return <div role="status" aria-label={t('Učitavanje proizvoda')} className="product-grid loading-catalog" data-catalog-skeleton>
    <span className="sr-only">{t('Učitavanje proizvoda')}</span>
    {Array.from({ length: products.length || count }, (_, index) => <ProductCardSkeleton key={index} product={products[index]} square={square} staff={Boolean(staffReady)} canDelete={isAdminEmail(user?.email)} />)}
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
