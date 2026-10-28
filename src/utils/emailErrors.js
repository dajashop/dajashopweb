export function isInvalidEmailLink(error) {
  return [400, 404, 410, 422].includes(error?.status) && /link|token|verification/i.test(error?.message || '');
}
