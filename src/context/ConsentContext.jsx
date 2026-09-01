import { createContext, useContext } from 'react';

export const ConsentContext = createContext(null);

export function useConsent() {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent mora biti korišćen unutar ConsentProvider-a.');
  return value;
}
