import * as React from 'react';
import { UseInfiniteResourceConfig, Subscription } from './types';
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
    }
  | { type: 'document_focused'; payload: boolean }
  | { type: 'key_evicted' };

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
    case 'began_load':
      if (state.data) return { ...state, isLoading: false, isUpdating: true };
      return { ...state, isLoading: true, isUpdating: false };
    case 'long_load':
      if (state.isLoading) {
        return { ...state, isLongLoad: true };
      } else if (state.isUpdating) {
        return { ...state, isLongUpdate: true };
      }
      return { ...state };
    case 'initial_data':
      return { ...state, error: null, data: action.payload };
    case 'fetched_data':
      return {
        ...state,
        isLoading: false,
        isLongLoad: false,
        isLongUpdate: false,
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
        isLongUpdate: false,
        error: action.payload,
        data: null,
      };
    case 'document_focused':
      return { ...state, pageIsVisible: action.payload };
    case 'key_evicted':
      return createInitialState({});
  }
}

export function useInfiniteResource<T>(
  key: string,
  asyncFunc: (prevData: T | null) => Promise<T>,
  config: UseInfiniteResourceConfig<T>,
  skip?: boolean
) {
  const { msLongLoadAlert = false, revalidateOnDocumentFocus = true } = config;

  type S = State<T>;
  type A = Action<T>;
  type R = React.Reducer<S, A>;

  const cache = useCache();

  if (cache == null)
    throw new Error(
      'Usage of useCachedResource must have a CacheContext provider further up the tree'
    );

  const mounted = React.useRef(false);
  const isCurrent = React.useRef(0);
  const prevData = React.useRef<T | null>(null);

  React.useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  });

  const [cacheRef] = React.useState<Subscription<any>>(() =>
    cache.getResource(
      key,
      payload => {
        if (mounted.current === true)
          dispatch({ type: 'fetched_data', payload });
      },
      () => {
        if (mounted.current === true) fetchData();
      },
      () => {
        if (mounted.current === true) dispatch({ type: 'key_evicted' });
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
    dispatch({ type: 'began_load' });
    asyncFunc(prevData.current).then(
      data => {
        if (mounted.current === true && current === isCurrent.current) {
          prevData.current = data;
          dispatch({ type: 'fetched_data', payload: data });
          cache._setResource(key, data);
        }
      },
      err => {
        if (mounted.current === true && current === isCurrent.current)
          dispatch({ type: 'fetch_error', payload: err });
      }
    );
  }, [asyncFunc, cache, key, skip]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    const fetchOnFocus = () => {
      dispatch({ type: 'document_focused', payload: !document.hidden });
      if (revalidateOnDocumentFocus && !document.hidden) {
        fetchData();
      }
    };

    const onUnfocus = () => {
      dispatch({ type: 'document_focused', payload: false });
    };

    document.addEventListener('visibilitychange', fetchOnFocus);
    window.addEventListener('focus', fetchOnFocus);
    window.addEventListener('blur', onUnfocus);

    return () => {
      document.removeEventListener('visibilitychange', fetchOnFocus);
      window.removeEventListener('focus', fetchOnFocus);
      window.removeEventListener('blur', onUnfocus);
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

  let fetchNextPage = null;

  if (
    state.data &&
    config.nextPageURISelector &&
    config.nextPageURISelector(state.data)
  ) {
    fetchNextPage = () => {
      isCurrent.current += 1;
      const current = isCurrent.current;
      dispatch({ type: 'began_load' });
      asyncFunc(prevData.current).then(
        data => {
          if (mounted.current === true && current === isCurrent.current) {
            const newData =
              prevData.current && data && config.extendPreviousData
                ? config.extendPreviousData(data, prevData.current)
                : data;
            prevData.current = newData;
            dispatch({ type: 'fetched_data', payload: data });
            cache._setResource(key, data);
          }
        },
        err => {
          if (mounted.current === true && current === isCurrent.current)
            dispatch({ type: 'fetch_error', payload: err });
        }
      );
    };
  }

  return { ...state, refetch: fetchData, fetchNextPage };
}
