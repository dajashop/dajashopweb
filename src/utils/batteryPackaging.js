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

export function batteryQuantityOptions(product) {
  const pack = batteryPackaging(product);
  const choices = product?.attributes?._catalog_import?.packaging?.selectableQuantities;
  return pack?.quantity === 1 && Array.isArray(choices) && choices.length === 2 && choices[0] === 1 && choices[1] === 5 ? choices : [];
}

// A display-only total. The cart always receives the original single-cell
// variant, its authoritative unit price and quantity 1 or 5.
export function batteryPurchaseView(product, quantity) {
  if (!batteryQuantityOptions(product).includes(quantity)) return product;
  const pack = batteryPackaging(product);
  const price = pack.price * quantity;
  const available = Number(product.availability?.availableQuantity ?? product.availableQuantity ?? 0);
  return { ...product, price, salePrice: null, regularPrice: null,
    availability: { ...product.availability, inStock: available >= quantity, availableQuantity: Math.floor(available / quantity) },
    attributes: { ...product.attributes, _catalog_import: { ...product.attributes._catalog_import,
      packaging: { ...product.attributes._catalog_import.packaging, quantity, kind: quantity === 1 ? 'single' : 'pack',
        priceAmount: Math.round(price * 100), regularPriceAmount: Math.round(price * 100), discountPercent: 0 } } } };
}
