import * as React from 'react';
import { Config } from './types';
import { CacheContext } from './cache-context';
import { Cache } from './cache';

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
  | { type: 'began_update' }
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

const createInitialState = <T>(initialData?: T): State<T> => ({
  isLoading: !initialData,
  isUpdating: !!initialData,
  isLongLoad: false,
  data: initialData ?? null,
  error: null,
});

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  // console.log('state:', state, 'incoming action:', action);
  switch (action.type) {
    case 'began_load':
      return { ...state, isLoading: true, isUpdating: false };
    case 'began_update': {
      return { ...state, isUpdating: true, isLoading: false };
    }
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
  config: Config = {},
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

  const [cacheRef] = React.useState(() =>
    cache.getResource(key, payload => {
      dispatch({ type: 'fetched_data', payload });
    })
  );

  React.useEffect(() => {
    return () => {
      cacheRef.unsubscribe();
    };
  }, []);

  const [state, dispatch] = React.useReducer<R, T | undefined>(
    reducer,
    cacheRef.initialValue,
    createInitialState
  );

  React.useEffect(() => {
    let current = true;
    if (skip) return;

    dispatch({ type: 'began_load' });
    asyncFunc().then(
      data => {
        if (current) {
          dispatch({ type: 'fetched_data', payload: data });
          cache.setResource(key, data);
        }
      },
      err => {
        if (current) dispatch({ type: 'fetch_error', payload: err });
      }
    );

    return () => {
      current = false;
    };
  }, [asyncFunc, key, skip]);

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

  return { ...state };
}