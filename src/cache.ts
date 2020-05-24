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

  addResource(key: string, initialValue: any) {
    if (this._cache.has(key))
      throw new Error(`Resource with key already exists: ${key}`);

    this._cache.set(key, new Resource(key, initialValue));
    this._liveResources.set(key, 0);
  }

  getResource(key: string, onUpdate: (val: any) => void): any {
    const val = this._cache.get(key);
    const rc = this._liveResources.get(key);
    if (!val || rc == null)
      throw new Error(`No resource exists with key: ${key}`);

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

  dropResource(key: string) {
    const rc = this._liveResources.get(key);
    if (rc == null)
      throw new Error(`Attempted to drop resource that wasn't held: ${key}`);
  }
}
