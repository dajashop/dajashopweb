import { normalizePostalCity, postalCodeForCity } from '../../data/serbiaPostalCodes.js';

export function formatDeliveryAddress(street, details) {
  return [street, details].map(value => (value || '').trim()).filter(Boolean).join(', ');
}

const normalizeStreet = value => (value || '').normalize('NFC').toLowerCase().trim()
  .replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',');

export function sameDeliveryAddress(saved, delivery) {
  const street = normalizeStreet(delivery.address);
  const city = normalizePostalCity(delivery.city);
  const zip = String(saved.zip ?? '').trim();
  return Boolean(street && city && normalizeStreet(saved.address) === street &&
    normalizePostalCity(saved.city) === city && (!zip || zip === String(delivery.zip ?? '').trim()));
}

export function savedAddressFields(saved) {
  return {
    address: saved?.address?.trim() || '',
    addressDetails: '',
    city: saved?.city?.trim() || '',
    postalCode: String(saved?.zip ?? '').trim() || postalCodeForCity(saved?.city),
  };
}
