import React from 'react';
import { Cache } from './cache';

export const CacheContext = React.createContext<null | Cache>(null);

export const CacheProvider: React.FC<{ cache: Cache }> = ({
  cache,
  children,
}) => <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>;
