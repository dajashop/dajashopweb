export function isInvalidEmailLink(error) {
  return [400, 404, 410, 422].includes(error?.status) && /link|token|verification/i.test(error?.message || '');
}

export function isEmailLinkToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{24,160}$/.test(value);
}
