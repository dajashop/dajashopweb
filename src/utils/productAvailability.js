export function isProcurementUnavailable(product) {
  if (!product || product.published === false) return false;
  const department = product.department?.slug || product.department;
  const active = typeof product.active === 'boolean' ? product.active : product.isVisible;
  if (active === true) return false;
  return (department === 'satovi' && active === false) || product.procurementUnavailable === true;
}
