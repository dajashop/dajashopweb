// Catalogue prices are already the complete selling-unit prices. This helper
// only describes that unit; checkout uses the existing variant and server price.
export function batteryPackaging(product) {
  if (product?.department !== 'baterije') return null;
  const pack = product.attributes?._catalog_import?.packaging;
  const quantity = Number(pack?.quantity);
  if (pack?.schemaVersion !== 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) return null;
  const price = product.regularPrice != null ? Number(product.price) : Number(product.salePrice ?? product.price);
  const priceAmount = Math.round(price * 100);
  const reference = Number(pack.regularPriceAmount);
  const expected = Number(pack.priceAmount);
  const discounted = quantity === 40 && pack.discountPercent === 20 && priceAmount === expected && Math.round(reference * 0.8) === expected;
  return { quantity, box: pack.kind === 'box', price, unitPrice: price / quantity,
    discountPercent: discounted ? 20 : 0, regularPrice: discounted ? reference / 100 : null,
    listUnitPrice: discounted ? reference / 100 / quantity : price / quantity };
}
