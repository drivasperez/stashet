import warning from 'tiny-warning';
import { Resource } from './resource';
import {
  OnUpdateCallback,
  OnInvalidatedCallback,
  OnEvictionCallback,
  CacheConfig,
} from 'types';

const DEFAULT_MAX_RESOURCE_AGE = 240_000;

/**
 * A basic cache. Holds values, and alerts subscribers to those
 * values when another subscriber has changed a value they are watching.
 *
 */
export class Cache {
  readonly id: string;
  private readonly _cache: Map<string, Resource<any>> = new Map();
  private readonly _msMaxResourceAge: number | false;

  /**
   * @param {string} id - Unique id for this cache
   */
  constructor(id: string, config: CacheConfig = {}) {
    const { msMaxResourceAge = DEFAULT_MAX_RESOURCE_AGE } = config;
    this.id = id;
    this._msMaxResourceAge = msMaxResourceAge;
  }

  _startEvictionTimer(key: string) {
    if (this._msMaxResourceAge === false) return;
    const resource = this._cache.get(key);
    if (resource !== undefined) {
      if (resource.evictionTimeout !== null)
        clearTimeout(resource.evictionTimeout);
      const timeout = setTimeout(
        () => this.evictResource(key),
        this._msMaxResourceAge
      );
      resource.setEvictionTimeout(timeout);
    }
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
    this._startEvictionTimer(key);
  }

  getResource(
    key: string,
    onUpdate: OnUpdateCallback<any>,
    onInvalidate: OnInvalidatedCallback,
    onEvicted: OnEvictionCallback,
    throwIfNotPresent = false
  ) {
    if (!this._cache.has(key)) {
      if (throwIfNotPresent)
        throw new Error(
          `${this.id}: Attempted to access non-existent resource: ${key}`
        );
      this._addResource(key, null);
    }

    const val = this._cache.get(key);
    if (!val) throw new Error(`${this.id}: Resource unaccountably absent`);

    const subscription = val.subscribe(onUpdate, onInvalidate, onEvicted);
    this._startEvictionTimer(key);
    return subscription;
  }

  invalidateResource(key: string | string[]) {
    if (Array.isArray(key)) {
      for (const k in key) {
        const res = this._cache.get(k);
        warning(
          res !== undefined,
          `Tried to invalidate non-existent resource: ${k}`
        );
        if (res) res.invalidateValue();
      }
    } else {
      const res = this._cache.get(key);
      warning(
        res !== undefined,
        `Tried to invalidate non-existent resource: ${key}`
      );
      if (res) res.invalidateValue();
    }
  }

  evictResource(key: string | string[]) {
    if (Array.isArray(key)) {
      for (const k in key) {
        const res = this._cache.get(k);
        warning(
          res !== undefined,
          `Tried to evict non-existent resource: ${k}`
        );
        if (res) {
          res.announceEviction();
          this._cache.delete(k);
        }
      }
    } else {
      const res = this._cache.get(key);
      warning(
        res !== undefined,
        `Tried to evict non-existent resource: ${key}`
      );
      if (res) {
        res.announceEviction();
        this._cache.delete(key);
      }
    }
  }

  mutateResource<T = any>(
    key: string,
    updateValue: (prev: null | T) => T,
    invalidateResource: boolean = true
  ) {
    const prev = this._cache.get(key)?._currentValue ?? null;
    this._setResource(key, updateValue(prev));

    if (invalidateResource && this._cache.has(key))
      this.invalidateResource(key);
  }
}
