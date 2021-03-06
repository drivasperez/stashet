import * as React from 'react';
import { Cache } from './cache';

export const CacheContext = React.createContext<null | Cache>(null);

export const CacheProvider: React.FC<{ cache: Cache }> = ({
  cache,
  children,
}) => <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>;

export function useCache() {
  const cache = React.useContext(CacheContext);

  if (cache == null) throw new Error('Use this hook with CacheProvider');

  return cache;
}
