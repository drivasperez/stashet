import React from 'react';
import { CacheContext } from './cache-context';

export function useCache() {
  const cache = React.useContext(CacheContext);

  if (cache == null)
    throw new Error(
      'Use of cache must have a CacheContext provider further up the tree'
    );

  return cache;
}
