export function isProcurementUnavailable(product) {
  if (!product) return false;
  const department = product.department?.slug || product.department;
  if (product.published === false) return department === 'satovi';
  const active = typeof product.active === 'boolean' ? product.active : product.isVisible;
  if (active === true) return false;
  return (department === 'satovi' && active === false) || product.procurementUnavailable === true;
}
