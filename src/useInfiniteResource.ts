import * as React from 'react';
import { UseInfiniteResourceConfig, Subscription } from './types';
import { useCache } from './cache-context';

type State<T> = {
  isLoading: boolean;
  isUpdating: boolean;
  isLongLoad: boolean;
  isLongUpdate: boolean;
  isFetchingMore: boolean;
  isLongFetchingMore: boolean;
  pageIsVisible: boolean;
  data: T | null;
  error: any | null;
};

type Action<T> =
  | {
      type: 'began';
      more?: boolean;
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
      isFetchingMore: false,
      isLongFetchingMore: false,
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
    isFetchingMore: false,
    isLongFetchingMore: false,
    pageIsVisible,
    data: config.initialData ?? null,
    error: null,
  };
};

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'began':
      if (action.more === true)
        return {
          ...state,
          isLoading: false,
          isUpdating: false,
          isFetchingMore: true,
        };
      if (state.data)
        return {
          ...state,
          isLoading: false,
          isUpdating: true,
          isFetchingMore: false,
        };
      return {
        ...state,
        isLoading: true,
        isUpdating: false,
        isFetchingMore: false,
      };
    case 'long_load':
      if (state.isLoading) {
        return { ...state, isLongLoad: true };
      } else if (state.isUpdating) {
        return { ...state, isLongUpdate: true };
      } else if (state.isFetchingMore) {
        return { ...state, isLongFetchingMore: true };
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
        isLongFetchingMore: false,
        isUpdating: false,
        error: null,
        data: action.p,
      };
    case 'err':
      return {
        ...state,
        isLoading: false,
        isUpdating: false,
        isLongLoad: false,
        isLongUpdate: false,
        isLongFetchingMore: false,
        error: action.p,
        data: null,
      };
    case 'focus':
      return { ...state, pageIsVisible: action.p };
    case 'evict':
      return createInitialState({});
  }
}

export function useInfiniteResource<T, P extends Array<any> = any[]>(
  key: string,
  asyncFunc: (...params: P) => Promise<T>,
  initialParams: P = ([] as unknown) as P,
  config: UseInfiniteResourceConfig<T, P>
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

  const prevData = React.useRef(cacheRef.initialValue);

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

    if (!prevData.current) {
      asyncFunc(...initialParams).then(
        data => {
          if (mounted.current === true && current === isCurrent.current) {
            dispatch({ type: 'fetched', p: data });
            prevData.current = data;
            cache._setResource(key, data);
          }
        },
        err => {
          if (mounted.current === true && current === isCurrent.current)
            dispatch({ type: 'err', p: err });
        }
      );
    } else {
      config.updateLoadedData(prevData.current).then(
        data => {
          if (mounted.current === true && current === isCurrent.current) {
            dispatch({ type: 'fetched', p: data });
            prevData.current = data;
            cache._setResource(key, data);
          }
        },
        err => {
          if (mounted.current === true && current === isCurrent.current)
            dispatch({ type: 'err', p: err });
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncFunc, cache, key, skip, ...initialParams]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    const fetchOnFocus = () => {
      dispatch({ type: 'focus', p: !document.hidden });
      if (revalidateOnDocumentFocus && !document.hidden) {
        fetchData();
      }
    };

    const onUnfocus = () => {
      dispatch({ type: 'focus', p: false });
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

  const { isLoading, isUpdating, isFetchingMore } = state;
  React.useEffect(() => {
    let t: NodeJS.Timeout;
    const fetchingData = isLoading || isUpdating || isFetchingMore;
    if (fetchingData && msLongLoadAlert !== false) {
      t = setTimeout(() => dispatch({ type: 'long_load' }), msLongLoadAlert);
    }

    return () => {
      if (t != null) clearTimeout(t);
    };
  }, [isLoading, isUpdating, isFetchingMore, msLongLoadAlert]);

  let fetchNextPage: null | (() => Promise<void>) = null;

  if (
    state.data !== null &&
    !state.isLoading &&
    !state.isUpdating &&
    config.nextPageParams &&
    config.nextPageParams(state.data)
  ) {
    fetchNextPage = () => {
      isCurrent.current += 1;
      const current = isCurrent.current;
      dispatch({ type: 'began', more: true });
      const nextParams: P = config.nextPageParams(state.data!); // we checked it's not null
      return asyncFunc(...nextParams).then(
        data => {
          if (
            state.data !== null &&
            mounted.current === true &&
            current === isCurrent.current
          ) {
            Promise.resolve(config.extendPreviousData(data, state.data)).then(
              newData => {
                dispatch({ type: 'fetched', p: newData });
                prevData.current = newData;
                cache._setResource(key, newData);
              }
            );
          }
        },
        err => {
          if (mounted.current === true && current === isCurrent.current)
            dispatch({ type: 'err', p: err });
        }
      );
    };
  }

  return { ...state, refetch: fetchData, fetchNextPage };
}
