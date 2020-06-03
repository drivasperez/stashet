import { Cache } from '../src/cache';

describe('Cache', () => {
  it('evicts resources after max age', () => {
    jest.useFakeTimers();
    const cache = new Cache('test', { msMaxResourceAge: 500 });

    cache._setResource('resource', 'VALUE');

    const onInvalidate = jest.fn();
    const onUpdate = jest.fn();
    const onEvicted = jest.fn();

    cache.getResource('resource', onInvalidate, onUpdate, onEvicted);

    jest.advanceTimersByTime(100);

    expect(onEvicted).not.toHaveBeenCalled();

    jest.advanceTimersByTime(450);

    expect(onEvicted).toHaveBeenCalledTimes(1);

    expect(() =>
      cache.getResource('resource', onInvalidate, onUpdate, onEvicted, true)
    ).toThrow();
  });
});
