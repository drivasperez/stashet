import { Subscribable, Publishable } from './types';
import { Publisher } from './pubsub';

interface ValueStore<T> extends Subscribable<T>, Publishable<T> {}

class Resource<T> extends Publisher<T> {}

export class Cache {
  readonly id: string;
  private _cache: Map<string, ValueStore<any>> = new Map();
  private _liveResources: Map<string, number> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  _addResource(key: string, initialValue: any) {
    if (this._cache.has(key))
      throw new Error(`Resource with key already exists: ${key}`);

    this._cache.set(key, new Resource(key, initialValue));
    this._liveResources.set(key, 0);
  }

  getResource(key: string, onUpdate: (val: any) => void) {
    if (!this._cache.has(key)) {
      this._addResource(key, null);
    }

    const val = this._cache.get(key);
    if (!val) throw new Error('Resource unaccountably absent');

    const rc = this._liveResources.get(key) ?? 0;

    this._liveResources.set(key, rc + 1);
    const subscription = val.subscribe(onUpdate);
    return {
      ...subscription,
      unsubscribe: () => {
        this.dropResource(key);
        subscription.unsubscribe();
      },
    };
  }

  setResource(key: string, value: any) {
    const resource = this._cache.get(key);
    if (!resource) {
      this._addResource(key, value);
    } else {
      resource.updateValue(value);
    }
  }

  dropResource(key: string) {
    const rc = this._liveResources.get(key);
    if (!rc)
      throw new Error(`Attempted to drop resource that wasn't held: ${key}`);

    this._liveResources.set(key, rc - 1);
  }
}
