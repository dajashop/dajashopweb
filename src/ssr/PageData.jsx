import { createContext, useContext, useEffect, useState } from 'react';

// Request-scoped: never keep catalog data or customer state in Worker globals.
const PageDataContext = createContext(null);

export function PageDataProvider({ data, children }) {
  const [hydrating, setHydrating] = useState(Boolean(data));
  useEffect(() => setHydrating(false), []);
  return <PageDataContext.Provider value={{ data, hydrating }}>{children}</PageDataContext.Provider>;
}

export function usePageData() {
  return useContext(PageDataContext);
}
