import * as React from 'react';
import { Config } from './types';
import { Cache } from './cache';

export const CacheContext = React.createContext<null | Cache>(null);

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

  const [state, dispatch] = React.useReducer<R, T | undefined>(
    reducer,
    undefined,
    createInitialState
  );

  React.useEffect(() => {
    let current = true;
    if (skip) return;

    dispatch({ type: 'began_load' });
    asyncFunc().then(
      data => {
        if (current) dispatch({ type: 'fetched_data', payload: data });
      },
      err => {
        if (current) dispatch({ type: 'fetch_error', payload: err });
      }
    );

    return () => {
      current = false;
    };
  }, [asyncFunc, skip]);

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
