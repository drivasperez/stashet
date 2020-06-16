import * as React from 'react';
import { UseResourceConfig, Subscription } from './types';
import { useCache } from './cache-context';

type State<T> = {
  isLoading: boolean;
  isUpdating: boolean;
  isLongLoad: boolean;
  isLongUpdate: boolean;
  pageIsVisible: boolean;
  data: T | null;
  error: any | null;
};

type Action<T> =
  | {
      type: 'began';
    }
  | {
      type: 'long_load';
    }
  | { type: 'init'; p: T }
  | {
      type: 'fetched';
      p: T;
    }
  | {
      type: 'err';
      p: any;
    }
  | { type: 'focus'; p: boolean }
  | { type: 'evict' };

const createInitialState = <T>(config: {
  initialData?: T;
  skip?: boolean;
}): State<T> => {
  const pageIsVisible = !document?.hidden ?? true;
  if (config.skip) {
    return {
      isLoading: false,
      isUpdating: false,
      isLongLoad: false,
      isLongUpdate: false,
      pageIsVisible,
      data: null,
      error: null,
    };
  }

  return {
    isLoading: !config.initialData,
    isUpdating: !!config.initialData,
    isLongLoad: false,
    isLongUpdate: false,
    pageIsVisible,
    data: config.initialData ?? null,
    error: null,
  };
};

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'began':
      if (state.data) return { ...state, isLoading: false, isUpdating: true };
      return { ...state, isLoading: true, isUpdating: false };
    case 'long_load':
      if (state.isLoading) {
        return { ...state, isLongLoad: true };
      } else if (state.isUpdating) {
        return { ...state, isLongUpdate: true };
      }
      return { ...state };
    case 'init':
      return { ...state, error: null, data: action.p };
    case 'fetched':
      return {
        ...state,
        isLoading: false,
        isLongLoad: false,
        isLongUpdate: false,
        isUpdating: false,
        error: null,
        data: action.p,
      };
    case 'err':
      return {
        ...state,
        isLoading: false,
        isUpdating: false,
        isLongUpdate: false,
        isLongLoad: false,
        error: action.p,
        data: null,
      };
    case 'focus':
      return { ...state, pageIsVisible: action.p };
    case 'evict':
      return createInitialState({});
  }
}

export function useResource<T, P extends Array<any> = any[]>(
  key: string,
  asyncFunc: (...params: P) => Promise<T>,
  initialParams: P = ([] as unknown) as P,
  config: UseResourceConfig = {}
) {
  const {
    skip,
    msLongLoadAlert = false,
    revalidateOnDocumentFocus = true,
  } = config;

  type S = State<T>;
  type A = Action<T>;
  type R = React.Reducer<S, A>;

  const cache = useCache();

  const mounted = React.useRef(false);
  const isCurrent = React.useRef(0);

  React.useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const [cacheRef] = React.useState<Subscription<any>>(() =>
    cache.getResource(
      key,
      p => {
        if (mounted.current === true) dispatch({ type: 'fetched', p });
      },
      () => {
        if (mounted.current === true) fetchData();
      },
      () => {
        if (mounted.current === true) dispatch({ type: 'evict' });
      }
    )
  );

  React.useEffect(() => {
    return () => {
      cacheRef.unsubscribe();
    };
  }, [cacheRef]);

  const [state, dispatch] = React.useReducer<
    R,
    { initialData?: T; skip?: boolean }
  >(reducer, { initialData: cacheRef.initialValue, skip }, createInitialState);

  const fetchData = React.useCallback(() => {
    if (skip) return;
    isCurrent.current += 1;
    const current = isCurrent.current;
    dispatch({ type: 'began' });
    asyncFunc(...initialParams).then(
      data => {
        if (mounted.current === true && current === isCurrent.current) {
          dispatch({ type: 'fetched', p: data });
          cache._setResource(key, data);
        }
      },
      err => {
        if (mounted.current === true && current === isCurrent.current)
          dispatch({ type: 'err', p: err });
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncFunc, cache, key, skip, ...initialParams]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    const fetchOnFocus = () => {
      dispatch({ type: 'focus', p: !document.hidden });
      if (revalidateOnDocumentFocus) fetchData();
    };

    document.addEventListener('visibilitychange', fetchOnFocus);

    return () => {
      document.removeEventListener('visibilitychange', fetchOnFocus);
    };
  }, [revalidateOnDocumentFocus, fetchData]);

  const { isLoading, isUpdating } = state;
  React.useEffect(() => {
    let t: NodeJS.Timeout;
    const fetchingData = isLoading || isUpdating;
    if (fetchingData && msLongLoadAlert !== false) {
      t = setTimeout(() => dispatch({ type: 'long_load' }), msLongLoadAlert);
    }

    return () => {
      if (t != null) clearTimeout(t);
    };
  }, [isLoading, isUpdating, msLongLoadAlert]);

  return { ...state, refetch: fetchData };
}
