import {
  Subscribable,
  Publishable,
  UpdateFunction,
  Subscription,
} from './types';

export class Resource<T> implements Subscribable<T>, Publishable<T> {
  private _currentValue: T;
  readonly id: string;
  private _latestSubscriber = 0;
  private _subscribers: Map<number, UpdateFunction<T>> = new Map();

  constructor(id: string, initialValue: T) {
    this._currentValue = initialValue;
    this.id = id;
  }

  updateValue(value: T): void {
    this._currentValue = value;
    for (const subscriber of this._subscribers.values()) {
      subscriber(this._currentValue);
    }
  }

  subscribe(updated: UpdateFunction<T>): Subscription<T> {
    this._subscribers.set(this._latestSubscriber, updated);
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
