export function formatDeliveryAddress(street, details) {
  return [street, details].map(value => (value || '').trim()).filter(Boolean).join(', ');
}
