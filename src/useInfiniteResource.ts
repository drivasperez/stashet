import { useCreateResource } from './useCreateResource';
import { UseInfiniteResourceConfig } from './types';

export function useInfiniteResource<T>(
  key: string,
  asyncFunc: (prevData: T | null) => Promise<T>,
  config: UseInfiniteResourceConfig<T>,
  skip?: boolean
) {
  const { msLongLoadAlert = false, revalidateOnDocumentFocus = true } = config;
  const resource = useCreateResource(
    key,
    asyncFunc,
    { ...config, msLongLoadAlert, revalidateOnDocumentFocus },
    skip
  );

  let fetchNextPage = null;

  if (
    resource.state.data &&
    config.nextPageURISelector &&
    config.nextPageURISelector(resource.state.data)
  ) {
    fetchNextPage = () => {
      resource.isCurrent.current += 1;
      const current = resource.isCurrent.current;
      resource.dispatch({ type: 'began_load' });
      asyncFunc(resource.prevData.current).then(
        data => {
          if (
            resource.mounted.current === true &&
            current === resource.isCurrent.current
          ) {
            const newData =
              resource.prevData.current && data && config.extendPreviousData
                ? config.extendPreviousData(data, resource.prevData.current)
                : data;
            resource.prevData.current = newData;
            resource.dispatch({ type: 'fetched_data', payload: data });
            resource.cache._setResource(key, data);
          }
        },
        err => {
          if (
            resource.mounted.current === true &&
            current === resource.isCurrent.current
          )
            resource.dispatch({ type: 'fetch_error', payload: err });
        }
      );
    };
  }

  return { ...resource.state, refetch: resource.refetch, fetchNextPage };
}
