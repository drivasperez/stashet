import {
  Subscribable,
  Publishable,
  OnUpdateCallback,
  OnInvalidatedCallback,
  SubscriberCallbacks,
  Subscription,
  OnEvictionCallback,
} from './types';

export class Resource<T> implements Subscribable<T>, Publishable<T> {
  private _currentValue: T;
  readonly id: string;
  private _latestSubscriber = 0;
  private _subscribers: Map<number, SubscriberCallbacks<T>> = new Map();

  constructor(id: string, initialValue: T) {
    this._currentValue = initialValue;
    this.id = id;
  }

  updateValue(value: T): void {
    this._currentValue = value;
    for (const subscriber of this._subscribers.values()) {
      subscriber.updated(this._currentValue);
    }
  }

  invalidateValue(): void {
    for (const subscriber of this._subscribers.values()) {
      subscriber.invalidated();
    }
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
