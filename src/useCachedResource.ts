import * as React from 'react';
import { CacheConfig, Subscription } from './types';
import { CacheContext } from './cache-context';

type State<T> = {
  isLoading: boolean;
  isUpdating: boolean;
  isLongLoad: boolean;
  data: T | null;
  error: any | null;
};

type Action<T> =
  | {
      type: 'began_load';
    }
  | {
      type: 'long_load';
    }
  | { type: 'initial_data'; payload: T }
  | {
      type: 'fetched_data';
      payload: T;
    }
  | {
      type: 'fetch_error';
      payload: any;
    };

const createInitialState = <T>(config: {
  initialData?: T;
  skip?: boolean;
}): State<T> => {
  if (config.skip) {
    return {
      isLoading: false,
      isUpdating: false,
      isLongLoad: false,
      data: null,
      error: null,
    };
  }

  return {
    isLoading: !config.initialData,
    isUpdating: !!config.initialData,
    isLongLoad: false,
    data: config.initialData ?? null,
    error: null,
  };
};

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  console.log('state:', state, 'incoming action:', action);
  switch (action.type) {
    case 'began_load':
      if (state.data) return { ...state, isLoading: false, isUpdating: true };
      return { ...state, isLoading: true, isUpdating: false };
    case 'long_load':
      if (state.isLoading) {
        return { ...state, isLongLoad: true };
      }
      return { ...state };
    case 'initial_data':
      return { ...state, error: null, data: action.payload };
    case 'fetched_data':
      return {
        ...state,
        isLoading: false,
        isLongLoad: false,
        isUpdating: false,
        error: null,
        data: action.payload,
      };
    case 'fetch_error':
      return {
        ...state,
        isLoading: false,
        isUpdating: false,
        isLongLoad: false,
        error: action.payload,
        data: null,
      };
  }
}

export function useCachedResource<T>(
  key: string,
  asyncFunc: () => Promise<T>,
  config: CacheConfig = {},
  skip?: boolean
) {
  const {
    msLongLoadAlert = false,
    msMinimumLoad = false,
    ignoreCacheOnMount = false,
    family,
  } = config;

  type S = State<T>;
  type A = Action<T>;
  type R = React.Reducer<S, A>;

  const cache = React.useContext(CacheContext);

  if (cache == null)
    throw new Error(
      'Usage of useCachedResource must have a CacheContext provider further up the tree'
    );

  const [cacheRef] = React.useState<Subscription<any>>(() =>
    cache.getResource(
      key,
      payload => {
        dispatch({ type: 'fetched_data', payload });
      },
      () => fetchData()
    )
  );

  const isCurrent = React.useRef(0);

  const fetchData = React.useCallback(() => {
    if (skip) return;
    isCurrent.current += 1;
    const current = isCurrent.current;
    dispatch({ type: 'began_load' });
    asyncFunc().then(
      data => {
        if (current === isCurrent.current) {
          dispatch({ type: 'fetched_data', payload: data });
          cache._setResource(key, data);
        }
      },
      err => {
        if (current === isCurrent.current)
          dispatch({ type: 'fetch_error', payload: err });
      }
    );
  }, [asyncFunc, cache, key, skip]);

  React.useEffect(() => {
    return () => {
      cacheRef.unsubscribe();
    };
  }, [cacheRef]);

  const [state, dispatch] = React.useReducer<
    R,
    { initialData?: T; skip?: boolean }
  >(reducer, { initialData: cacheRef.initialValue, skip }, createInitialState);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { isLoading } = state;
  React.useEffect(() => {
    let t: NodeJS.Timeout;
    if (isLoading && msLongLoadAlert !== false) {
      t = setTimeout(() => dispatch({ type: 'long_load' }), msLongLoadAlert);
    }

    return () => {
      if (t != null) clearTimeout(t);
    };
  }, [isLoading, msLongLoadAlert]);

  return { ...state, refetch: fetchData };
}
