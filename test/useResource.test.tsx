import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useResource } from '../src/useResource';
import { CacheContext } from '../src/cache-context';
import { Cache } from '../src/cache';

const wrapper = (cache?: Cache) => ({ children }: any) => (
  <CacheContext.Provider
    value={cache ?? new Cache('test', { msMaxResourceAge: false })}
  >
    {children}
  </CacheContext.Provider>
);

describe('useResource', () => {
  it('should load data', async () => {
    const data = {
      cool: 33,
      arr: [44, { hey: 'hi' }],
      boo: { hi: { boo: { hi: 'boo' } } },
    };
    jest.useFakeTimers();
    const func = jest.fn(
      () =>
        new Promise(res => {
          setTimeout(() => res(data), 2000);
        })
    );

    const { result, waitForNextUpdate } = renderHook(
      () => useResource('blah', func),
      { wrapper: wrapper() }
    );

    expect(func).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);

    await act(async () => {
      jest.runAllTimers();
      await waitForNextUpdate();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe(data);
  });

  it('should error out', async () => {
    jest.useFakeTimers();
    const func = jest.fn(
      () =>
        new Promise((_res, rej) => {
          setTimeout(() => rej('NOPE'), 2000);
        })
    );

    const { result, waitForNextUpdate } = renderHook(
      () => useResource('blah', func),
      { wrapper: wrapper() }
    );

    expect(func).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);

    await act(async () => {
      jest.runAllTimers();
      await waitForNextUpdate();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('NOPE');
  });

  it('should warn about long loads', async () => {
    jest.useFakeTimers();
    const func = jest.fn(
      () =>
        new Promise(res => {
          setTimeout(() => res('Data'), 2000);
        })
    );

    const { result, waitForNextUpdate } = renderHook(
      () => useResource('blah', func, { msLongLoadAlert: 500 }),
      { wrapper: wrapper() }
    );

    expect(func).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLongLoad).toBe(false);
    expect(result.current.data).toBe(null);

    await act(async () => {
      jest.advanceTimersByTime(700);
      // await waitForNextUpdate();
    });

    expect(result.current.isLongLoad).toBe(true);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.runAllTimers();
      await waitForNextUpdate();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLongLoad).toBe(false);
    expect(result.current.data).toBe('Data');
  });

  it('should not fetch if skip is true', () => {
    jest.useFakeTimers();
    const func = jest.fn(
      () =>
        new Promise(res => {
          setTimeout(() => res('Data'), 2000);
        })
    );

    const { result } = renderHook(
      () => useResource('blah', func, { msLongLoadAlert: 500 }, true),
      { wrapper: wrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.isUpdating).toBe(false);
  });

  it('should immediately render a cached value if one exists', () => {
    jest.useFakeTimers();
    const func = jest.fn(
      () =>
        new Promise(res => {
          setTimeout(() => res('Data'), 2000);
        })
    );

    const cache = new Cache('test-cached');
    cache._setResource('blah', 'EXISTING DATA');

    const { result } = renderHook(
      () => useResource('blah', func, { msLongLoadAlert: 500 }),
      { wrapper: wrapper(cache) }
    );

    expect(result.current.data).toBe('EXISTING DATA');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isUpdating).toBe(true);
  });

  it('should warn about long updates', async () => {
    jest.useFakeTimers();
    const func = jest.fn(
      () =>
        new Promise(res => {
          setTimeout(() => res('Data'), 2000);
        })
    );

    const cache = new Cache('longUpdates');
    cache._setResource('blah', 'EXISTING DATA');

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useResource('blah', func, {
          msLongLoadAlert: 500,
        }),
      { wrapper: wrapper(cache) }
    );

    expect(func).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isUpdating).toBe(true);
    expect(result.current.isLongLoad).toBe(false);
    expect(result.current.isLongUpdate).toBe(false);
    expect(result.current.data).toBe('EXISTING DATA');

    await act(async () => {
      jest.advanceTimersByTime(700);
      // await waitForNextUpdate();
    });

    expect(result.current.isLongLoad).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLongUpdate).toBe(true);
    expect(result.current.isUpdating).toBe(true);

    await act(async () => {
      jest.runAllTimers();
      await waitForNextUpdate();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLongLoad).toBe(false);
    expect(result.current.isLongUpdate).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.data).toBe('Data');
  });

  it.todo('should refetch after invalidation');

  it.todo('should show updating when another subscriber is updating');

  it.todo('should revalidate on window focus');

  it.todo('should invalidate and refetch after a given cache age');

  it.todo('should provide a nextPage callback for paged resources');

  it.todo('should support refetching an entire paged list on invalidation');
});
