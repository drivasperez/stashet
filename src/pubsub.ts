import {
  Subscribable,
  Publishable,
  UpdateFunction,
  Subscription,
} from "./types";

export class Publisher<T> implements Subscribable<T>, Publishable<T> {
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

export class Derivation<T> implements Subscribable<T> {
  readonly id: string;
  private _latestSubscriber = 0;
  private _subscribers: Map<number, UpdateFunction<T>> = new Map();
  private _currentValue: T;
  private _subscriptions: (() => void)[] = [];
  private _subscribedValues: any[] = [];
  private _func: (...args: any) => T;
  constructor(
    id: string,
    publishers: Subscribable<any>[],
    func: (...args: any) => T
  ) {
    this.id = id;
    this._func = func;

    for (const [i, publisher] of publishers.entries()) {
      const subscription = publisher.subscribe((v) => {
        this._updateValue(i, v);
      });
      this._subscriptions.push(subscription.unsubscribe);
      this._subscribedValues.push(subscription.initialValue);
    }

    this._currentValue = this._func(...this._subscribedValues);
  }

  private _unsubscribe(id: number) {
    this._subscribers.delete(id);
  }

  private _updateValue(i: number, v: any) {
    this._subscribedValues[i] = v;
    this._currentValue = this._func(...this._subscribedValues);
    for (const update of this._subscribers.values()) {
      update(this._currentValue);
    }
  }

  subscribe(updated: UpdateFunction<T>) {
    this._subscribers.set(this._latestSubscriber, updated);
    const unsubscribe: Subscription<T> = {
      unsubscribe: () => this._unsubscribe(this._latestSubscriber),
      initialValue: this._currentValue,
    };
    this._latestSubscriber++;
    updated(this._currentValue);
    return unsubscribe;
  }
}
