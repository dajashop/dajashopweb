import { createContext, useContext } from 'react';
export const CatalogPreparationContext = createContext(null);
export const useCatalogPreparation = () => useContext(CatalogPreparationContext);
