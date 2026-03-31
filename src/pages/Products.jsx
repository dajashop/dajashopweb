import React, { useEffect, useMemo } from 'react';
import './Product.css';
import { useParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart.js';
import { useFlash } from '../hooks/useFlash.js';
import { useWishlist } from '../context/WishlistProvider.jsx';
import useProduct from '../hooks/useProduct.js';
import useProducts from '../hooks/useProducts.js';

// Import komponenti
import ProductGallery from '../components/product/ProductGallery.jsx';
import ProductHeader from '../components/product/ProductHeader.jsx';
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

const DEPARTMENT_LABELS = {
  satovi: 'Ručni Satovi',
  daljinski: 'Daljinski Upravljači',
  baterije: 'Baterije & Oprema',
  naocare: 'Sunčane Naočare',
};

const DEPARTMENT_PATHS = {
  satovi: '/catalog',
  daljinski: '/daljinski',
  baterije: '/baterije',
  naocare: '/naocare',
};

export default function Product() {
  const { slug } = useParams();
  const { product: p, loading, error } = useProduct(slug);
  const { items: allProducts } = useProducts();
  const { dispatch } = useCart();
  const { flash } = useFlash();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isLiked = p ? isInWishlist(p.id) : false;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  const relatedVariants = useMemo(() => {
    if (!p || !allProducts.length) return [];
    const parts = p.name.split('-');
    if (parts.length < 2) return [];
    const baseName = parts.slice(0, -1).join('-');
    return allProducts.filter(
      (item) => item.id !== p.id && item.name.startsWith(baseName),
    );
  }, [p, allProducts]);

  // --- [LOGIKA] Da li proizvod ima unete funkcionalnosti? ---
  const hasFeatures = useMemo(() => {
    if (!p || !p.features || !Array.isArray(p.features)) return false;
    // Proveravamo da li ima bar jedna validna funkcionalnost sa naslovom
    return p.features.some((f) => f.title && f.title.trim() !== '');
  }, [p]);

  if (loading)
    return <div className="container product-loading">Učitavanje...</div>;
  if (error || !p)
    return <div className="container product-error">Nije pronađeno.</div>;

  const siteRoot = seoConfig.siteUrl.replace(/\/$/, '');
  const productTitle = `${p.brand || ''} ${p.name || ''}`.trim();
  const productDescription =
    p.description ||
    `Kupite ${productTitle} po ceni od ${p.price} RSD. Besplatna dostava.`;
  const productImage = p.mainImageUrl || p.images?.[0]?.url || p.image;
  const department = p.department || 'satovi';
  const departmentPath = DEPARTMENT_PATHS[department] || '/catalog';
  const departmentName = DEPARTMENT_LABELS[department] || 'Katalog';

  const handleAdd = () => {
    dispatch({
      type: 'ADD',
      item: {
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0]?.url || p.image,
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
      image: p.images?.[0]?.url || p.image,
      brand: p.brand,
      slug: p.slug,
    });
  };

  return (
    <div className="product-page-wrapper">
      <SEOHead
        title={productTitle}
        description={productDescription}
        image={productImage}
        type="product"
        url={`${siteRoot}/product/${p.slug}`}
      />
      <ProductJsonLd product={p} />
      <BreadcrumbJsonLd
        items={[
          { name: departmentName, url: `${siteRoot}${departmentPath}` },
          { name: productTitle, url: `${siteRoot}/product/${p.slug}` },
        ]}
      />

      <div className="product product-layout">
        {/* LEVA KOLONA */}
        <div className="product__gallery-container">
          <ProductGallery product={p} />

          <div className="desktop-trust">
            <ProductTrust />
          </div>

          {/* TABOVI (DESKTOP) */}
          <div className="desktop-only-tabs">
            {/* Ako NEMA features, šaljemo hideSpecs={true} jer će specs biti desno */}
            <ProductTabs product={p} hideSpecs={!hasFeatures} />
          </div>
        </div>

        {/* DESNA KOLONA */}
        <div className="product__info">
          <ProductHeader product={p} />
          <ProductVariants product={p} relatedVariants={relatedVariants} />

          <ProductActions
            onAdd={handleAdd}
            onWishlist={handleWishlist}
            isLiked={isLiked}
          />

          <div className="mobile-trust">
            <ProductTrust />
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
      </div>

      <div className="container">
        <RelatedProducts currentProduct={p} allProducts={allProducts} />
      </div>
    </div>
  );
}
