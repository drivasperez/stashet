export type OnUpdateFunction<T> = (v: T) => void;
export type OnInvalidatedFunction = () => void;
export type Subscription<T> = {
  unsubscribe: () => void;
  initialValue: T;
};

export interface Subscribable<T> {
  id: string;
  subscribe(
    updated: OnUpdateFunction<T>,
    invalidated: OnInvalidatedFunction
  ): Subscription<T>;
}

export interface Publishable<T> {
  id: string;
  updateValue(value: T): void;
}

export type CacheConfig = {
  msLongLoadAlert?: number | false;
  msMinimumLoad?: number | false;
  ignoreCacheOnMount?: boolean;
  family?: string;
};
