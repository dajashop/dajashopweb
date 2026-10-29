import { useStorefront } from '../localization/StorefrontContext.jsx';
import { productSeoDescription } from '../utils/productSeoDescription.js';
import React, { lazy, useEffect, useMemo, useRef, useState } from 'react';
import './Product.css';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart.js';
import { useFlash } from '../hooks/useFlash.js';
import { useWishlist } from '../context/WishlistProvider.jsx';
import { ProductSkeleton } from '../components/LoadingSkeletons.jsx';
import useProduct from '../hooks/useProduct.js';
import useRelatedProducts from '../hooks/useRelatedProducts.js';
import useProductVariantGroup from '../hooks/useProductVariantGroup.js';

// Import komponenti
import ProductGallery from '../components/product/ProductGallery.jsx';
import ProductHeader from '../components/product/ProductHeader.jsx';
import ClientOnly from '../components/ClientOnly.jsx';
const ProductAdminTools = import.meta.env.SSR ? () => null : lazy(() => import('../components/product/ProductAdminTools.jsx'));
import { useAuth } from '../hooks/useAuth.js';
import ProductVariants from '../components/product/ProductVariants.jsx';
import ProductActions from '../components/product/ProductActions.jsx';
import ProductFeatures from '../components/product/ProductFeatures.jsx';
import ProductTabs from '../components/product/ProductTabs.jsx';
import ProductTrust from '../components/product/ProductTrust.jsx';
import RelatedProducts from '../components/product/RelatedProducts.jsx';
// [NOVO] Import nove komponente
import ProductSpecs from '../components/product/ProductSpecs.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import ProductJsonLd from '../components/seo/ProductJsonLd.jsx';
import BreadcrumbJsonLd from '../components/seo/BreadcrumbJsonLd.jsx';
import { seoConfig } from '../config/seo.js';
import { visibleProductFeatures } from '../utils/catalogPresentation.js';
import PageStatus from './PageStatus.jsx';
import { prepareProductVariant, productResourceKey } from '../services/products.js';
import { rememberResource } from '../services/catalogResourceCache.js';

const DEPARTMENT_LABELS = {
  satovi: 'Ručni Satovi',
  daljinski: 'Daljinski Upravljači',
  baterije: 'Baterije & Oprema',
  naocare: 'Naočare za sunce',
};

const DEPARTMENT_PATHS = {
  satovi: '/catalog',
  daljinski: '/daljinski',
  baterije: '/baterije',
  naocare: '/naocare',
};

