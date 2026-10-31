export function passkeyError(error) {
  const name = error?.cause?.name || error?.name;
  if (name === 'NotAllowedError' || error?.code === 'ERROR_CEREMONY_ABORTED') {
    return new Error('Passkey potvrda je otkazana ili je vreme isteklo. Pokušajte ponovo.');
  }
  if (name === 'InvalidStateError') return new Error('Ovaj passkey ključ je već registrovan na uređaju.');
  if (name === 'NotSupportedError') return new Error('Ovaj uređaj ne podržava traženi passkey. Koristite drugi uređaj ili Google prijavu.');
  if (name === 'SecurityError') return new Error('Passkey je dostupan samo na bezbednom DajaShop domenu.');
  return error;
}
