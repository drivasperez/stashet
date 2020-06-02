import { Resource } from './resource';
import { OnUpdateFunction, OnInvalidatedFunction } from 'types';

/**
 * A basic cache. Holds values, and alerts subscribers to those
 * values when another subscriber has changed a value they are watching.
 *
 */
export class Cache {
  readonly id: string;
  private _cache: Map<string, Resource<any>> = new Map();

  /**
   * @param {string} id - Unique id for this cache
   */
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

  getResource(
    key: string,
    onUpdate: OnUpdateFunction<any>,
    onInvalidate: OnInvalidatedFunction
  ) {
    if (!this._cache.has(key)) {
      this._addResource(key, null);
    }

    const val = this._cache.get(key);
    if (!val) throw new Error(`${this.id}: Resource unaccountably absent`);

    const subscription = val.subscribe(onUpdate, onInvalidate);
    return subscription;
  }

  invalidateResource(key: string) {
    this._cache.get(key)?.invalidateValue();
  }

  mutateResource(key: string, value: any, invalidateResource: boolean = true) {
    if (invalidateResource && this._cache.has(key))
      this.invalidateResource(key);

    this._setResource(key, value);
  }
}
