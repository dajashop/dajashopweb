import { createContext, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
export const CatalogParamsContext = createContext(null);
export function useCatalogParams() {
  const routerParams = useSearchParams();
  return useContext(CatalogParamsContext) || routerParams;
}
