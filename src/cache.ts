import { Subscribable, Publishable } from './types';
import { Publisher } from './pubsub';

interface ValueStore<T> extends Subscribable<T>, Publishable<T> {}

class Resource<T> extends Publisher<T> {}

export class Cache {
  readonly id: string;
  private _cache: Map<string, ValueStore<any>> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  _addResource(key: string, initialValue: any) {
    if (this._cache.has(key))
      throw new Error(`Resource with key already exists: ${key}`);

    this._cache.set(key, new Resource(key, initialValue));
  }

  _setResource(key: string, value: any) {
    const resource = this._cache.get(key);
    if (!resource) {
      this._addResource(key, value);
    } else {
      resource.updateValue(value);
    }
  }

  getResource(key: string, onUpdate: (val: any) => void) {
    if (!this._cache.has(key)) {
      this._addResource(key, null);
    }

    const val = this._cache.get(key);
    if (!val) throw new Error('Resource unaccountably absent');

    const subscription = val.subscribe(onUpdate);
    return subscription;
  }

  invalidateResource(key: string) {
    throw new Error('TODO');
  }
}
