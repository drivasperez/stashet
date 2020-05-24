export type UpdateFunction<T> = (v: T) => void;
export type Subscription<T> = {
  unsubscribe: () => void;
  initialValue: T;
};

export interface Subscribable<T> {
  id: string;
  subscribe(update: UpdateFunction<T>): Subscription<T>;
}

export interface Publishable<T> {
  id: string;
  updateValue(value: T): void;
}

export type Config = {
  msLongLoadAlert?: number | false;
  msMinimumLoad?: number | false;
  ignoreCacheOnMount?: boolean;
  family?: string;
};
