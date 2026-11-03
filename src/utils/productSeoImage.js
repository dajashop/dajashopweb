// Always use the first gallery photo belonging to the current model.
// Never accept a group/variant photo or the separate social-image override.
export function productSeoImage(product) {
  const first = product?.images?.[0];
  return (typeof first === 'string' ? first : first?.url) || product?.mainImageUrl || product?.image || '';
}
