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
  msMaxResourceAge?: number | false;
};

export type UseResourceConfig = {
  msLongLoadAlert?: number | false;
  msMinimumLoad?: number | false;
  revalidateOnDocumentFocus?: boolean;
  ignoreCacheOnMount?: boolean;
  family?: string;
};

export type UseInfiniteResourceConfig<
  T,
  P extends Array<any>
> = UseResourceConfig & {
  nextPageParams: (data: T) => P;
  extendPreviousData: (newData: T, oldData: T) => T | Promise<T>;
  updateLoadedData: (currentData: T) => Promise<T>;
};

export type Timeout = ReturnType<typeof setTimeout>;