export default function Product() {
  const { t: translateText, language } = useStorefront();

  const { slug } = useParams();
  const navigate = useNavigate();
  const { product: p, loading, error, updateProduct } = useProduct(slug);
  const { staffReady } = useAuth();
  const relatedProducts = useRelatedProducts(slug, Boolean(p?.id));
  const { dispatch } = useCart();
  const { flash } = useFlash();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isLiked = p ? isInWishlist(p.id) : false;
  const selection = useRef(null);
  const [pendingSlug, setPendingSlug] = useState(null);

  // Cancel an unfinished selection on navigation or catalog/group changes.
  useEffect(() => {
    const cancel = () => {
      selection.current?.abort();
      selection.current = null;
      setPendingSlug(null);
    };
    const events = ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed'];
    events.forEach(event => window.addEventListener(event, cancel));
    return () => {
      cancel();
      events.forEach(event => window.removeEventListener(event, cancel));
    };
  }, [slug]);

  useEffect(() => {
    if (p?.redirectTo) navigate(p.redirectTo, { replace: true });
  }, [navigate, p?.redirectTo]);

  const { items: relatedVariants, groupId: variantGroupId } = useProductVariantGroup(slug, p);

  const selectVariant = async (variant) => {
    selection.current?.abort();
    const controller = new AbortController();
    selection.current = controller;
    setPendingSlug(variant.slug);
    try {
      const next = await prepareProductVariant(variant.slug, { signal: controller.signal });
      if (controller.signal.aborted || selection.current !== controller) return;
      if (!next?.id || next.redirectTo) throw new Error('Variant unavailable');
      // Image preparation may outlast the normal resource TTL; seed the exact
      // complete payload immediately before the router switches products.
      rememberResource(productResourceKey(variant.slug), next);
      navigate(`/product/${variant.slug}`, { replace: true, state: { variantTransition: true } });
    } catch (error) {
      if (error.name !== 'AbortError' && selection.current === controller) {
        flash('Varijanta nije učitana', 'Pokušajte ponovo. Prethodni model je i dalje izabran.', 'error');
      }
    } finally {
      if (selection.current === controller) {
        selection.current = null;
        setPendingSlug(null);
      }
    }
  };

  // --- [LOGIKA] Da li proizvod ima unete funkcionalnosti? ---
  const hasFeatures = useMemo(() => {
    return visibleProductFeatures(p?.features).length > 0;
  }, [p]);

  if (loading) return <><SEOHead title={translateText("Proizvod")} keywords="" defer={false} /><ProductSkeleton /></>;
  if (error || !p)
    return <PageStatus status={error && error.status !== 404 ? 503 : 404} />;
  if (p.redirectTo) return (
    <div className="container product-loading">
      <SEOHead title={translateText("Proizvod")} keywords="" defer={false} />
      <p role="status">{translateText("Preusmeravanje...")}</p>
    </div>
  );

  const siteRoot = seoConfig.siteUrl.replace(/\/$/, '');
  const productTitle = `${p.brand || ''} ${p.name || ''}`.trim();
  const productImage =
    p.mainImageUrl ||
    p.images?.[0]?.url ||
    p.thumbnailUrl ||
    p.images?.[0]?.thumb ||
    p.image;
  const seoTitle = (language === 'en' ? p.attributes?._translations?.en?.metaTitle : p.seo?.metaTitle) || productTitle;
  const seoDescription = productSeoDescription(p, language);
  const seoKeywords = p.seo?.metaKeywords || undefined;
  const seoImage = p.seo?.ogImage || productImage;
  const department = p.department || 'satovi';
  const departmentPath = DEPARTMENT_PATHS[department] || '/catalog';
  const departmentName = DEPARTMENT_LABELS[department] || 'Katalog';

  const handleAdd = () => {
    dispatch({
      type: 'ADD',
      item: {
        id: p.id,
        productId: p.productId || p.id,
        variantId: p.variantId || p.variants?.[0]?.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0]?.url || p.mainImageUrl || p.image,
        thumb:
          p.thumbnailUrl ||
          p.images?.[0]?.thumb ||
          p.images?.[0]?.url ||
          p.image,
        brand: p.brand,
        slug: p.slug,
      },
    });
    flash('Dodato', 'Proizvod je u korpi.', 'cart');
  };

  const handleWishlist = () => {
    toggleWishlist({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images?.[0]?.url || p.mainImageUrl || p.image,
      thumb:
        p.thumbnailUrl || p.images?.[0]?.thumb || p.images?.[0]?.url || p.image,
      brand: p.brand,
      slug: p.slug,
    });
  };

  return (
    <div className="product-page-wrapper">
      <SEOHead
        defer={false}
        title={translateText(seoTitle)}
        description={translateText(seoDescription)}
        keywords={seoKeywords}
        image={seoImage}
        type="product"
        url={`${siteRoot}/product/${p.slug}`}
      />
      <ProductJsonLd product={p} reviews={p.reviews || []} relatedVariants={relatedVariants} groupId={variantGroupId} />
      <BreadcrumbJsonLd
        defer={false}
        items={[
          { name: departmentName, url: `${siteRoot}${departmentPath}` },
          { name: productTitle, url: `${siteRoot}/product/${p.slug}` },
        ]}
      />

      <div className="product product-layout">
        {/* DESNA KOLONA */}
        <div className="product__info">
          <ProductHeader product={p} adminTools={staffReady ? <ClientOnly><ProductAdminTools key={p.id} product={p}
            onUpdated={(patch) => {
              updateProduct(patch);
              if (patch.slug && patch.slug !== slug) navigate(`/product/${patch.slug}`, { replace: true });
            }}
            onDeleted={() => navigate(departmentPath, { replace: true })} /></ClientOnly> : null} />
          <ProductVariants product={p} relatedVariants={relatedVariants} onSelect={selectVariant} pendingSlug={pendingSlug} />

          <ProductActions
            key={p.id}
            product={p}
            onAdd={handleAdd}
            onWishlist={handleWishlist}
            isLiked={isLiked}
          />

          <div className="mobile-trust">
            <ProductTrust department={p.department} />
          </div>
          {/* Tabovi (Mobilni) */}
          <div className="mobile-only-tabs">
            <ProductTabs product={p} hideSpecs={!hasFeatures} />
          </div>

          {/* --- GLAVNA LOGIKA PRIKAZA --- */}
          {hasFeatures ? (
            // 1. Ako IMA features -> Prikaži njih
            <ProductFeatures product={p} />
          ) : (
            // 2. Ako NEMA features -> Prikaži Specifikacije ovde (kao zamenu)
            <ProductSpecs product={p} />
          )}
          {/* ----------------------------- */}
        </div>

        {/* H1 and product information precede section headings in the document.
            CSS keeps the gallery in its existing position on desktop and mobile. */}
        <div className="product__gallery-container">
          <ProductGallery key={p.id} product={p} />
          <div className="desktop-trust">
            <ProductTrust department={p.department} />
          </div>
          <div className="desktop-only-tabs">
            <ProductTabs product={p} hideSpecs={!hasFeatures} />
          </div>
        </div>
      </div>

      <div className="container">
        <RelatedProducts currentProduct={p} allProducts={relatedProducts} />
      </div>
    </div>
  );
}
