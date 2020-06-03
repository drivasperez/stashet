export type OnUpdateCallback<T> = (v: T) => void;
export type OnInvalidatedCallback = () => void;
export type OnEvictionCallback = () => void;

export type SubscriberCallbacks<T> = {
  updated: OnUpdateCallback<T>;
  invalidated: OnInvalidatedCallback;
  evicted: OnEvictionCallback;
};

export type Subscription<T> = {
  unsubscribe: () => void;
  initialValue: T;
};

export interface Subscribable<T> {
  id: string;
  subscribe(
    updated: OnUpdateCallback<T>,
    invalidated: OnInvalidatedCallback,
    evicted: OnEvictionCallback
  ): Subscription<T>;
}

export interface Publishable<T> {
  id: string;
  updateValue(value: T): void;
}

export type CacheConfig = {
  msLongLoadAlert?: number | false;
  msMinimumLoad?: number | false;
  revalidateOnDocumentFocus?: boolean;
  ignoreCacheOnMount?: boolean;
  family?: string;
};

export type PaginatedCacheConfig<T> = CacheConfig & {
  nextPageURISelector: (data: T) => string | undefined;
  extendPreviousData: (newData: T, oldData: T) => T;
};
