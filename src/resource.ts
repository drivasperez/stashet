import {
  Subscribable,
  Publishable,
  OnUpdateCallback,
  OnInvalidatedCallback,
  SubscriberCallbacks,
  Subscription,
  OnEvictionCallback,
  Timeout,
} from './types';

export class Resource<T> implements Subscribable<T>, Publishable<T> {
  _currentValue: T;
  readonly id: string;
  private _latestSubscriber = 0;
  private _subscribers: Map<number, SubscriberCallbacks<T>> = new Map();
  evictionTimeout: Timeout | null = null;

  constructor(id: string, initialValue: T) {
    this._currentValue = initialValue;
    this.id = id;
  }

  setEvictionTimeout(timeout: Timeout | null) {
    this.evictionTimeout = timeout;
  }

  updateValue(value: T): void {
    this._currentValue = value;
    Array.from(this._subscribers.values()).forEach(subscriber => {
      subscriber.updated(this._currentValue);
    });
  }

  invalidateValue(): void {
    Array.from(this._subscribers.values()).forEach(subscriber => {
      subscriber.invalidated();
    });
  }

  announceEviction(): void {
    Array.from(this._subscribers.values()).forEach(subscriber => {
      subscriber.evicted();
    });
  }

  subscribe(
    updated: OnUpdateCallback<T>,
    invalidated: OnInvalidatedCallback,
    evicted: OnEvictionCallback
  ): Subscription<T> {
    this._subscribers.set(this._latestSubscriber, {
      updated,
      invalidated,
      evicted,
    });
    const subscription: Subscription<T> = {
      unsubscribe: () => this._unsubscribe(this._latestSubscriber),
      initialValue: this._currentValue,
    };
    this._latestSubscriber++;
    return subscription;
  }

  private _unsubscribe(id: number) {
    this._subscribers.delete(id);
  }
}
